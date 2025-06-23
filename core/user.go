package core

import (
	"context"
	"crypto/sha1"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"slices"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/discuitnet/discuit/internal/httperr"
	"github.com/discuitnet/discuit/internal/images"
	msql "github.com/discuitnet/discuit/internal/sql"
	"github.com/discuitnet/discuit/internal/uid"
	"github.com/discuitnet/discuit/internal/utils"
	"golang.org/x/crypto/bcrypt"
)

const (
	// For usernames and community names.
	maxUsernameLength = 21
	minUsernameLength = 3

	maxPasswordLength = 72 // in bytes (limit set by bcrypt)
	minPasswordLength = 8

	maxUserProfileAboutLength = 10000
	maxHiddenPosts            = 1000 // per user
)

// UserGroup represents who a user is.
type UserGroup int

const (
	UserGroupNaN = UserGroup(iota) // Psuedo user group.
	UserGroupNormal
	UserGroupAdmins
	UserGroupMods
)

func (u UserGroup) Valid() bool {
	_, err := u.MarshalText()
	return err == nil
}

// String implements fmt.Stringer interface. It returns the value returned by
// u.MarshalText (if u.MarshalText returns an error, it returns "[error]").
func (u UserGroup) String() string {
	b, err := u.MarshalText()
	if err != nil {
		return "[error]"
	}
	return string(b)
}

// MarshalText implements encoding.TextMarshaler interface.
func (u UserGroup) MarshalText() ([]byte, error) {
	s := ""
	switch u {
	case UserGroupNaN:
		s = "null"
	case UserGroupNormal:
		s = "normal"
	case UserGroupAdmins:
		s = "admins"
	case UserGroupMods:
		s = "mods"
	default:
		return nil, errInvalidUserGroup
	}
	return []byte(s), nil
}

// UnmarshalText implements encoding.TextUnmarshaler interface.
func (u *UserGroup) UnmarshalText(text []byte) error {
	switch string(text) {
	case "null":
		*u = UserGroupNaN
	case "normal":
		*u = UserGroupNormal
	case "admins":
		*u = UserGroupAdmins
	case "mods":
		*u = UserGroupMods
	default:
		return errInvalidUserGroup
	}
	return nil
}

type User struct {
	ID                uid.ID `json:"id"`
	UserIndex         int    `json:"-"`
	Username          string `json:"username"`
	UsernameLowerCase string `json:"-"`

	EmailPublic *string `json:"email"`

	Email            msql.NullString `json:"-"`
	EmailConfirmedAt msql.NullTime   `json:"emailConfirmedAt"`
	Password         string          `json:"-"`
	About            msql.NullString `json:"aboutMe"`
	Points           int             `json:"points"`
	Admin            bool            `json:"isAdmin"`
	ProPic           *images.Image   `json:"proPic"`
	Badges           Badges          `json:"badges"`
	NumPosts         int             `json:"noPosts"`
	NumComments      int             `json:"noComments"`
	LastSeen         time.Time       `json:"-"`             // accurate to within 5 minutes
	LastSeenMonth    string          `json:"lastSeenMonth"` // of the form: November 2024
	LastSeenIP       msql.NullIP     `json:"-"`
	CreatedAt        time.Time       `json:"createdAt"`
	CreatedIP        msql.NullIP     `json:"-"`
	Deleted          bool            `json:"deleted"`
	DeletedAt        msql.NullTime   `json:"deletedAt,omitempty"`

	// User preferences.
	UpvoteNotificationsOff  bool     `json:"upvoteNotificationsOff"`
	ReplyNotificationsOff   bool     `json:"replyNotificationsOff"`
	HomeFeed                FeedType `json:"homeFeed"`
	RememberFeedSort        bool     `json:"rememberFeedSort"`
	EmbedsOff               bool     `json:"embedsOff"`
	HideUserProfilePictures bool     `json:"hideUserProfilePictures"`
	RequireAltText          bool     `json:"requireAltText"`

	WelcomeNotificationSent bool `json:"-"`

	// No banned users are supposed to be logged in. Make sure to log them out
	// before banning.
	BannedAt msql.NullTime `json:"bannedAt"`
	Banned   bool          `json:"isBanned"`

	MutedByViewer bool `json:"-"`

	NumNewNotifications int `json:"notificationsNewCount"`

	// The list of communities the user moderates.
	ModdingList []*Community `json:"moddingList"`

	// The following values are used only by SetToGhost and UnsetToGhost
	// methods.
	preGhostUsername  string
	preGhostID        uid.ID
	preGhostCreatedAt time.Time
	preGhostDeletedAt msql.NullTime
	preGhostBadges    Badges
}

// IsUsernameValid returns nil if name only consists
// of valid (0-9, A-Z, a-z, and _) characters and
// if it's of acceptable length.
func IsUsernameValid(name string) error {
	runes := [...]rune{
		'0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
		'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
		'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
		'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D',
		'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N',
		'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X',
		'Y', 'Z', '_',
	}

	n := len(name)
	if n == 0 {
		return errors.New("is empty")
	}
	if n < minUsernameLength {
		return errors.New("is too short")
	}
	if n > maxUsernameLength {
		return errors.New("is too long")
	}

	for _, r := range name {
		match := false
		for _, r2 := range runes {
			if r == r2 {
				match = true
				break
			}
		}
		if !match {
			return errors.New("contains disallowed characters")
		}
	}
	return nil
}

func trimPassword(password []byte) []byte {
	if len(password) > maxPasswordLength {
		password = password[:maxPasswordLength]
	}
	return password
}

// HashPassword returns the hashed password if the password is acceptable,
// otherwise it returns an httperr.Error.
func HashPassword(password []byte) ([]byte, error) {
	if len(password) == 0 {
		return nil, httperr.NewBadRequest("invalid-password", "Password empty.")
	}
	if len(password) < minPasswordLength {
		return nil, httperr.NewBadRequest("invalid-password", "Password too short.")
	}

	password = trimPassword(password)
	hash, err := bcrypt.GenerateFromPassword(password, bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("error hashing password: %w", err)
	}
	return hash, nil
}

func buildSelectUserQuery(where string) string {
	cols := []string{
		"users.id",
		"users.user_index",
		"users.username",
		"users.username_lc",
		"users.email",
		"users.email_confirmed_at",
		"users.password",
		"users.about_me",
		"users.points",
		"users.is_admin",
		"users.no_posts",
		"users.no_comments",
		"users.notifications_new_count",
		"users.last_seen",
		"users.last_seen_ip",
		"users.created_at",
		"users.created_ip",
		"users.deleted_at",
		"users.banned_at",
		"users.upvote_notifications_off",
		"users.reply_notifications_off",
		"users.home_feed",
		"users.remember_feed_sort",
		"users.embeds_off",
		"users.hide_user_profile_pictures",
		"users.welcome_notification_sent",
		"users.require_alt_text",
	}
	cols = append(cols, images.ImageColumns("pro_pic")...)
	joins := []string{
		"LEFT JOIN images AS pro_pic ON pro_pic.id = users.pro_pic",
	}
	return msql.BuildSelectQuery("users", cols, joins, where)
}

func GetUser(ctx context.Context, db *sql.DB, user uid.ID, viewer *uid.ID) (*User, error) {
	rows, err := db.QueryContext(ctx, buildSelectUserQuery("WHERE users.id = ?"), user)
	if err != nil {
		return nil, err
	}

	users, err := scanUsers(ctx, db, rows, viewer)
	if err != nil {
		return nil, err
	}
	return users[0], err
}

func GetUsersByIDs(ctx context.Context, db *sql.DB, IDs []uid.ID, viewer *uid.ID) ([]*User, error) {
	if len(IDs) == 0 {
		return nil, nil
	}
	args := make([]any, len(IDs))
	for i := range IDs {
		args[i] = IDs[i]
	}

	query := buildSelectUserQuery(fmt.Sprintf("WHERE users.id IN %s", msql.InClauseQuestionMarks(len(IDs))))
	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	users, err := scanUsers(ctx, db, rows, viewer)
	if err != nil {
		return nil, err
	}
	return users, nil
}

func GetUsersByUsernames(ctx context.Context, db *sql.DB, usernames []string, viewer *uid.ID) ([]*User, error) {
	if len(usernames) == 0 {
		return nil, nil
	}
	args := make([]any, len(usernames))
	for i := range usernames {
		args[i] = usernames[i]
	}

	query := buildSelectUserQuery(fmt.Sprintf("WHERE users.username IN %s", msql.InClauseQuestionMarks(len(usernames))))
	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	users, err := scanUsers(ctx, db, rows, viewer)
	if err != nil {
		return nil, err
	}
	return users, nil
}

func GetUserByUsername(ctx context.Context, db *sql.DB, username string, viewer *uid.ID) (*User, error) {
	rows, err := db.QueryContext(ctx, buildSelectUserQuery("WHERE users.username_lc = ?"), strings.ToLower(username))
	if err != nil {
		return nil, err
	}
	users, err := scanUsers(ctx, db, rows, viewer)
	if err != nil {
		return nil, err
	}
	return users[0], err
}

func GetUserByEmail(ctx context.Context, db *sql.DB, email string, viewer *uid.ID) (*User, error) {
	rows, err := db.QueryContext(ctx, buildSelectUserQuery("WHERE users.email = ?"), email)
	if err != nil {
		return nil, err
	}
	users, err := scanUsers(ctx, db, rows, viewer)
	if err != nil {
		return nil, err
	}
	return users[0], err
}

// scanUsers returns errUserNotFound if no rows can be found.
func scanUsers(ctx context.Context, db *sql.DB, rows *sql.Rows, viewer *uid.ID) ([]*User, error) {
	defer rows.Close()

	var users []*User
	for rows.Next() {
		u := &User{
			Badges: make(Badges, 0),
		}
		dests := []any{
			&u.ID,
			&u.UserIndex,
			&u.Username,
			&u.UsernameLowerCase,
			&u.Email,
			&u.EmailConfirmedAt,
			&u.Password,
			&u.About,
			&u.Points,
			&u.Admin,
			&u.NumPosts,
			&u.NumComments,
			&u.NumNewNotifications,
			&u.LastSeen,
			&u.LastSeenIP,
			&u.CreatedAt,
			&u.CreatedIP,
			&u.DeletedAt,
			&u.BannedAt,
			&u.UpvoteNotificationsOff,
			&u.ReplyNotificationsOff,
			&u.HomeFeed,
			&u.RememberFeedSort,
			&u.EmbedsOff,
			&u.HideUserProfilePictures,
			&u.WelcomeNotificationSent,
			&u.RequireAltText,
		}

		proPic := &images.Image{}
		dests = append(dests, proPic.ScanDestinations()...)

		if err := rows.Scan(dests...); err != nil {
			return nil, err
		}

		u.Deleted = u.DeletedAt.Valid
		u.preGhostUsername = u.Username
		u.preGhostID = u.ID
		u.preGhostCreatedAt = u.CreatedAt
		u.preGhostDeletedAt = u.DeletedAt
		u.preGhostBadges = u.Badges

		if u.BannedAt.Valid {
			u.Banned = true
		}

		if proPic.ID != nil {
			proPic.PostScan()
			setCommunityProPicCopies(proPic)
			u.ProPic = proPic
		}

		users = append(users, u)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(users) == 0 {
		return nil, errUserNotFound
	}

	if viewer != nil {
		mutes, err := GetMutedUsers(ctx, db, *viewer, false)
		if err != nil {
			return nil, err
		}
		for _, user := range users {
			for _, mute := range mutes {
				if *mute.MutedUserID == user.ID {
					user.MutedByViewer = true
					break
				}
			}
		}
	}

	if err := fetchBadges(db, users...); err != nil {
		return nil, fmt.Errorf("fetching badges: %w", err)
	}

	viewerAdmin, err := IsAdmin(db, viewer)
	if err != nil {
		return nil, err
	}

	for _, user := range users {
		// Hide everything that only the user themself or an admin should see
		// from public view.
		if viewerAdmin || (viewer != nil && *viewer == user.ID) {
			if user.Email.Valid {
				user.EmailPublic = new(string)
				*user.EmailPublic = user.Email.String
			}
		}
		// Set the user info of deleted users to the ghost user for everyone
		// except the admins.
		if user.Deleted && !viewerAdmin {
			user.SetToGhost()
		}

		user.LastSeenMonth = user.LastSeen.Month().String() + " " + strconv.Itoa(user.LastSeen.Year())
	}

	return users, nil
}

// RegisterUser creates a new user.
func RegisterUser(ctx context.Context, db *sql.DB, username, email, password, ip string) (*User, error) {
	// Check for duplicates.
	if exists, _, err := usernameExists(ctx, db, username); err != nil {
		return nil, err
	} else if exists {
		return nil, &httperr.Error{
			HTTPStatus: http.StatusConflict,
			Code:       "user_exists",
			Message:    fmt.Sprintf("A user with username %s already exists.", username),
		}
	}

	// Check if username is valid.
	if err := IsUsernameValid(username); err != nil {
		return nil, httperr.NewBadRequest("invalid-username", fmt.Sprintf("Username %v.", err))
	}

	hash, err := HashPassword([]byte(password))
	if err != nil {
		return nil, err
	}

	// Note: Thet email address is not checked to be a valid email address. Any
	// string can be stored as an email address currently.
	nullEmail := msql.NullString{}
	if email != "" {
		nullEmail.Valid = true
		nullEmail.String = email
	}

	var ipany any
	if ip != "" {
		ipany = ip
	}
	id := uid.New()

	query, args := msql.BuildInsertQuery("users", []msql.ColumnValue{
		{Name: "id", Value: id},
		{Name: "username", Value: username},
		{Name: "username_lc", Value: strings.ToLower(username)},
		{Name: "email", Value: nullEmail},
		{Name: "password", Value: hash},
		{Name: "created_ip", Value: ipany},
	})
	_, err = db.ExecContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}

	if err := addUserToDefaultCommunities(ctx, db, id); err != nil {
		log.Println("Failed to add user to default communities: ", err)
		// Continue on failure.
	}

	if err := CreateList(ctx, db, id, "bookmarks", "Bookmarks", msql.NullString{}, false); err != nil {
		log.Println("Failed to create the default community of user: ", username)
		// Continue on failure.
	}

	return GetUser(ctx, db, id, nil)
}

func addUserToDefaultCommunities(ctx context.Context, db *sql.DB, user uid.ID) error {
	query := "SELECT communities.id FROM communities INNER JOIN default_communities ON communities.name_lc = default_communities.name_lc"
	rows, err := db.QueryContext(ctx, query)
	if err != nil {
		return err
	}
	defer rows.Close()

	var communities []uid.ID
	for rows.Next() {
		var id uid.ID
		if err = rows.Scan(&id); err != nil {
			return err
		}
		communities = append(communities, id)
	}
	if err = rows.Err(); err != nil {
		return err
	}
	if len(communities) == 0 {
		return nil
	}

	return msql.Transact(ctx, db, func(tx *sql.Tx) (err error) {
		q, args, ids := "", make([]any, 0, 2*len(communities)), make([]any, len(communities))
		for i, id := range communities {
			if i != 0 {
				q += ","
			}
			q += "(?, ?) "
			args = append(args, id, user)
			ids[i] = communities[i]
		}
		if _, err = tx.ExecContext(ctx, "INSERT INTO community_members (community_id, user_id) VALUES "+q, args...); err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, "UPDATE communities SET no_members = no_members + 1 WHERE id IN "+msql.InClauseQuestionMarks(len(ids)), ids...); err != nil {
			return err
		}
		return nil
	})
}

func usernameExists(ctx context.Context, db *sql.DB, username string) (exists bool, user uid.ID, err error) {
	username = strings.ToLower(username)
	if err := db.QueryRowContext(ctx, "SELECT id FROM users WHERE username_lc = ?", username).Scan(&user); err == nil {
		exists = true
	} else if err == sql.ErrNoRows {
		err = nil
	}
	return
}

func userWithEmailExists(ctx context.Context, db *sql.DB, email string) (exists bool, user uid.ID, err error) {
	if err := db.QueryRowContext(ctx, "SELECT id FROM users WHERE email = ?", email).Scan(&user); err == nil {
		exists = true
	} else if err == sql.ErrNoRows {
		err = nil
	}
	return
}

// MatchLoginCredentials returns a nil error if a user was found and the
// password matches.
func MatchLoginCredentials(ctx context.Context, db *sql.DB, username, password string) (*User, error) {
	user, err := GetUserByUsername(ctx, db, username, nil)
	if err != nil {
		if err == errUserNotFound {
			return nil, ErrWrongPassword
		}
		return nil, err
	}

	if user.Deleted {
		return nil, ErrWrongPassword
	}

	if err = bcrypt.CompareHashAndPassword([]byte(user.Password), trimPassword([]byte(password))); err != nil {
		return nil, ErrWrongPassword
	}
	return user, nil
}

// incrementUserPoints adds amount to user's points.
func incrementUserPoints(ctx context.Context, tx *sql.Tx, user uid.ID, amount int) error {
	_, err := tx.ExecContext(ctx, "UPDATE users SET points = points + ? WHERE id = ?", amount, user)
	return err
}

// If db is nil, tx is used for the query execution.
func getUserPointsAndCreatedAt(ctx context.Context, db *sql.DB, tx *sql.Tx, user uid.ID) (int, time.Time, error) {
	var (
		points int
		t      time.Time
		row    *sql.Row
		query  = "SELECT points, created_at FROM users WHERE users.id = ?"
		args   = []any{user}
	)

	if db != nil {
		row = db.QueryRowContext(ctx, query, args...)
	} else {
		row = tx.QueryRowContext(ctx, query, args...)
	}

	if err := row.Scan(&points, &t); err != nil {
		return 0, t, err
	}
	return points, t, nil
}

func userAllowedToIncrementPoints(ctx context.Context, tx *sql.Tx, user uid.ID, requiredPoints int, requiredAge time.Duration) (bool, error) {
	points, createdAt, err := getUserPointsAndCreatedAt(ctx, nil, tx, user)
	if err != nil {
		return false, err
	}
	return points >= requiredPoints && time.Since(createdAt) > requiredAge, nil
}

func UserAllowedToPostImages(ctx context.Context, db *sql.DB, user uid.ID, requiredPoints int) (bool, error) {
	points, _, err := getUserPointsAndCreatedAt(ctx, db, nil, user)
	if err != nil {
		return false, err
	}
	return points >= requiredPoints, nil
}

// Update updates the user's updatable fields.
func (u *User) Update(ctx context.Context, db *sql.DB) error {
	if u.Deleted {
		return ErrUserDeleted
	}

	u.About.String = utils.TruncateUnicodeString(u.About.String, maxUserProfileAboutLength)
	_, err := db.ExecContext(ctx, `
	UPDATE users SET
		email = ?, 
		about_me = ?,
		upvote_notifications_off = ?,
		reply_notifications_off = ?,
		home_feed = ?,
		remember_feed_sort = ?,
		embeds_off = ?,
		hide_user_profile_pictures = ?,
		require_alt_text = ?
	WHERE id = ?`,
		u.EmailPublic,
		u.About,
		u.UpvoteNotificationsOff,
		u.ReplyNotificationsOff,
		u.HomeFeed,
		u.RememberFeedSort,
		u.EmbedsOff,
		u.HideUserProfilePictures,
		u.RequireAltText,
		u.ID)
	return err
}

func (u *User) IsGhost() bool {
	return u.Username == "ghost"
}

// SetToGhost sets u.username to "ghost" and u.ID to zero, if the user is
// deleted.
func (u *User) SetToGhost() {
	if u.Deleted {
		u.Username = "ghost"
		u.UsernameLowerCase = "ghost"
		u.ID = uid.ID{}
		u.CreatedAt = time.Time{}
		u.DeletedAt = msql.NewNullTime(time.Time{})
		u.Badges = make(Badges, 0)
	}
}

// UnsetToGhost is the inverse of u.SetToGhost.
func (u *User) UnsetToGhost() {
	if u.Deleted {
		u.Username = u.preGhostUsername
		u.UsernameLowerCase = strings.ToLower(u.Username)
		u.ID = u.preGhostID
		u.CreatedAt = u.preGhostCreatedAt
		u.DeletedAt = u.preGhostDeletedAt
		u.Badges = u.preGhostBadges
	}
}

// MarshalJSONForAdminViewer marshals the user with additional fields for admin
// eyes only.
func (u *User) MarshalJSONForAdminViewer(ctx context.Context, db *sql.DB) ([]byte, error) {
	user := &struct {
		*User
		CreatedIP                msql.NullIP `json:"createdIP"`
		UserIndex                int         `json:"userIndex"`
		LastSeen                 time.Time   `json:"lastSeen"`
		LastSeenIP               msql.NullIP `json:"lastSeenIP"`
		WebPushSubsriptionsCount int         `json:"webPushSubscriptionsCount"`
	}{
		User:       u,
		CreatedIP:  u.CreatedIP,
		UserIndex:  u.UserIndex,
		LastSeen:   u.LastSeen,
		LastSeenIP: u.LastSeenIP,
	}

	if err := db.QueryRow("SELECT COUNT(*) FROM web_push_subscriptions WHERE user_id = ?", u.ID).Scan(&user.WebPushSubsriptionsCount); err != nil {
		return nil, err
	}

	return json.Marshal(user)
}

// Delete deletes a user. Make sure that the user is logged out on all sessions
// before calling this function.
func (u *User) Delete(ctx context.Context, db *sql.DB) error {
	if u.Deleted {
		return ErrUserDeleted
	}
	if u.Banned {
		return errors.New("cannot delete banned account (unban user first and then continue)")
	}

	return msql.Transact(ctx, db, func(tx *sql.Tx) (err error) {
		// Remove the user's membership of all communities the user is a member of.
		if _, err := tx.ExecContext(ctx, `
			UPDATE communities 
			SET no_members = no_members - 1 
			WHERE id IN (SELECT community_id FROM community_members WHERE user_id = ?)`, u.ID); err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, "DELETE FROM community_members WHERE user_id = ?", u.ID); err != nil {
			return err
		}

		// Remove the user from all mod positions the user holds.
		if _, err := tx.ExecContext(ctx, "DELETE FROM community_mods WHERE user_id = ?", u.ID); err != nil {
			return err
		}

		// Unban the user from all communities.
		if _, err := tx.ExecContext(ctx, "DELETE FROM community_banned WHERE user_id = ?", u.ID); err != nil {
			return err
		}

		// Set the author deleted column of the comments.
		if _, err := tx.ExecContext(ctx, "UPDATE comments SET user_deleted = TRUE WHERE user_id = ?", u.ID); err != nil {
			return err
		}

		// Delete the user's notifications.
		if _, err := tx.ExecContext(ctx, "DELETE FROM notifications WHERE user_id = ?", u.ID); err != nil {
			return err
		}

		// Delete both the user's muted users and muted by's.
		if _, err := tx.ExecContext(ctx, "DELETE FROM muted_users WHERE user_id = ? OR muted_user_id = ?", u.ID, u.ID); err != nil {
			return err
		}

		// Delete the user's muted communities.
		if _, err := tx.ExecContext(ctx, "DELETE FROM muted_communities WHERE user_id = ?", u.ID); err != nil {
			return err
		}

		// Delete the user's web push subscriptions.
		if _, err := tx.ExecContext(ctx, "DELETE FROM web_push_subscriptions WHERE user_id = ?", u.ID); err != nil {
			return err
		}

		// Delete the user's lists.
		if _, err := tx.ExecContext(ctx, "DELETE FROM lists WHERE user_id = ?", u.ID); err != nil {
			return err
		}

		// Delete the user's profile picture
		if err := u.DeleteProPicTx(ctx, db, tx); err != nil {
			return err
		}

		// Finally, set the deleted state of the user.
		now := time.Now()
		q := `UPDATE users SET 
				email = ?, 
				email_confirmed_at = ?,
				password = ?, 
				about_me = ?, 
				is_admin = ?,
				notifications_new_count = ?,
				deleted_at = ? 
			  WHERE id = ?`
		args := []any{
			nil,
			nil,
			utils.GenerateStringID(48),
			nil,
			false,
			0,
			now,
			u.ID,
		}
		if _, err := tx.ExecContext(ctx, q, args...); err != nil {
			return err
		}

		u.DeletedAt = msql.NewNullTime(now)
		u.NumNewNotifications = 0
		return nil
	})
}

// DeleteContent deletes all posts and comments of user that were created in the
// last n days (n=0 means all time). It does not delete the user.
func (u *User) DeleteContent(ctx context.Context, db *sql.DB, n int, admin uid.ID) error {
	t := time.Now()
	defer func() {
		log.Printf("Took %v to delete content of user %s\n", time.Since(t), u.Username)
	}()

	where, args := "WHERE posts.user_id = ?", []any{u.ID}
	if n > 0 {
		since := time.Now().Add(-1 * time.Hour * 24 * time.Duration(n))
		where += " AND posts.created_at > ?"
		args = append(args, since)
	}

	query := buildSelectPostQuery(false, where)
	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return err
	}
	posts, err := scanPosts(ctx, db, rows, nil)
	if err != nil && err != errPostNotFound {
		return err
	}

	for _, post := range posts {
		if !(post.Deleted && post.DeletedContent) {
			if err := post.Delete(ctx, db, admin, UserGroupAdmins, true, false); err != nil {
				return err
			}
		}
	}

	where, args = "WHERE comments.user_id = ?", []any{u.ID}
	if n > 0 {
		since := time.Now().Add(-1 * time.Hour * 24 * time.Duration(n))
		where += " AND comments.created_at > ?"
		args = append(args, since)
	}

	query = buildSelectCommentsQuery(false, where)
	rows, err = db.QueryContext(ctx, query, args...)
	if err != nil {
		return err
	}
	comments, err := scanComments(ctx, db, rows, nil)
	if err != nil && err != errCommentNotFound {
		return err
	}

	for _, comment := range comments {
		if !comment.Deleted {
			if err := comment.Delete(ctx, db, admin, UserGroupAdmins); err != nil {
				return err
			}
		}
	}

	return nil
}

// Ban bans the user from site. Important: Make sure to log out all sessions of
// this user before calling this function, and never allow this user to login.
//
// Note: An admin can be banned.
func (u *User) Ban(ctx context.Context, db *sql.DB) error {
	t := time.Now()
	_, err := db.ExecContext(ctx, "UPDATE users SET banned_at = ? WHERE id = ?", t, u.ID)
	if err == nil {
		u.BannedAt = msql.NewNullTime(t)
		u.Banned = true
	}
	return err
}

func (u *User) Unban(ctx context.Context, db *sql.DB) error {
	_, err := db.ExecContext(ctx, "UPDATE users SET banned_at = NULL WHERE id = ?", u.ID)
	return err
}

// MakeAdmin makes the user an admin of the site. If isAdmin is false
// admin is removed as an admin.
func (u *User) MakeAdmin(ctx context.Context, db *sql.DB, isAdmin bool) error {
	_, err := MakeAdmin(ctx, db, u.Username, isAdmin)
	if err != nil {
		u.Admin = isAdmin
	}
	return err
}

func (u *User) ChangePassword(ctx context.Context, db *sql.DB, previousPass, newPass string) error {
	// MatchLoginCredentials checks for deleted account status.
	if _, err := MatchLoginCredentials(ctx, db, u.Username, previousPass); err != nil {
		return err
	}
	hash, err := HashPassword([]byte(newPass))
	if err != nil {
		return err
	}
	_, err = db.ExecContext(ctx, "UPDATE users SET password = ? WHERE id = ?", hash, u.ID)
	u.Password = string(hash)
	return err
}

func (u *User) ResetNewNotificationsCount(ctx context.Context, db *sql.DB) error {
	err := resetNewNotificationsCount(ctx, db, u.ID)
	if err == nil {
		u.NumNewNotifications = 0
	}
	return err
}

// MarkAllNotificationsAsSeen marks all notifications as seen, if t is the zero
// value, and if not, it marks all notifications of type t as seen.
func (u *User) MarkAllNotificationsAsSeen(ctx context.Context, db *sql.DB, t NotificationType) error {
	return markAllNotificationsAsSeen(ctx, db, u.ID, t)
}

func (u *User) DeleteAllNotifications(ctx context.Context, db *sql.DB) error {
	return deleteAllNotifications(ctx, db, u.ID)
}

// GetBannedFromCommunities returns the list of communities that user
// is banned from.
func (u *User) GetBannedFromCommunities(ctx context.Context, db *sql.DB) ([]uid.ID, error) {
	rows, err := db.QueryContext(ctx, "SELECT community_id, expires FROM community_banned WHERE user_id = ?", u.ID)
	if err != nil {
		return nil, err
	}

	var ids []uid.ID
	var expires []msql.NullTime
	for rows.Next() {
		var id uid.ID
		var e msql.NullTime
		if err = rows.Scan(&id, &e); err != nil {
			return nil, err
		}
		ids = append(ids, id)
		expires = append(expires, e)
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}

	var nonExpired []uid.ID
	for i := range ids {
		if !expires[i].Valid || time.Since(expires[i].Time) > 0 {
			nonExpired = append(nonExpired, ids[i])
		}
	}
	return nonExpired, nil
}

// Saw updates u.LastSeen to current time. It also updates the IP address of the
// user.
func (u *User) Saw(ctx context.Context, db *sql.DB, userIP string) error {
	if u.Deleted {
		return ErrUserDeleted
	}
	err := UserSeen(ctx, db, u.ID, userIP)
	if err != nil {
		u.LastSeen = time.Now()
	}
	return err
}

// UserSeen updates user's LastSeen to current time. It also updates the IP
// address of the user.
func UserSeen(ctx context.Context, db *sql.DB, user uid.ID, userIP string) error {
	_, err := db.ExecContext(ctx, "UPDATE users SET last_seen = ?, last_seen_ip = ? WHERE id = ? AND deleted_at IS NULL", time.Now(), userIP, user)
	return err
}

// CountAllUsers return the no of users of the site, including deleted users.
func CountAllUsers(ctx context.Context, db *sql.DB) (n int, err error) {
	row := db.QueryRowContext(ctx, "SELECT COUNT(*) FROM users")
	err = row.Scan(&n)
	return
}

func (u *User) LoadModdingList(ctx context.Context, db *sql.DB) error {
	comms, err := getCommunities(ctx, db, nil, "WHERE communities.id IN (SELECT community_mods.community_id FROM community_mods WHERE user_id = ?)", u.ID)
	if err == nil {
		u.ModdingList = comms
	}
	return err
}

func (u *User) DeleteProPicTx(ctx context.Context, db *sql.DB, tx *sql.Tx) error {
	if u.ProPic == nil {
		return nil
	}
	if _, err := db.ExecContext(ctx, "UPDATE users SET pro_pic = NULL where id = ?", u.ID); err != nil {
		return fmt.Errorf("failed to set users.pro_pic to null for user %s: %w", u.Username, err)
	}
	if err := images.DeleteImagesTx(ctx, tx, db, *u.ProPic.ID); err != nil {
		return fmt.Errorf("failed to delete pro pic of user %s: %w", u.Username, err)
	}
	u.ProPic = nil
	return nil
}

func (u *User) DeleteProPic(ctx context.Context, db *sql.DB) error {
	return msql.Transact(ctx, db, func(tx *sql.Tx) error {
		return u.DeleteProPicTx(ctx, db, tx)
	})
}

func (u *User) UpdateProPic(ctx context.Context, db *sql.DB, image []byte) error {
	if u.Deleted {
		return ErrUserDeleted
	}

	var newImageID uid.ID
	err := msql.Transact(ctx, db, func(tx *sql.Tx) error {
		if err := u.DeleteProPicTx(ctx, db, tx); err != nil {
			return err
		}
		imageID, err := images.SaveImageTx(ctx, tx, "disk", image, &images.ImageOptions{
			Width:  2000,
			Height: 2000,
			Format: images.ImageFormatJPEG,
			Fit:    images.ImageFitContain,
		})
		if err != nil {
			return fmt.Errorf("fail to save user pro pic: %w", err)
		}
		if _, err := tx.ExecContext(ctx, "UPDATE users SET pro_pic = ? WHERE id = ?", imageID, u.ID); err != nil {
			// Attempt to delete the image
			if err := images.DeleteImagesTx(ctx, tx, db, imageID); err != nil {
				log.Printf("failed to delete image (core.User.UpdateProPic): %v\n", err)
			}
			return fmt.Errorf("failed to set users.pro_pic to value: %w", err)
		}
		newImageID = imageID
		return nil
	})
	if err != nil {
		return err
	}

	record, err := images.GetImageRecord(ctx, db, newImageID)
	if err != nil {
		return err
	}
	u.ProPic = record.Image()
	setCommunityProPicCopies(u.ProPic)
	return nil
}

func (u *User) Muted(ctx context.Context, db *sql.DB, user uid.ID) (bool, error) {
	return UserMuted(ctx, db, u.ID, user)
}

func (u *User) MutedBy(ctx context.Context, db *sql.DB, user uid.ID) (bool, error) {
	return UserMuted(ctx, db, user, u.ID)
}

// badgeTypeInt returns the int badge type of badgeType.
func badgeTypeInt(db *sql.DB, badgeType string) (int, error) {
	var badgeTypeID int
	if err := db.QueryRow("SELECT id FROM badge_types WHERE name = ?", badgeType).Scan(&badgeTypeID); err != nil {
		if err == sql.ErrNoRows {
			return 0, httperr.NewNotFound("badge_type_not_found", "Badge type not found.")
		}
		return 0, err
	}
	return badgeTypeID, nil
}

// AddBadge addes new badge to u. Also, u.Badges is refetched upon a successful
// add.
func (u *User) AddBadge(ctx context.Context, db *sql.DB, badgeType string) error {
	if u.Deleted {
		return ErrUserDeleted
	}

	badgeTypeInt, err := badgeTypeInt(db, badgeType)
	if err != nil {
		return err
	}
	_, err = db.Exec("INSERT INTO user_badges (type, user_id) VALUES (?, ?)", badgeTypeInt, u.ID)
	if err != nil && !msql.IsErrDuplicateErr(err) {
		return err
	}

	if err := CreateNewBadgeNotification(ctx, db, u.ID, badgeType); err != nil {
		log.Printf("Error creating new badge notification: %v\n", err)
	}

	return fetchBadges(db, u)
}

func (u *User) RemoveBadgesByType(db *sql.DB, badgeType string) error {
	if u.Deleted {
		return ErrUserDeleted
	}

	badgeTypeInt, err := badgeTypeInt(db, badgeType)
	if err != nil {
		return err
	}
	_, err = db.Exec("DELETE FROM user_badges WHERE type = ? AND user_id = ?", badgeTypeInt, u.ID)
	return err
}

func (u *User) RemoveBadge(db *sql.DB, id int) error {
	if u.Deleted {
		return ErrUserDeleted
	}

	_, err := db.Exec("DELTE FROM user_badges WHERE id = ? and user_id = ?", id, u.ID)
	return err
}

func (u *User) HidePost(ctx context.Context, db *sql.DB, postID uid.ID) error {
	return msql.Transact(ctx, db, func(tx *sql.Tx) error {
		if _, err := tx.ExecContext(ctx, "INSERT INTO hidden_posts (user_id, post_id) VALUES (?, ?)", u.ID, postID); err != nil {
			if msql.IsErrDuplicateErr(err) {
				return nil
			}
			return err
		}

		count := 0
		if err := tx.QueryRowContext(ctx, "SELECT COUNT(*) FROM hidden_posts WHERE user_id = ?", u.ID).Scan(&count); err != nil {
			return err
		}

		// If there are more then maxHiddenPosts hidden posts, delete the excess
		// rows, choosing the oldest ones.
		if count > maxHiddenPosts {
			_, err := tx.ExecContext(
				ctx,
				"DELETE FROM hidden_posts WHERE user_id = ? AND created_at <= (SELECT created_at FROM hidden_posts WHERE user_id = ? ORDER BY created_at DESC LIMIT 1 OFFSET ?)",
				u.ID,
				u.ID,
				maxHiddenPosts,
			)
			if err != nil {
				return err
			}
		}
		return nil
	})
}

func (u *User) UnhidePost(ctx context.Context, db *sql.DB, postID uid.ID) error {
	_, err := db.ExecContext(ctx, "DELETE FROM hidden_posts WHERE user_id = ? AND post_id = ?", u.ID, postID)
	return err
}

// NewBadgeType creates a new type of user badge. Calling this function more
// than once with the same name will not result in an error.
func NewBadgeType(db *sql.DB, name string) error {
	if _, err := db.Exec("INSERT INTO badge_types (name) VALUES (?)", name); err != nil && !msql.IsErrDuplicateErr(err) {
		return err
	}
	return nil
}

// A Badge corresponds to a row in the user_badges table.
type Badge struct {
	ID        int       `json:"id"`
	Type      int       `json:"-"`
	TypeName  string    `json:"type"`
	UserID    uid.ID    `json:"-"`
	CreatedAt time.Time `json:"-"`
}

type Badges []*Badge

// fetchBadges retrives all the badges of users from DB and populates each users
// Badges field.
func fetchBadges(db *sql.DB, users ...*User) error {
	if len(users) == 0 {
		return nil
	}
	if len(users) > 1000 {
		log.Printf("Warning: fetching more than %d users badges at once\n", len(users))
	}

	userIDs := make([]any, len(users))
	m := make(map[uid.ID]*User)
	for i, user := range users {
		userIDs[i] = user.ID
		m[user.ID] = user
	}

	query := fmt.Sprintf(`
		SELECT	b.id, 
				b.type, 
				t.name,
				b.user_id, 
				b.created_at 
		FROM user_badges AS b 
		INNER JOIN badge_types AS t ON b.type = t.id 
		WHERE user_id IN %s`, msql.InClauseQuestionMarks(len(userIDs)))
	rows, err := db.Query(query, userIDs...)
	if err != nil {
		return err
	}
	defer rows.Close()

	badges := Badges{}
	for rows.Next() {
		b := &Badge{}
		rows.Scan(
			&b.ID,
			&b.Type,
			&b.TypeName,
			&b.UserID,
			&b.CreatedAt)
		badges = append(badges, b)
	}

	if err = rows.Err(); err != nil {
		return err
	}

	for _, b := range badges {
		user, ok := m[b.UserID]
		if !ok {
			return fmt.Errorf("fetching badges user (%v) not found for badge %s", b.UserID, b.TypeName)
		}
		user.Badges = append(user.Badges, b)
	}

	return nil
}

type adminsCacheStore struct {
	mu          sync.RWMutex // guards following
	admins      []uid.ID
	usernames   []string // of the admins
	lastFetched time.Time
}

func (ac *adminsCacheStore) isAdmin(db *sql.DB, user uid.ID) (bool, error) {
	ac.mu.RLock()
	shouldRefetch := false
	if time.Since(ac.lastFetched) > time.Minute*5 {
		shouldRefetch = true
	}
	ac.mu.RUnlock()

	if shouldRefetch {
		if err := ac.refresh(db); err != nil {
			return false, err
		}
	}

	ac.mu.RLock()
	defer ac.mu.RUnlock()
	return slices.Index(ac.admins, user) != -1, nil
}

func (ac *adminsCacheStore) refresh(db *sql.DB) error {
	rows, err := db.Query("select id, username from users where users.is_admin = true")
	if err != nil {
		return err
	}
	defer rows.Close()

	var admins []uid.ID
	var usernames []string
	for rows.Next() {
		var id uid.ID
		var username string
		if err = rows.Scan(&id, &username); err != nil {
			return err
		}
		admins = append(admins, id)
		usernames = append(usernames, username)
	}
	if err = rows.Err(); err != nil {
		return err
	}

	ac.mu.Lock()
	defer ac.mu.Unlock()

	ac.admins = admins
	ac.usernames = usernames
	ac.lastFetched = time.Now()
	return nil
}

var adminsCache = &adminsCacheStore{}

// IsAdmin reports whether user is an admin. User can be nil, in which case this
// function returns false.
func IsAdmin(db *sql.DB, user *uid.ID) (bool, error) {
	if user == nil {
		return false, nil
	}
	return adminsCache.isAdmin(db, *user)
}

// MakeAdmin makes the user an admin of the site. If isAdmin is false admin user
// is removed as an admin.
func MakeAdmin(ctx context.Context, db *sql.DB, user string, isAdmin bool) (*User, error) {
	u, err := GetUserByUsername(ctx, db, user, nil)
	if err != nil {
		return nil, err
	}
	if u.Deleted {
		return nil, ErrUserDeleted
	}

	if isAdmin {
		if u.Admin {
			return nil, httperr.NewBadRequest("already-admin", "User is already an admin.")
		}
	} else {
		if !u.Admin {
			return nil, httperr.NewBadRequest("already-not-admin", "User is already not an admin.")
		}
	}

	// Note: Duplicate the changes to the User.Delete function when making changes to this SQL query.
	if _, err = db.ExecContext(ctx, "UPDATE users SET is_admin = ? WHERE id = ?", isAdmin, u.ID); err != nil {
		return nil, err
	}

	if err := adminsCache.refresh(db); err != nil {
		fmt.Printf("Error refreshing admins list cache: %v", err)
	}

	u.Admin = isAdmin
	return u, nil
}

const (
	GhostUserUsername  = "ghost"
	NobodyUserUsername = "nobody"
)

// CreateGhostUser creates the ghost user, if the ghost user isn't already
// created. The ghost user is the user with the username ghost that takes, so to
// speak, the place of all deleted users.
//
// The returned bool indicates whether the call to this function created the
// ghost user (if the ghost user was already created, it will be false).
func CreateGhostUser(db *sql.DB) (bool, error) {
	var s string
	if err := db.QueryRow("SELECT username_lc FROM users WHERE username_lc = ?", GhostUserUsername).Scan(&s); err != nil {
		if err == sql.ErrNoRows {
			// Ghost user not found; create one.
			_, createErr := RegisterUser(context.Background(), db, GhostUserUsername, "", utils.GenerateStringID(48), "")
			return createErr == nil, createErr
		}
		return false, err
	}
	return false, nil
}

// CreateNobodyUser creates a user named nobody and makes that user an admin.
// This is an admin account reserved for programmatic admin actions.
func CreateNobodyUser(db *sql.DB) (bool, error) {
	var s string
	if dbErr := db.QueryRow("SELECT username_lc FROM users WHERE username_lc = ?", NobodyUserUsername).Scan(&s); dbErr != nil {
		if dbErr == sql.ErrNoRows {
			// Ghost user not found; create one.
			user, err := RegisterUser(context.Background(), db, NobodyUserUsername, "", utils.GenerateStringID(48), "")
			if err != nil {
				return false, err
			}

			user.About = msql.NewNullString("Not a human")
			user.Update(context.Background(), db)

			if _, err := MakeAdmin(context.Background(), db, user.Username, true); err != nil {
				return false, err
			}
			return true, nil
		}
		return false, dbErr
	}
	return false, nil
}

func CalcGhostUserID(user uid.ID, unique string) string {
	b := make([]byte, len(user)+len(unique))
	copy(b, user[:])
	copy(b[len(user):], []byte(unique))
	sum := sha1.Sum(b)
	return hex.EncodeToString(sum[:])[:8]
}

func UserDeleted(db *sql.DB, user uid.ID) (bool, error) {
	var deletedAt msql.NullTime
	if err := db.QueryRow("SELECT deleted_at FROM users WHERE id = ?", user).Scan(&deletedAt); err != nil {
		if err == sql.ErrNoRows {
			return false, errUserNotFound
		}
		return false, err
	}
	return deletedAt.Valid, nil
}

// UserMuted reports whether the user muted is muted by the user muter.
func UserMuted(ctx context.Context, db *sql.DB, muter, muted uid.ID) (bool, error) {
	var rowID int
	if err := db.QueryRow("SELECT id FROM muted_users WHERE user_id = ? AND muted_user_id = ?", muter, muted).Scan(&rowID); err != nil {
		if err == sql.ErrNoRows {
			return false, nil
		}
		return false, fmt.Errorf("UserMuted db error: %w", err)
	}
	return true, nil
}

func GetUsers(ctx context.Context, db *sql.DB, limit int, next *string, viewer *uid.ID) ([]*User, *string, error) {
	where, args := "", []any{}
	if next != nil {
		nextID, err := uid.FromString(*next)
		if err != nil {
			return nil, nil, errors.New("invalid next for site comments")
		}
		where = "WHERE users.id <= ? "
		args = append(args, nextID)
	}

	where += "ORDER BY users.id DESC LIMIT ?"
	args = append(args, limit+1)

	rows, err := db.QueryContext(ctx, buildSelectUserQuery(where), args...)
	if err != nil {
		return nil, nil, err
	}

	users, err := scanUsers(ctx, db, rows, viewer)
	if err != nil {
		return nil, nil, err
	}

	var nextNext *string
	if len(users) >= limit+1 {
		nextNext = new(string)
		*nextNext = users[limit].ID.String()
		users = users[:limit]
	}

	return users, nextNext, nil
}

func GetAllUserIDs(ctx context.Context, db *sql.DB, fetchDeleted, fetchBanned bool) ([]uid.ID, error) {
	var where string
	if !fetchDeleted {
		where = "WHERE deleted_at IS NULL "
	}
	if !fetchBanned {
		if where == "" {
			where = "WHERE "
		} else {
			where += "AND "
		}
		where += "banned_at IS NULL"
	}

	rows, err := db.QueryContext(ctx, fmt.Sprintf("SELECT id FROM users %s", where))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	ids := []uid.ID{}
	for rows.Next() {
		var id uid.ID
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return ids, nil
}
