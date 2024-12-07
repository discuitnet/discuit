package core

import (
	"context"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"slices"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/SherClockHolmes/webpush-go"
	msql "github.com/discuitnet/discuit/internal/sql"
	"github.com/discuitnet/discuit/internal/uid"
)

var (
	pushMutex         sync.RWMutex // guards the following
	pushNotifsEnabled = false
	webmasterEmail    = ""
	vapidKeys         = &VAPIDKeys{}
)

// EnablePushNotifications enables sending web push notifications. The email
// address is the email of the webmaster.
func EnablePushNotifications(keys *VAPIDKeys, email string) {
	pushMutex.Lock()
	defer pushMutex.Unlock()

	pushNotifsEnabled = true
	vapidKeys = keys
	webmasterEmail = email
}

const MaxNotificationsPerUser = 200

type NotificationType string

const (
	NotificationTypeNewComment   = NotificationType("new_comment")
	NotificationTypeCommentReply = NotificationType("comment_reply")
	NotificationTypeUpvote       = NotificationType("new_votes") // TODO: change string
	NotificationTypeDeletePost   = NotificationType("deleted_post")
	NotificationTypeModAdd       = NotificationType("mod_add")
	NotificationTypeNewBadge     = NotificationType("new_badge")
	NotificationTypeWelcome      = NotificationType("welcome")
)

func (t NotificationType) Valid() bool {
	return slices.Contains([]NotificationType{
		NotificationTypeNewComment,
		NotificationTypeCommentReply,
		NotificationTypeUpvote,
		NotificationTypeDeletePost,
		NotificationTypeModAdd,
		NotificationTypeNewBadge,
		NotificationTypeWelcome,
	}, t)
}

type notification interface {
	marshalJSONForAPI(context.Context, *sql.DB) ([]byte, error)
}

// Notification is a user's notification.
type Notification struct {
	db *sql.DB

	ID     int              `json:"id"`
	UserID uid.ID           `json:"-"`
	Type   NotificationType `json:"type"`

	// Information specific to notification type.
	Notif        notification `json:"notif"`
	notifRawJSON []byte

	Seen      bool          `json:"seen"`
	SeenAt    msql.NullTime `json:"seenAt"`
	CreatedAt time.Time     `json:"createdAt"`

	updatedAt time.Time // `json:"updatedAt"` // Could be equal to CreatedAt.
}

func (n *Notification) MarshalJSON() ([]byte, error) {
	type N Notification
	x := struct {
		*N
		Notif map[string]interface{} `json:"notif"`
	}{N: (*N)(n)}

	data, err := n.Notif.marshalJSONForAPI(context.TODO(), n.db)
	if err != nil {
		return nil, fmt.Errorf("marshalJSONForAPI (notifId: %v): %w", n.ID, err)
	}

	if err = json.Unmarshal(data, &x.Notif); err != nil {
		return nil, err
	}

	return json.Marshal(x)
}

var selectNotificationCols = []string{
	"notifications.id",
	"notifications.user_id",
	"notifications.type",
	"notifications.notif",
	"notifications.seen",
	"notifications.seen_at",
	"notifications.created_at",
	"notifications.updated_at",
}

func scanNotifications(db *sql.DB, rows *sql.Rows) ([]*Notification, error) {
	defer rows.Close()
	var notifs []*Notification
	for rows.Next() {
		n := &Notification{db: db}
		err := rows.Scan(
			&n.ID,
			&n.UserID,
			&n.Type,
			&n.notifRawJSON,
			&n.Seen,
			&n.SeenAt,
			&n.CreatedAt,
			&n.updatedAt)
		if err != nil {
			return nil, err
		}
		notifs = append(notifs, n)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(notifs) == 0 {
		return nil, sql.ErrNoRows
	}

	for _, notif := range notifs {
		switch notif.Type {
		case NotificationTypeNewComment:
			nc := &NotificationNewComment{}
			if err := json.Unmarshal(notif.notifRawJSON, nc); err != nil {
				return nil, err
			}
			notif.Notif = nc
		case NotificationTypeCommentReply:
			nc := &NotificationCommentReply{}
			if err := json.Unmarshal(notif.notifRawJSON, nc); err != nil {
				return nil, err
			}
			notif.Notif = nc
		case NotificationTypeUpvote:
			nc := &NotificationNewVotes{}
			if err := json.Unmarshal(notif.notifRawJSON, nc); err != nil {
				return nil, err
			}
			notif.Notif = nc
		case NotificationTypeDeletePost:
			nc := &NotificationPostDeleted{}
			if err := json.Unmarshal(notif.notifRawJSON, nc); err != nil {
				return nil, err
			}
			notif.Notif = nc
		case NotificationTypeModAdd:
			nc := &NotificationModAdd{}
			if err := json.Unmarshal(notif.notifRawJSON, nc); err != nil {
				return nil, err
			}
			notif.Notif = nc
		case NotificationTypeNewBadge:
			nc := &NotificationNewBadge{}
			if err := json.Unmarshal(notif.notifRawJSON, nc); err != nil {
				return nil, err
			}
			notif.Notif = nc
		case NotificationTypeWelcome:
			nc := &NotificationWelcome{}
			if err := json.Unmarshal(notif.notifRawJSON, nc); err != nil {
				return nil, err
			}
			notif.Notif = nc
		default:
			return nil, fmt.Errorf("unknown notification type: %s", string(notif.Type))
		}
	}

	return notifs, nil
}

// removeExcessNotifications keeps only the latest MaxNotificationsPerUser
// notifications of user. The number of notifications removed is returned.
func removeExcessNotifications(ctx context.Context, db *sql.DB, user uid.ID) (n int, err error) {
	rows, err := db.QueryContext(ctx, "SELECT id FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT ?,10000000", user, MaxNotificationsPerUser)
	if err != nil {
		return
	}
	defer rows.Close()

	var ids []any
	for rows.Next() {
		id := 0
		if err = rows.Scan(&id); err != nil {
			return
		}
		ids = append(ids, id)
	}

	if err = rows.Err(); err != nil {
		return
	}

	if len(ids) > 0 {
		_, err = db.ExecContext(ctx, "DELETE FROM notifications WHERE id IN "+msql.InClauseQuestionMarks(len(ids)), ids...)
	}
	n = len(ids)
	return
}

// CreateNotification adds a new notification to user's notifications stack.
func CreateNotification(ctx context.Context, db *sql.DB, user uid.ID, Type NotificationType, notif notification) error {
	if is, err := UserDeleted(db, user); err != nil {
		return err
	} else if is {
		// Exit silently if the user is deleted.
		return nil
	}

	data, err := json.Marshal(notif)
	if err != nil {
		return err
	}

	res, err := db.ExecContext(ctx, "INSERT INTO notifications (user_id, type, notif) VALUES (?, ?, ?)", user, Type, data)
	if err != nil {
		return err
	}

	lastID, err := res.LastInsertId()
	if err != nil {
		return err
	}

	if _, err := removeExcessNotifications(ctx, db, user); err != nil { // attempt
		log.Println("Failed removing excess notifications: ", err)
	}
	if err := updateNewNotificationsCount(ctx, db, user); err != nil { // attempt
		log.Println("Failed incrementing users.notifications_new_count: ", err)
	}

	sendPushNotif := func() {
		notif, err := GetNotification(ctx, db, strconv.Itoa(int(lastID)))
		if err != nil {
			log.Println("Error getting notification (CreateNotification)", err)
			return
		}
		notif.SendPushNotification(ctx)
	}

	sendPushNotif()
	return err
}

func GetNotification(ctx context.Context, db *sql.DB, ID string) (*Notification, error) {
	query := msql.BuildSelectQuery("notifications", selectNotificationCols, nil, "WHERE id = ?")
	rows, err := db.QueryContext(ctx, query, ID)
	if err != nil {
		return nil, err
	}

	notifs, err := scanNotifications(db, rows)
	if err != nil {
		return nil, err
	}
	return notifs[0], nil
}

type notificationsPaginationCursor struct {
	LastSeen      bool       `json:"s"`
	LastUpdatedAt *time.Time `json:"u"`
}

func (n notificationsPaginationCursor) encode() string {
	b, _ := json.Marshal(n)
	return base64.URLEncoding.EncodeToString(b)
}

func (n *notificationsPaginationCursor) decode(s string) error {
	bytes, err := base64.URLEncoding.DecodeString(s)
	if err != nil {
		return err
	}
	return json.Unmarshal(bytes, n)
}

// GetNotifications returns notifications of user. If limit is 0, all
// notifications are returned. The string returned is the pagination cursor of
// the next fetch.
func GetNotifications(ctx context.Context, db *sql.DB, user uid.ID, limit int, cursor string) ([]*Notification, string, error) {
	var args []interface{}
	args = append(args, user)
	where := "WHERE user_id = ?"
	if cursor != "" {
		o := notificationsPaginationCursor{}
		if err := o.decode(cursor); err != nil {
			return nil, "", err
		}
		where += " AND seen >= ? AND updated_at <= ?"
		args = append(args, o.LastSeen, o.LastUpdatedAt)
	}
	where += " ORDER BY seen ASC, updated_at DESC"
	if limit > 0 {
		where += " LIMIT ?"
		args = append(args, limit+1)
	}

	query := msql.BuildSelectQuery("notifications", selectNotificationCols, nil, where)
	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, "", err
	}

	notifs, err := scanNotifications(db, rows)
	if err == sql.ErrNoRows {
		return nil, "", nil
	}

	if len(notifs) == limit+1 {
		o := notificationsPaginationCursor{
			LastSeen:      notifs[limit].Seen,
			LastUpdatedAt: &notifs[limit].updatedAt,
		}
		return notifs[:limit], o.encode(), err
	}
	return notifs, "", err
}

// NotificationsCount returns the number of notifications of user.
func NotificationsCount(ctx context.Context, db *sql.DB, user uid.ID) (n int, err error) {
	err = db.QueryRowContext(ctx, "SELECT COUNT(*) FROM notifications WHERE user_id = ?", user).Scan(&n)
	return
}

// Saw marks the notification as seen. If seen is false the notification is
// markend as unseen.
func (n *Notification) Saw(ctx context.Context, seen bool) error {
	var t *time.Time
	if seen {
		now := time.Now()
		t = &now
	}

	if _, err := n.db.ExecContext(ctx, "UPDATE notifications SET seen = ?, seen_at = ? WHERE id = ?", seen, t, n.ID); err != nil {
		return err
	}

	n.Seen = seen
	n.SeenAt = msql.NewNullTime(t)
	return nil
}

func (n *Notification) Delete(ctx context.Context) error {
	_, err := n.db.ExecContext(ctx, "DELETE FROM notifications WHERE id = ?", n.ID)
	return err
}

// Update updates a notification.
func (n *Notification) Update(ctx context.Context) error {
	var err error
	n.notifRawJSON, err = json.Marshal(n.Notif)
	if err != nil {
		return err
	}

	if _, err := n.db.ExecContext(ctx, "UPDATE notifications SET notif = ?, updated_at = ? WHERE id = ?", n.notifRawJSON, time.Now(), n.ID); err != nil {
		return err
	}

	if err := updateNewNotificationsCount(ctx, n.db, n.UserID); err != nil {
		log.Println("Failed incrementing users.notifications_new_count: ", err)
	}

	n.SendPushNotification(ctx)
	return nil
}

// SendPushNotification sends the notification to all matching sessions. Call
// EnablePushNotifications before any calls to this method.
func (n *Notification) SendPushNotification(ctx context.Context) error {
	if n.Type == NotificationTypeUpvote { // no push notifications for upvotes, for the moment
		return nil
	}

	topic := strconv.Itoa(n.ID)
	copy := *n // shallow copy of n
	copy.Notif = nil

	data, err := json.Marshal(copy)
	if err != nil {
		return err
	}

	pushMutex.RLock()
	enabled := pushNotifsEnabled
	email := webmasterEmail
	keys := *vapidKeys
	pushMutex.RUnlock()

	if !enabled {
		return nil
	}

	return SendPushNotification(ctx, n.db, n.UserID, data, &webpush.Options{
		Subscriber:      email,
		VAPIDPublicKey:  keys.Public,
		VAPIDPrivateKey: keys.Private,
		TTL:             30,
		Topic:           topic, // For collapsing comments
	})
}

func (n *Notification) ResetUserNewNotificationsCount(ctx context.Context) error {
	return updateNewNotificationsCount(ctx, n.db, n.UserID)
}

// NotificationNewComment is for when a comment is added to a post. It is sent to the
// post's author.
type NotificationNewComment struct {
	PostID    uid.ID `json:"postId"`
	CommentID uid.ID `json:"commentId"`

	// If NumComments > 1, many new comments have been added to post and
	// CommentID and CommentAuthor is that of the first one.
	NumComments int `json:"noComments"`

	// If NumComments > 1, the first user that commented.
	CommentAuthor string `json:"commentAuthor"`

	// First time this notification was created. Needed to identify the new
	// comments that this notification refers to (all the comments after this
	// time and before comment seen time)
	FirstCreatedAt time.Time `json:"firstCreatedAt"`
}

func (n NotificationNewComment) marshalJSONForAPI(ctx context.Context, db *sql.DB) ([]byte, error) {
	type T NotificationNewComment
	out := struct {
		T
		Post *Post `json:"post"`
	}{
		T: (T)(n),
	}

	var err error
	post, err := GetPost(ctx, db, &n.PostID, "", nil, true)
	if err != nil {
		return nil, err
	}
	out.Post = post
	return json.Marshal(out)
}

// CreateNewCommentNotification creates a notification of type new_comment. If
// an identical notification exists in the last 10 items, it is deleted.
func CreateNewCommentNotification(ctx context.Context, db *sql.DB, post *Post, comment uid.ID, author *User) error {
	user, err := GetUser(ctx, db, post.AuthorID, nil)
	if err != nil {
		return err
	}
	if user.ReplyNotificationsOff {
		return nil
	}

	if muted, err := user.Muted(ctx, db, author.ID); err != nil {
		return err
	} else if muted {
		return nil
	}

	// Select last 10 notifications to see if an identical notification exists.
	notifs, _, err := GetNotifications(ctx, db, post.AuthorID, 10, "")
	if err != nil {
		return err
	}
	for _, notif := range notifs {
		if notif.Type == NotificationTypeNewComment {
			nc := notif.Notif.(*NotificationNewComment)
			if nc.PostID.EqualsTo(post.ID) && !notif.Seen { // identical found
				nc.NumComments++
				return notif.Update(ctx)
			}
		}
	}

	n := NotificationNewComment{
		PostID:         post.ID,
		CommentID:      comment,
		NumComments:    1,
		CommentAuthor:  author.Username,
		FirstCreatedAt: time.Now(),
	}
	return CreateNotification(ctx, db, post.AuthorID, NotificationTypeNewComment, n)
}

// NotificationCommentReply is for when a comment receives a reply. It is sent to the
// parent comment's author.
type NotificationCommentReply struct {
	PostID          uid.ID `json:"postId"`
	ParentCommentID uid.ID `json:"parentCommentId"`
	CommentID       uid.ID `json:"commentId"`

	// If NumComments > 1, the first user that commented.
	CommentAuthor string `json:"commentAuthor"`

	// If NumComments > 1, many new comments have been added to post and
	// CommentID and CommentAuthor is that of the latest one.
	NumComments int `json:"noComments"`

	// First time this notification was created. Needed to identify the new
	// comments that this notification refers to (all the comments after this
	// time and before comment seen time)
	FirstCreatedAt time.Time `json:"firstCreatedAt"`
}

func (n NotificationCommentReply) marshalJSONForAPI(ctx context.Context, db *sql.DB) ([]byte, error) {
	type T NotificationCommentReply
	out := struct {
		T
		Post *Post `json:"post"`
	}{
		T: (T)(n),
	}

	var err error
	post, err := GetPost(ctx, db, &n.PostID, "", nil, true)
	if err != nil {
		return nil, err
	}
	out.Post = post
	return json.Marshal(out)
}

// CreateCommentReplyNotification creates a notification of type comment_reply.
// If an identical notification exists in the last 10 items, it is deleted.
func CreateCommentReplyNotification(ctx context.Context, db *sql.DB, receiver uid.ID, parent, comment uid.ID, author *User, post *Post) error {
	user, err := GetUser(ctx, db, receiver, nil)
	if err != nil {
		return err
	}
	if user.ReplyNotificationsOff {
		return nil
	}

	if muted, err := user.Muted(ctx, db, author.ID); err != nil {
		return err
	} else if muted {
		return nil
	}

	// Select last 10 notifications to see if an identical notification exists.
	notifs, _, err := GetNotifications(ctx, db, receiver, 10, "")
	if err != nil {
		return err
	}
	for _, notif := range notifs {
		if notif.Type == "comment_reply" {
			rc := notif.Notif.(*NotificationCommentReply)
			if rc.ParentCommentID.EqualsTo(parent) && !notif.Seen {
				rc.NumComments++
				return notif.Update(ctx)
			}
		}
	}

	n := NotificationCommentReply{
		PostID:          post.ID,
		ParentCommentID: parent,
		CommentID:       comment,
		CommentAuthor:   author.Username,
		NumComments:     1,
		FirstCreatedAt:  time.Now(),
	}
	return CreateNotification(ctx, db, receiver, NotificationTypeCommentReply, n)
}

func updateNewNotificationsCount(ctx context.Context, db *sql.DB, user uid.ID) error {
	_, err := db.ExecContext(ctx, "UPDATE users SET notifications_new_count = (SELECT COUNT(*) FROM notifications WHERE user_id = ? AND seen = FALSE) WHERE id = ?", user, user)
	return err
}

func resetNewNotificationsCount(ctx context.Context, db *sql.DB, user uid.ID) error {
	_, err := db.ExecContext(ctx, "UPDATE users SET notifications_new_count = 0 WHERE id = ?", user)
	return err
}

// markAllNotificationsAsSeen marks all notifications of user as seen if t is
// zero, or only notifications of type t, if t is not zero.
func markAllNotificationsAsSeen(ctx context.Context, db *sql.DB, user uid.ID, t NotificationType) error {
	query := "UPDATE notifications SET seen = TRUE, seen_at = ? WHERE user_id = ? "
	var args []any
	args = append(args, time.Now(), user)

	if t != "" {
		query += "and type = ?"
		args = append(args, t)
	}
	_, err := db.ExecContext(ctx, query, args...)
	return err
}

func deleteAllNotifications(ctx context.Context, db *sql.DB, user uid.ID) error {
	_, err := db.ExecContext(ctx, "DELETE FROM notifications WHERE user_id = ?", user)
	return err
}

// NotificationNewVotes is sent when a user votes on a post or a comment.
type NotificationNewVotes struct {
	TargetType string `json:"targetType"` // post or comment
	TargetID   uid.ID `json:"targetId"`
	NoVotes    int    `json:"noVotes"`
}

func (n NotificationNewVotes) marshalJSONForAPI(ctx context.Context, db *sql.DB) ([]byte, error) {
	type T NotificationNewVotes
	out := struct {
		T
		Post    *Post    `json:"post,omitempty"`
		Comment *Comment `json:"comment,omitempty"`
	}{
		T: (T)(n),
	}

	if n.TargetType == "post" {
		post, err := GetPost(ctx, db, &n.TargetID, "", nil, true)
		if err != nil {
			return nil, err
		}
		out.Post = post
	} else {
		comment, err := GetComment(ctx, db, n.TargetID, nil)
		if err != nil {
			return nil, err
		}
		out.Comment = comment

		post, err := GetPost(ctx, db, &comment.PostID, "", nil, true)
		if err != nil {
			return nil, err
		}
		out.Post = post
	}
	return json.Marshal(out)
}

// CreateNewVotesNotification creates a notification of type "new_votes".
func CreateNewVotesNotification(ctx context.Context, db *sql.DB, user uid.ID, community string, isPost bool, targetID uid.ID) error {
	if user, err := GetUser(ctx, db, user, nil); err != nil {
		return err
	} else if user.UpvoteNotificationsOff {
		return nil
	}

	targetType := "post"
	if !isPost {
		targetType = "comment"
	}

	// Select last 10 notifications to see if an identical notification exists.
	notifs, _, err := GetNotifications(ctx, db, user, 10, "")
	if err != nil {
		return err
	}
	for _, notif := range notifs {
		if notif.Type == "new_votes" {
			rc := notif.Notif.(*NotificationNewVotes)
			if !notif.Seen && rc.TargetType == targetType && rc.TargetID.EqualsTo(targetID) { // identical found
				rc.NoVotes++
				return notif.Update(ctx)
			}
		}
	}

	n := NotificationNewVotes{
		TargetType: targetType,
		TargetID:   targetID,
		NoVotes:    1,
	}
	return CreateNotification(ctx, db, user, NotificationTypeUpvote, n)
}

// NotificationPostDeleted is sent when a mod or an admin removes a post or a comment.
type NotificationPostDeleted struct {
	TargetType string    `json:"targetType"` // post or comment
	TargetID   uid.ID    `json:"targetId"`
	DeletedAs  UserGroup `json:"deletedAs"`
}

func (n NotificationPostDeleted) marshalJSONForAPI(ctx context.Context, db *sql.DB) ([]byte, error) {
	type T NotificationPostDeleted
	out := struct {
		T
		Post    *Post    `json:"post,omitempty"`
		Comment *Comment `json:"comment,omitempty"`
	}{
		T: (T)(n),
	}

	if n.TargetType == "post" {
		post, err := GetPost(ctx, db, &n.TargetID, "", nil, true)
		if err != nil {
			return nil, err
		}
		out.Post = post
	} else {
		comment, err := GetComment(ctx, db, n.TargetID, nil)
		if err != nil {
			return nil, err
		}
		out.Comment = comment
	}
	return json.Marshal(out)
}

// CreatePostDeletedNotification creates a notification of type "deleted_post".
// In actuall fact it may be a post or a comment.
func CreatePostDeletedNotification(ctx context.Context, db *sql.DB, user uid.ID, deletedAs UserGroup, isPost bool, targetID uid.ID) error {
	targetType := "post"
	if !isPost {
		targetType = "comment"
	}

	n := NotificationPostDeleted{
		TargetType: targetType,
		TargetID:   targetID,
		DeletedAs:  deletedAs,
	}
	return CreateNotification(ctx, db, user, NotificationTypeDeletePost, n)
}

// NotificationModAdd is sent when someone is added as a mod to a community.
type NotificationModAdd struct {
	CommunityName string `json:"communityName"`
	AddedBy       string `json:"addedBy"`
}

func (n NotificationModAdd) marshalJSONForAPI(ctx context.Context, db *sql.DB) ([]byte, error) {
	type T NotificationModAdd
	out := struct {
		T
		Community *Community `json:"community"`
	}{
		T: (T)(n),
	}

	c, err := GetCommunityByName(ctx, db, n.CommunityName, nil)
	if err != nil {
		return nil, err
	}
	out.Community = c
	return json.Marshal(out)
}

func CreateNewModAddNotification(ctx context.Context, db *sql.DB, user uid.ID, community, addedBy string) error {
	n := NotificationModAdd{
		CommunityName: community,
		AddedBy:       addedBy,
	}
	return CreateNotification(ctx, db, user, NotificationTypeModAdd, n)
}

// VAPIDKeys is an application server key-pair used by the Web Push API.
type VAPIDKeys struct {
	Public  string `json:"public"`
	Private string `json:"private"`
}

const vapidKeysDBKey = "vapid_keys" // for the key column of the application_data table

func saveVAPIDKeys(ctx context.Context, db *sql.DB) (*VAPIDKeys, error) {
	private, public, err := webpush.GenerateVAPIDKeys()
	if err != nil {
		return nil, err
	}

	pair := &VAPIDKeys{
		Public:  public,
		Private: private,
	}
	data, err := json.Marshal(pair)
	if err != nil {
		return nil, err
	}

	if _, err := db.ExecContext(ctx, "INSERT INTO application_data (`key`, `value`) VALUES (?, ?)", vapidKeysDBKey, string(data)); err != nil {
		return nil, err
	}
	return pair, nil
}

// GetApplicationVAPIDKeys returns a pair of VAPID public/private keys used by
// the Web Push API. If no keys are found in the application_data table in the
// database, a new key-value pair is generated, saved, and returned.
func GetApplicationVAPIDKeys(ctx context.Context, db *sql.DB) (*VAPIDKeys, error) {
	rawJSON := ""
	row := db.QueryRowContext(ctx, "SELECT `value` FROM application_data WHERE `key` = ?", vapidKeysDBKey)
	if err := row.Scan(&rawJSON); err != nil {
		if err == sql.ErrNoRows {
			return saveVAPIDKeys(ctx, db)
		}
		return nil, err
	}

	pair := &VAPIDKeys{}
	if err := json.Unmarshal([]byte(rawJSON), pair); err != nil {
		return nil, err
	}
	return pair, nil
}

// WebPushSubscription stores a PushSubscription object with other necessary
// information for sending web push notifications for logged in users.
//
// One user could have multiple WebPushSubscription entries in the database (in
// which case he's signed in on multiple devices).
type WebPushSubscription struct {
	ID               int                  `json:"id"`
	SessionID        string               `json:"sessionId"`
	UserID           uid.ID               `json:"userId"`
	PushSubscription webpush.Subscription `json:"pushSubscription"`
	CreatedAt        time.Time            `json:"createdAt"`
	UpdatedAt        msql.NullTime        `json:"updatedAt"`

	rawPushSubscription string // raw json string
}

// SaveWebPushSubscription adds an entry into web_push_notifications table. If
// there's a collision (a duplicate for sessionID), it updates the matching row.
// It is safe to call this function repeatedly with the same arguments.
func SaveWebPushSubscription(ctx context.Context, db *sql.DB, sessionID string, user uid.ID, s webpush.Subscription) error {
	rawJSON, err := json.Marshal(s)
	if err != nil {
		return err
	}
	_, err = db.ExecContext(ctx, `INSERT INTO web_push_subscriptions (session_id, user_id, push_subscription) 
		VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE push_subscription = ?, updated_at = CURRENT_TIMESTAMP()`,
		sessionID, user, rawJSON, rawJSON)

	return err
}

// DeleteWebPushSuscription deletes the Push Subscription object associated with
// sessionID (if there is one).
//
// Make sure to call this function before logging out a user.
func DeleteWebPushSubscription(ctx context.Context, db *sql.DB, sessionID string) error {
	_, err := db.ExecContext(ctx, "DELETE FROM web_push_subscriptions WHERE session_id = ?", sessionID)
	return err
}

// userWebPushSubscriptions returns all the Web Push Subscriptions of the user.
func userWebPushSubscriptions(ctx context.Context, db *sql.DB, user uid.ID) ([]*WebPushSubscription, error) {
	s := msql.BuildSelectQuery("web_push_subscriptions", []string{
		"id",
		"session_id",
		"user_id",
		"push_subscription",
		"created_at",
		"updated_at",
	}, nil, "WHERE user_id = ?")

	rows, err := db.QueryContext(ctx, s, user)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var subs []*WebPushSubscription
	for rows.Next() {
		sub := &WebPushSubscription{}
		if err := rows.Scan(&sub.ID, &sub.SessionID, &sub.UserID, &sub.rawPushSubscription, &sub.CreatedAt, &sub.UpdatedAt); err != nil {
			return nil, err
		}
		if err := json.Unmarshal([]byte(sub.rawPushSubscription), &sub.PushSubscription); err != nil {
			return nil, err
		}
		subs = append(subs, sub)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}
	return subs, nil
}

// SendPushNotification sends the Web Push notification in payload to all
// sessions of user (that has web notifications enabled).
func SendPushNotification(ctx context.Context, db *sql.DB, user uid.ID, payload []byte, options *webpush.Options) error {
	subs, err := userWebPushSubscriptions(ctx, db, user)
	if err != nil {
		return err
	}

	var errors []error
	for _, sub := range subs {
		res, err := webpush.SendNotificationWithContext(ctx, payload, &sub.PushSubscription, options)
		if err != nil {
			errors = append(errors, err)
			continue
		}
		defer res.Body.Close()
	}

	if len(errors) > 0 {
		return fmt.Errorf("%v errors trying to send %v web push notifications", len(errors), len(subs))
	}
	return nil
}

type NotificationNewBadge struct {
	UserID    uid.ID `json:"userId"`
	BadgeType string `json:"badgeType"`
}

func (n NotificationNewBadge) marshalJSONForAPI(ctx context.Context, db *sql.DB) ([]byte, error) {
	user, err := GetUser(ctx, db, n.UserID, nil)
	if err != nil {
		return nil, err
	}
	out := struct {
		BadgeType string `json:"badgeType"`
		User      *User  `json:"user"`
	}{
		BadgeType: n.BadgeType,
		User:      user,
	}
	return json.Marshal(out)
}

func CreateNewBadgeNotification(ctx context.Context, db *sql.DB, user uid.ID, badgeType string) error {
	// Check if badgeType is valid.
	if _, err := badgeTypeInt(db, badgeType); err != nil {
		return err
	}
	n := NotificationNewBadge{
		BadgeType: badgeType,
		UserID:    user,
	}
	return CreateNotification(ctx, db, user, NotificationTypeNewBadge, n)
}

type NotificationWelcome struct {
	CommunityName string `json:"communityName"`
}

func (n *NotificationWelcome) marshalJSONForAPI(ctx context.Context, db *sql.DB) ([]byte, error) {
	type T NotificationWelcome
	out := struct {
		*T
		Community *Community `json:"community"`
	}{
		T: (*T)(n),
	}

	com, err := GetCommunityByName(ctx, db, n.CommunityName, nil)
	if err != nil {
		return nil, err
	}
	out.Community = com
	return json.Marshal(out)
}

func CreateWelcomeNotification(ctx context.Context, db *sql.DB, community string, user uid.ID) error {
	return CreateNotification(ctx, db, user, NotificationTypeWelcome, &NotificationWelcome{
		CommunityName: community,
	})
}

func SendWelcomeNotifications(ctx context.Context, db *sql.DB, community string, delay time.Duration) (int, error) {
	// Check if the community exists
	{
		var tmp string
		if err := db.QueryRowContext(ctx, "SELECT name_lc FROM communities WHERE name_lc = ?", strings.ToLower(community)).Scan(&tmp); err != nil {
			if err == sql.ErrNoRows {
				return 0, fmt.Errorf("welcome community '%s' doesn't exist", community)
			}
			return 0, err
		}
	}

	// Fetch the users who needs a notification sent
	rows, err := db.QueryContext(ctx, "SELECT id FROM users WHERE welcome_notification_sent = false AND created_at < ?", time.Now().Add(-1*delay))
	if err != nil {
		return 0, err
	}

	var users []uid.ID
	for rows.Next() {
		var id uid.ID
		if err := rows.Scan(&id); err != nil {
			return 0, err
		}
		users = append(users, id)
	}

	if err := rows.Err(); err != nil {
		return 0, err
	}

	// Send a notification to a single user
	send := func(user uid.ID) error {
		if err := CreateWelcomeNotification(ctx, db, community, user); err != nil {
			return fmt.Errorf("failed to send welcome notification: %w", err)
		}
		_, err := db.ExecContext(ctx, "update users set welcome_notification_sent = true where id = ?", user)
		return err
	}

	success := 0
	for _, user := range users {
		if err := send(user); err != nil {
			log.Printf("Error sending welcome notification to user (id: %v): %v", user, err)
		}
		success++
	}

	return success, nil
}
