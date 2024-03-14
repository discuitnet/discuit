package core

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/discuitnet/discuit/internal/httperr"
	msql "github.com/discuitnet/discuit/internal/sql"
	"github.com/discuitnet/discuit/internal/uid"
	"github.com/discuitnet/discuit/internal/utils"
)

// When referencing target_type column of posts_comments table.
const (
	postsCommentsTypePosts    = 0
	postsCommentsTypeComments = 1
)

// Comment is a comment of a post.
type Comment struct {
	db *sql.DB

	ID               uid.ID        `json:"id"`
	PostID           uid.ID        `json:"postId"`
	PostPublicID     string        `json:"postPublicId"`
	CommunityID      uid.ID        `json:"communityId"`
	CommunityName    string        `json:"communityName"`
	AuthorID         uid.ID        `json:"userId,omitempty"`
	AuthorUsername   string        `json:"username"`
	AuthorGhostID    string        `json:"userGhostId,omitempty"`
	PostedAs         UserGroup     `json:"userGroup"`
	AuthorDeleted    bool          `json:"userDeleted"`
	ParentID         uid.NullID    `json:"parentId"`
	Depth            int           `json:"depth"`
	NumReplies       int           `json:"noReplies"`
	NumRepliesDirect int           `json:"noRepliesDirect"`
	Ancestors        []uid.ID      `json:"ancestors"` // From root to parent.
	Body             string        `json:"body"`
	Upvotes          int           `json:"upvotes"`
	Downvotes        int           `json:"downvotes"`
	Points           int           `json:"-"`
	CreatedAt        time.Time     `json:"createdAt"`
	EditedAt         msql.NullTime `json:"editedAt"`

	// If the comment is deleted and the content of the comment (body, author,
	// etc) exists in the DB, and if ContentStripped is true, then those values
	// are stripped to default values in this struct.
	//
	// The JSON value is found only if the comment is deleted.
	ContentStripped *bool `json:"contentStripped,omitempty"`

	Deleted   bool          `json:"deleted"`
	DeletedAt msql.NullTime `json:"deletedAt"`
	DeletedBy uid.NullID    `json:"-"`
	DeletedAs UserGroup     `json:"deletedAs,omitempty"`

	Author *User `json:"author,omitempty"`

	// Reports whether the author of this comment is muted by the viewer.
	IsAuthorMuted bool `json:"isAuthorMuted,omitempty"`

	ViewerVoted   msql.NullBool `json:"userVoted"`
	ViewerVotedUp msql.NullBool `json:"userVotedUp"`

	PostTitle     string    `json:"postTitle,omitempty"`
	PostDeleted   bool      `json:"postDeleted"`
	PostDeletedAs UserGroup `json:"postDeletedAs,omitempty"`
}

func buildSelectCommentsQuery(loggedIn bool, where string) string {
	cols := []string{
		"comments.id",
		"comments.post_id",
		"comments.post_public_id",
		"comments.community_id",
		"comments.community_name",
		"comments.user_id",
		"comments.username",
		"comments.user_group",
		"comments.user_deleted",
		"comments.parent_id",
		"comments.depth",
		"comments.no_replies",
		"comments.no_replies_direct",
		"comments.ancestors",
		"comments.body",
		"comments.upvotes",
		"comments.downvotes",
		"comments.points",
		"comments.created_at",
		"comments.edited_at",
		"comments.deleted_at",
		"comments.deleted_as",
	}
	var joins []string
	if loggedIn {
		cols := append(cols, "comment_votes.id IS NOT NULL", "comment_votes.up")
		joins = []string{"LEFT OUTER JOIN comment_votes ON comments.id = comment_votes.comment_id AND comment_votes.user_id = ?"}
		return msql.BuildSelectQuery("comments", cols, joins, where)
	}
	return msql.BuildSelectQuery("comments", cols, joins, where)
}

// Get comment returns a comment. If viewer is nil, viewer related fields of the
// comment (like Comment.ViewerVoted) will be nil.
func GetComment(ctx context.Context, db *sql.DB, id uid.ID, viewer *uid.ID) (*Comment, error) {
	var (
		query = buildSelectCommentsQuery(viewer != nil, "WHERE comments.id = ?")
		rows  *sql.Rows
		err   error
	)
	if viewer == nil {
		rows, err = db.QueryContext(ctx, query, id)
	} else {
		rows, err = db.QueryContext(ctx, query, viewer, id)
	}
	if err != nil {
		return nil, err
	}

	comments, err := scanComments(ctx, db, rows, viewer)
	if err != nil {
		return nil, fmt.Errorf("scanComments (id: %v): %w", id, err)
	}

	if len(comments) == 0 {
		return nil, errCommentNotFound
	}
	return comments[0], err
}

func GetCommentsByIDs(ctx context.Context, db *sql.DB, viewer *uid.ID, ids ...uid.ID) ([]*Comment, error) {
	where := fmt.Sprintf("WHERE comments.id IN %s", msql.InClauseQuestionMarks(len(ids)))
	args := make([]any, len(ids))
	for i := range ids {
		args[i] = ids[i]
	}
	return getComments(ctx, db, viewer, where, args...)
}

func scanComments(ctx context.Context, db *sql.DB, rows *sql.Rows, viewer *uid.ID) ([]*Comment, error) {
	defer rows.Close()

	loggedIn := viewer != nil
	viewerAdmin, err := IsAdmin(db, viewer)
	if err != nil {
		return nil, err
	}

	var comments []*Comment
	for rows.Next() {
		comment := &Comment{db: db}
		var ancestors []byte
		dest := []interface{}{
			&comment.ID,
			&comment.PostID,
			&comment.PostPublicID,
			&comment.CommunityID,
			&comment.CommunityName,
			&comment.AuthorID,
			&comment.AuthorUsername,
			&comment.PostedAs,
			&comment.AuthorDeleted,
			&comment.ParentID,
			&comment.Depth,
			&comment.NumReplies,
			&comment.NumRepliesDirect,
			&ancestors,
			&comment.Body,
			&comment.Upvotes,
			&comment.Downvotes,
			&comment.Points,
			&comment.CreatedAt,
			&comment.EditedAt,
			&comment.DeletedAt,
			&comment.DeletedAs,
		}
		if loggedIn {
			dest = append(dest, &comment.ViewerVoted, &comment.ViewerVotedUp)
		}

		if err := rows.Scan(dest...); err != nil {
			return nil, err
		}

		comment.Deleted = comment.DeletedAt.Valid
		if comment.Deleted {
			comment.setStrippedContent(false)
		}

		if ancestors != nil {
			if err := json.Unmarshal(ancestors, &comment.Ancestors); err != nil {
				return nil, err
			}
		}

		comments = append(comments, comment)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(comments) == 0 {
		return nil, errCommentNotFound
	}

	if loggedIn {
		mutes, err := GetMutedUsers(ctx, db, *viewer, false)
		if err != nil {
			return nil, err
		}
		for _, comment := range comments {
			for _, mute := range mutes {
				if *mute.MutedUserID == comment.AuthorID {
					comment.IsAuthorMuted = true
					break
				}
			}
		}
	}

	if err := populateCommentAuthors(ctx, db, comments, viewerAdmin); err != nil {
		return nil, fmt.Errorf("failed to populate comments authors: %w", err)
	}

	// If a comment is deleted and the viewer doesn't have the privilege to see
	// it, strip the comment's values that relate to its author in any way.
	if viewer != nil {
		if !viewerAdmin {
			viewerModOf := make(map[uid.ID]bool) // keys are community ids
			for _, comment := range comments {
				if comment.Deleted && comment.DeletedAs == UserGroupMods {
					viewerMod, ok := viewerModOf[comment.CommunityID]
					if !ok {
						var err error
						viewerMod, err = UserMod(ctx, db, comment.CommunityID, *viewer)
						if err != nil {
							return nil, err
						}
						viewerModOf[comment.CommunityID] = viewerMod
					}
					if !viewerMod {
						comment.StripContent()
					}
				} else {
					comment.StripContent()
				}
			}
		}
	} else {
		for _, comment := range comments {
			comment.StripContent()
		}
	}

	// Strip deleted author information, unless the viewer is an admin.
	for _, comment := range comments {
		if comment.AuthorDeleted {
			comment.setGhostAuthorID()
			if !viewerAdmin {
				comment.StripAuthorInfo()
			}
		}
	}

	return comments, nil
}

// addComment adds a record to the comments table. It does not check if the post
// is deleted or locked.
func addComment(ctx context.Context, db *sql.DB, post *Post, author *User, parentID *uid.ID, commentBody string) (*Comment, error) {
	commentBody = utils.TruncateUnicodeString(commentBody, maxCommentBodyLength)
	var (
		parent    *Comment
		err       error
		ancestors []uid.ID
	)

	if parentID != nil {
		parent, err = GetComment(ctx, db, *parentID, nil)
		if err != nil {
			return nil, err
		}
		if parent.Deleted {
			return nil, httperr.NewBadRequest("comment-reply-to-deleted", "Cannot reply to a deleted comment.")
		}
		if parent.Depth == maxCommentDepth {
			return nil, httperr.NewBadRequest("comment-max-depth-reached", "Cannot reply because match depth is reached.")
		}
		ancestors = parent.Ancestors
		ancestors = append(ancestors, parent.ID)
	}

	id := uid.New()
	f := func(tx *sql.Tx) error {
		depth, newParentID := 0, uid.NullID{}
		if parent != nil {
			newParentID.Valid, newParentID.ID = true, parent.ID
			depth = parent.Depth + 1
		}
		var ancestorsJSON []byte
		if ancestors != nil {
			if ancestorsJSON, err = json.Marshal(ancestors); err != nil {
				return err
			}
		}
		now := time.Now()

		query := `	INSERT INTO comments (
						id, 
						post_id,
						post_public_id,
						community_id,
						user_id,
						username,
						parent_id,
						depth,
						no_replies,
						ancestors,
						body,
						created_at,
						community_name) 
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		args := []any{
			id,
			post.ID,
			post.PublicID,
			post.CommunityID,
			author.ID,
			author.Username,
			newParentID,
			depth,
			0,
			ancestorsJSON,
			commentBody,
			now,
			post.CommunityName,
		}
		if _, err = tx.ExecContext(ctx, query, args...); err != nil {
			return err
		}

		if _, err = tx.ExecContext(ctx, "UPDATE posts SET no_comments = no_comments + 1, last_activity_at = ? WHERE id = ?", now, post.ID); err != nil {
			return err
		}

		if parent != nil {
			if _, err = tx.ExecContext(ctx, "UPDATE comments SET no_replies_direct = no_replies_direct + 1 WHERE id = ?", parent.ID); err != nil {
				return err
			}
			qs := msql.InClauseQuestionMarks(len(ancestors))
			args := make([]any, len(ancestors))
			for i := range args {
				args[i] = ancestors[i]
			}
			if _, err := tx.ExecContext(ctx, fmt.Sprintf("UPDATE comments SET no_replies = no_replies + 1 WHERE id IN %s", qs), args...); err != nil {
				return err
			}
		}

		// For the user profile.
		if _, err := tx.ExecContext(ctx, "INSERT INTO posts_comments (target_id, user_id, target_type) VALUES (?, ?, ?)", id, author.ID, postsCommentsTypeComments); err != nil {
			return err
		}

		for _, v := range ancestors {
			if _, err := tx.ExecContext(ctx, "INSERT INTO comment_replies (parent_id, reply_id) VALUES (?, ?)", v, id); err != nil {
				return err
			}
		}

		if _, err := tx.ExecContext(ctx, "UPDATE users SET no_comments = no_comments + 1 WHERE id = ?", author.ID); err != nil {
			return err
		}

		return nil
	}

	if err := msql.Transact(ctx, db, f); err != nil {
		return nil, err
	}

	// Send notifications.
	if parent != nil && !parent.AuthorID.EqualsTo(author.ID) {
		go func() {
			if err := CreateCommentReplyNotification(context.Background(), db, parent.AuthorID, parent.ID, id, author.Username, post); err != nil {
				log.Printf("Create reply notification failed: %v\n", err)
			}
		}()

	}
	if !post.AuthorID.EqualsTo(author.ID) && (parent == nil || !(parent.AuthorID.EqualsTo(post.AuthorID))) {
		go func() {
			if err := CreateNewCommentNotification(context.Background(), db, post, id, author.Username); err != nil {
				log.Printf("Create new_comment notification failed: %v\n", err)
			}
		}()
	}

	return GetComment(ctx, db, id, nil)
}

// Save updates comment's body.
func (c *Comment) Save(ctx context.Context, user uid.ID) error {
	if c.Deleted {
		return errCommentDeleted
	}
	if !c.AuthorID.EqualsTo(user) {
		return errNotAuthor
	}

	c.Body = utils.TruncateUnicodeString(c.Body, maxCommentBodyLength)

	now := time.Now()
	query := "UPDATE comments SET body = ?, edited_at = ? WHERE id = ? AND deleted_at IS NULL"
	_, err := c.db.ExecContext(ctx, query, c.Body, now, c.ID)
	if err == nil {
		c.EditedAt.Valid = true
		c.EditedAt.Time = now
	}
	return err
}

// Delete returns an error if user, who's deleting the comment, has no
// permissions in his capacity as g to delete this comment.
func (c *Comment) Delete(ctx context.Context, user uid.ID, g UserGroup) error {
	if c.Deleted {
		return errCommentDeleted
	}

	switch g {
	case UserGroupNormal:
		if !c.AuthorID.EqualsTo(user) {
			return errNotAuthor
		}
	case UserGroupMods:
		is, err := UserMod(ctx, c.db, c.CommunityID, user)
		if err != nil {
			return err
		}
		if !is {
			return errNotMod
		}
	case UserGroupAdmins:
		u, err := GetUser(ctx, c.db, user, nil)
		if err != nil {
			return err
		}
		if !u.Admin {
			return errNotAdmin
		}
	default:
		return errInvalidUserGroup
	}

	now := time.Now()
	err := msql.Transact(ctx, c.db, func(tx *sql.Tx) error {
		var newBody string
		if g == UserGroupNormal {
			newBody = ""
		} else {
			newBody = c.Body
		}
		if _, err := tx.ExecContext(ctx, `UPDATE comments SET body = ?, deleted_at = ?, deleted_by = ?, deleted_as = ? WHERE id = ?`, newBody, now, user, g, c.ID); err != nil {
			return err
		}
		if g == UserGroupNormal {
			if _, err := tx.ExecContext(ctx, "DELETE FROM posts_comments WHERE target_id = ? AND user_id = ?", c.ID, c.AuthorID); err != nil {
				return err
			}
		} else {
			if _, err := tx.ExecContext(ctx, "UPDATE posts_comments SET deleted = true WHERE target_id = ? AND user_id = ?", c.ID, c.AuthorID); err != nil {
				return err
			}
		}
		if _, err := tx.ExecContext(ctx, "UPDATE users SET no_comments = no_comments - 1 WHERE id = ?", c.AuthorID); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return err
	}

	c.DeletedAt = msql.NewNullTime(now)
	c.DeletedBy = uid.NullID{Valid: true, ID: user}
	c.DeletedAs = g
	c.StripContent()
	RemoveAllReportsOfComment(ctx, c.db, c.ID)
	return err
}

func (c *Comment) setStrippedContent(v bool) {
	if c.ContentStripped == nil {
		c.ContentStripped = new(bool)
	}
	*c.ContentStripped = v
}

// StripAuthorInfo should be called if the author account of the comment is
// deleted and the viewer is not an admin.
func (c *Comment) StripAuthorInfo() {
	c.setGhostAuthorID()
	c.AuthorID.Clear()
	c.AuthorUsername = "ghost"
	// c.Author, if it's non-nil, should already be set to the ghost user.
}

func (c *Comment) setGhostAuthorID() {
	if c.AuthorGhostID == "" {
		c.AuthorGhostID = CalcGhostUserID(c.AuthorID, c.PostID.String())
	}
}

// StripContent strips all content of c that is either user generated or relates
// to a user.
func (c *Comment) StripContent() {
	if !c.Deleted {
		return
	}
	c.setStrippedContent(true)
	c.AuthorID.Clear()
	c.AuthorUsername = "[Hidden]"
	c.PostedAs = UserGroupNaN
	c.Body = "[Deleted comment]"
	c.ViewerVoted.Valid = false
	c.ViewerVotedUp.Valid = false
	c.Author = nil
}

// Vote votes on comment (if the comment is not deleted or the post locked).
func (c *Comment) Vote(ctx context.Context, user uid.ID, up bool) error {
	if c.Deleted {
		return errCommentDeleted
	}

	if is, err := IsPostLocked(ctx, c.db, c.PostID); err != nil {
		return err
	} else if is {
		return errPostLocked
	}

	point := 1
	err := msql.Transact(ctx, c.db, func(tx *sql.Tx) error {
		if _, err := tx.ExecContext(ctx, "INSERT INTO comment_votes (comment_id, user_id, up) VALUES (?, ?, ?)", c.ID, user, up); err != nil {
			if msql.IsErrDuplicateErr(err) {
				return httperr.NewBadRequest("already-voted", "You've already voted on the comment.")
			}
			return err
		}
		query := "UPDATE comments SET points = points + ?"
		if up {
			query += ", upvotes = upvotes + 1"
		} else {
			point = -1
			query += ", downvotes = downvotes + 1"
		}
		query += " WHERE id = ?"
		if _, err := tx.ExecContext(ctx, query, point, c.ID); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return err
	}

	if up {
		c.Upvotes++
	} else {
		c.Downvotes++
	}
	c.Points += point
	c.ViewerVoted = msql.NewNullBool(true)
	c.ViewerVotedUp.Valid = true
	c.ViewerVotedUp.Bool = up

	// Attempt to update user's points.
	if up && !c.AuthorID.EqualsTo(user) {
		incrementUserPoints(ctx, c.db, c.AuthorID, 1)
	}

	// Attempt to create a notification (only for upvotes).
	if !c.AuthorID.EqualsTo(user) && up {
		go func() {
			if err := CreateNewVotesNotification(context.Background(), c.db, c.AuthorID, c.CommunityName, false, c.ID); err != nil {
				log.Printf("Failed creating new_votes notification: %v\n", err)
			}
		}()
	}

	return nil
}

// DeleteVote returns an error is the comment is deleted or the post locked.
func (c *Comment) DeleteVote(ctx context.Context, user uid.ID) error {
	if c.Deleted {
		return errCommentDeleted
	}

	// Cannot vote if the post is locked.
	if is, err := IsPostLocked(ctx, c.db, c.PostID); err != nil {
		return err
	} else if is {
		return errPostLocked
	}

	id, up := 0, false
	row := c.db.QueryRowContext(ctx, "SELECT id, up FROM comment_votes WHERE comment_id = ? AND user_id = ?", c.ID, user)
	if err := row.Scan(&id, &up); err != nil {
		return err
	}

	point := 1
	err := msql.Transact(ctx, c.db, func(tx *sql.Tx) error {
		if _, err := tx.ExecContext(ctx, "DELETE FROM comment_votes WHERE id = ?", id); err != nil {
			return err
		}
		query := "UPDATE comments SET points = points + ?"
		if up {
			point = -1
			query += ", upvotes = upvotes - 1"
		} else {
			query += ", downvotes = downvotes - 1"
		}
		query += " WHERE id = ?"
		if _, err := tx.ExecContext(ctx, query, point, c.ID); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return err
	}

	if up {
		c.Upvotes--
	} else {
		c.Downvotes--
	}
	c.Points += point
	c.ViewerVoted.Valid = false
	c.ViewerVotedUp.Valid = false

	// Attempt to update user's points.
	if up && !c.AuthorID.EqualsTo(user) {
		incrementUserPoints(ctx, c.db, c.AuthorID, -1)
	}

	return nil
}

// ChangeVote returns an error is the comment is deleted or the post locked.
func (c *Comment) ChangeVote(ctx context.Context, user uid.ID, up bool) error {
	if c.Deleted {
		return errCommentDeleted
	}

	// Cannot vote if the post is locked.
	if is, err := IsPostLocked(ctx, c.db, c.PostID); err != nil {
		return err
	} else if is {
		return errPostLocked
	}

	id, dbUp := 0, false
	row := c.db.QueryRowContext(ctx, "SELECT id, up FROM comment_votes WHERE comment_id = ? AND user_id = ?", c.ID, user)
	if err := row.Scan(&id, &dbUp); err != nil {
		return err
	}

	if dbUp == up {
		return nil
	}

	points := 2
	err := msql.Transact(ctx, c.db, func(tx *sql.Tx) error {
		if _, err := tx.ExecContext(ctx, "UPDATE comment_votes SET up = ? WHERE id = ?", up, id); err != nil {
			return err
		}
		query := "UPDATE comments SET points = points + ?"
		if dbUp {
			points = -2
			query += ", upvotes = upvotes - 1, downvotes = downvotes + 1"
		} else {
			query += ", upvotes = upvotes + 1, downvotes = downvotes - 1"
		}
		query += " WHERE id = ?"
		if _, err := tx.ExecContext(ctx, query, points, c.ID); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return err
	}

	if dbUp {
		c.Upvotes--
		c.Downvotes++
	} else {
		c.Upvotes++
		c.Downvotes--
	}
	c.Points += points
	c.ViewerVotedUp = msql.NewNullBool(up)

	// Attemp to update user's points.
	if !c.AuthorID.EqualsTo(user) {
		points := 1
		if dbUp {
			points = -1
		}
		incrementUserPoints(ctx, c.db, c.AuthorID, points)
	}

	return nil
}

// ChangeUserGroup changes the capacity in which the comment's author added the
// post.
func (c *Comment) ChangeUserGroup(ctx context.Context, author uid.ID, g UserGroup) error {
	if !c.AuthorID.EqualsTo(author) {
		return errNotAuthor
	}

	if c.PostedAs == g {
		return nil
	}

	switch g {
	case UserGroupNormal:
	case UserGroupMods:
		is, err := UserMod(ctx, c.db, c.CommunityID, author)
		if err != nil {
			return err
		}
		if !is {
			return errNotMod
		}
	case UserGroupAdmins:
		u, err := GetUser(ctx, c.db, author, nil)
		if err != nil {
			return err
		}
		if !u.Admin {
			return errNotAdmin
		}
	default:
		return errInvalidUserGroup
	}

	_, err := c.db.ExecContext(ctx, "UPDATE comments SET user_group = ? WHERE id = ? AND deleted_at IS NULL", g, c.ID)
	if err == nil {
		c.PostedAs = g
	}
	return err
}

// loadPostDeleted populates c.PostDeleted.
func (c *Comment) loadPostDeleted(ctx context.Context) error {
	var at msql.NullTime
	row := c.db.QueryRowContext(ctx, "SELECT deleted_at, deleted_as FROM posts WHERE id = ?", c.PostID)
	err := row.Scan(&at, &c.PostDeletedAs)
	if err == nil && at.Valid {
		c.PostDeleted = true
	}
	return err
}

// populateCommentAuthors populates the Author field of each comment of comments
// (except for deleted comments).
func populateCommentAuthors(ctx context.Context, db *sql.DB, comments []*Comment, viewerAdmin bool) error {
	var authorIDs []uid.ID
	found := make(map[uid.ID]bool)
	for _, comment := range comments {
		if !found[comment.AuthorID] {
			authorIDs = append(authorIDs, comment.AuthorID)
			found[comment.AuthorID] = true
		}
	}

	if len(authorIDs) == 0 {
		return nil
	}

	authors, err := GetUsersByIDs(ctx, db, authorIDs, nil)
	if err != nil {
		return err
	}

	if !viewerAdmin {
		// If the author account is deleted, some of it's values are set to
		// ghost values, including the ID of the author. Undo this so that the
		// authors can be matched with the comments.
		for _, author := range authors {
			author.UnsetToGhost()
		}
	}

	for _, comment := range comments {
		found := true
		for _, author := range authors {
			if comment.AuthorID == author.ID {
				comment.Author = author
				break
			}
		}
		if !found {
			panic("author not found")
		}

	}

	if !viewerAdmin {
		// Reset deleted authors to ghosts.
		for _, author := range authors {
			author.SetToGhost()
		}
	}

	return nil
}
