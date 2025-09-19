package core

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/discuitnet/discuit/internal/httperr"
	"github.com/discuitnet/discuit/internal/httputil"
	"github.com/discuitnet/discuit/internal/images"
	msql "github.com/discuitnet/discuit/internal/sql"
	"github.com/discuitnet/discuit/internal/uid"
	"github.com/discuitnet/discuit/internal/utils"
	"golang.org/x/exp/slices"
)

const (
	publicPostIDLength   = 8
	maxPostBodyLength    = 20000 // in runes.
	maxPostTitleLength   = 255   // in runes.
	maxPostLinkLength    = 2048  // in bytes
	maxCommentDepth      = 15
	maxCommentBodyLength = maxPostBodyLength
	commentsFetchLimit   = 500
)

// PostType represents the type of a post.
type PostType int

// These are all the valid PostTypes.
const (
	PostTypeText = PostType(iota)
	PostTypeImage
	PostTypeLink
)

// Valid reports whether t is a valid PostType.
func (t PostType) Valid() bool {
	_, err := t.MarshalText()
	return err == nil
}

// MarshalText implements encoding.TextMarshaler interface.
func (t PostType) MarshalText() ([]byte, error) {
	s := ""
	switch t {
	case PostTypeText:
		s = "text"
	case PostTypeImage:
		s = "image"
	case PostTypeLink:
		s = "link"
	default:
		return nil, errPostTypeUnsupported
	}
	return []byte(s), nil
}

// UnmarshalText implements encoding.TextUnmarshaler interface.
func (p *PostType) UnmarshalText(text []byte) error {
	switch string(text) {
	case "text":
		*p = PostTypeText
	case "image":
		*p = PostTypeImage
	case "link":
		*p = PostTypeLink
	default:
		return errPostTypeUnsupported
	}
	return nil
}

type Post struct {
	ID   uid.ID   `json:"id"`
	Type PostType `json:"type"`

	// ID as it appears in the URL.
	PublicID string `json:"publicId"`

	AuthorID       uid.ID `json:"userId"`
	AuthorUsername string `json:"username"`
	AuthorGhostID  string `json:"userGhostId,omitempty"`

	// In which capacity (as mod, admin, or normal user) the post was posted in.
	PostedAs UserGroup `json:"userGroup"`

	// Indicates Whether the account of the user who posted the post is deleted.
	AuthorDeleted bool `json:"userDeleted"`

	// Indicates whether the post is pinned to the community.
	Pinned bool `json:"isPinned"`

	// Indicates whether the post is pinned site-wide.
	PinnedSite bool `json:"isPinnedSite"`

	CommunityID          uid.ID        `json:"communityId"`
	CommunityName        string        `json:"communityName"`
	CommunityProPic      *images.Image `json:"communityProPic"`
	CommunityBannerImage *images.Image `json:"communityBannerImage"`

	Title string          `json:"title"`
	Body  msql.NullString `json:"body"`

	Image  *images.Image   `json:"image"`  // even if the post type is [PostTypeImage], this may be nil
	Images []*images.Image `json:"images"` // even if the post type is [PostTypeImage], this may be nil

	link *postLink `json:"-"` // what's saved to the DB

	Link *PostLink `json:"link,omitempty"` // what's sent to the client

	Locked   bool       `json:"locked"`
	LockedBy uid.NullID `json:"lockedBy"`

	// In what capacity (as owner, admin, or mod) the post was locked.
	LockedAs UserGroup `json:"lockedByGroup,omitempty"`

	LockedAt msql.NullTime `json:"lockedAt"`

	Upvotes   int `json:"upvotes"`
	Downvotes int `json:"downvotes"`
	Points    int `json:"-"` // Upvotes - Downvotes

	Hotness        int           `json:"hotness"`
	CreatedAt      time.Time     `json:"createdAt"`
	EditedAt       msql.NullTime `json:"editedAt"`
	LastActivityAt time.Time     `json:"lastActivityAt"`
	Deleted        bool          `json:"deleted"`
	DeletedAt      msql.NullTime `json:"deletedAt,omitempty"`
	DeletedBy      uid.NullID    `json:"-"`

	// In what capacity (as owner, admin, or mod) the post was deleted.
	DeletedAs UserGroup `json:"deletedAs,omitempty"`

	// If true, all links and images contained in the post is deleted.
	DeletedContent bool `json:"deletedContent"`

	DeletedContentAt msql.NullTime `json:"-"`
	DeletedContentBy uid.NullID    `json:"-"`
	DeletedContentAs UserGroup     `json:"deletedContentAs,omitempty"`

	NumComments  int             `json:"noComments"`
	Comments     []*Comment      `json:"comments"`
	CommentsNext msql.NullString `json:"commentsNext"` // pagination cursor

	// Whether the logged in user have voted on this post.
	ViewerVoted msql.NullBool `json:"userVoted"`

	// Whether the logged in user have voted up.
	ViewerVotedUp msql.NullBool `json:"userVotedUp"`

	// The logged in user's last visit to the post.
	ViewerLastVisit msql.NullTime `json:"lastVisitAt"`
	// Number of new comments in post according to logged in user's last visit.
	ViewerNewComments int `json:"newComments"`

	AuthorMutedByViewer    bool `json:"isAuthorMuted"`
	CommunityMutedByViewer bool `json:"isCommunityMuted"`

	Community *Community `json:"community,omitempty"`
	Author    *User      `json:"author,omitempty"`
}

var selectPostCols = []string{
	"posts.id",
	"posts.type",
	"posts.public_id",
	"posts.user_id",
	"users.username",
	"posts.user_group",
	"users.deleted_at is not null",
	"posts.community_id",
	"communities.name",
	"posts.title",
	"posts.body",
	"posts.link_info",
	"posts.locked",
	"posts.locked_at",
	"posts.locked_by",
	"posts.locked_by_group",
	"posts.is_pinned",
	"posts.is_pinned_site",
	"posts.upvotes",
	"posts.downvotes",
	"posts.points",
	"posts.hotness",
	"posts.created_at",
	"posts.edited_at",
	"posts.last_activity_at",
	"posts.deleted",
	"posts.deleted_at",
	"posts.deleted_by",
	"posts.deleted_as",
	"posts.no_comments",
	"posts.deleted_content",
	"posts.deleted_content_at",
	"posts.deleted_content_by",
	"posts.deleted_content_as",
}

var selectPostJoins = []string{
	"STRAIGHT_JOIN communities ON posts.community_id = communities.id",
	"INNER JOIN users ON posts.user_id = users.id",
}

func init() {
	selectPostCols = append(selectPostCols, images.ImageColumns("link_image")...)
	selectPostCols = append(selectPostCols, images.ImageColumns("comm_pro_pic")...)
	selectPostCols = append(selectPostCols, images.ImageColumns("comm_banner")...)
	selectPostJoins = append(selectPostJoins, "LEFT JOIN images AS link_image ON link_image.id = posts.link_image")
	selectPostJoins = append(selectPostJoins, "LEFT JOIN images AS comm_pro_pic ON comm_pro_pic.id = communities.pro_pic_2")
	selectPostJoins = append(selectPostJoins, "LEFT JOIN images AS comm_banner ON comm_banner.id = communities.banner_image_2")
}

func buildSelectPostQuery(loggedIn bool, where string) string {
	if loggedIn {
		joins := append(selectPostJoins,
			"LEFT OUTER JOIN post_votes ON posts.id = post_votes.post_id AND post_votes.user_id = ?",
			"LEFT OUTER JOIN post_visits ON posts.id = post_visits.post_id AND post_visits.user_id = ?")
		cols := append(selectPostCols, "post_votes.id IS NOT NULL", "post_votes.up", "post_visits.last_visited_at", "0") // select 0 as newComments--to be populated after
		return msql.BuildSelectQuery("posts", cols, joins, where)
	}
	return msql.BuildSelectQuery("posts", selectPostCols, selectPostJoins, where)
}

// GetPost returns a post using publicID, if publicID is not an empty string,
// or using postID.
func GetPost(ctx context.Context, db *sql.DB, postID *uid.ID, publicID string, viewer *uid.ID, getDeleted bool) (*Post, error) {
	loggedIn := viewer != nil

	where := "WHERE "
	if publicID != "" {
		where += "posts.public_id"
	} else {
		where += "posts.id"
	}
	where += " = ?"
	if !getDeleted {
		where += " AND posts.deleted_at IS NULL"
	}

	query, args := buildSelectPostQuery(loggedIn, where), []any{}
	if loggedIn {
		args = append(args, viewer, viewer)
	}
	if postID != nil {
		args = append(args, postID)
	} else {
		args = append(args, publicID)
	}

	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("db error on query '%s' with args (%v)", query, args)
	}

	posts, err := scanPosts(ctx, db, rows, viewer)
	if err != nil {
		return nil, err
	}
	return posts[0], err
}

func GetPostsByIDs(ctx context.Context, db *sql.DB, viewer *uid.ID, includeDeleted bool, ids ...uid.ID) ([]*Post, error) {
	if len(ids) == 0 {
		return nil, nil
	}

	loggedIn := viewer != nil

	where := fmt.Sprintf("WHERE posts.id IN %s", msql.InClauseQuestionMarks(len(ids)))
	if !includeDeleted {
		where += " AND posts.deleted_at IS NULL"
	}

	var (
		query = buildSelectPostQuery(loggedIn, where)
		args  = []any{}
	)
	if loggedIn {
		args = append(args, viewer, viewer)
	}
	for _, id := range ids {
		args = append(args, id)
	}

	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("db error on query '%s' with args (%v)", query, args)
	}

	return scanPosts(ctx, db, rows, viewer)
}

// scanPosts returns errPostNotFound is no posts are found.
func scanPosts(ctx context.Context, db *sql.DB, rows *sql.Rows, viewer *uid.ID) ([]*Post, error) {
	defer rows.Close()

	var posts []*Post
	loggedIn := viewer != nil

	for rows.Next() {
		post := &Post{
			Images: make([]*images.Image, 0),
		}
		var linkBytes []byte
		dest := []interface{}{
			&post.ID,
			&post.Type,
			&post.PublicID,
			&post.AuthorID,
			&post.AuthorUsername,
			&post.PostedAs,
			&post.AuthorDeleted,
			&post.CommunityID,
			&post.CommunityName,
			&post.Title,
			&post.Body,
			&linkBytes,
			&post.Locked,
			&post.LockedAt,
			&post.LockedBy,
			&post.LockedAs,
			&post.Pinned,
			&post.PinnedSite,
			&post.Upvotes,
			&post.Downvotes,
			&post.Points,
			&post.Hotness,
			&post.CreatedAt,
			&post.EditedAt,
			&post.LastActivityAt,
			&post.Deleted,
			&post.DeletedAt,
			&post.DeletedBy,
			&post.DeletedAs,
			&post.NumComments,
			&post.DeletedContent,
			&post.DeletedContentAt,
			&post.DeletedContentBy,
			&post.DeletedContentAs,
		}

		linkImage := &images.Image{}
		proPic := &images.Image{}
		bannerImage := &images.Image{}
		dest = append(dest, linkImage.ScanDestinations()...)
		dest = append(dest, proPic.ScanDestinations()...)
		dest = append(dest, bannerImage.ScanDestinations()...)
		if loggedIn {
			dest = append(dest, &post.ViewerVoted, &post.ViewerVotedUp, &post.ViewerLastVisit, &post.ViewerNewComments)
		}

		if err := rows.Scan(dest...); err != nil {
			return nil, fmt.Errorf("scanning post rows.Scan: %w", err)
		}

		if proPic.ID != nil {
			proPic.PostScan()
			setCommunityProPicCopies(proPic)
			post.CommunityProPic = proPic
		}
		if bannerImage.ID != nil {
			bannerImage.PostScan()
			setCommunityBannerCopies(bannerImage)
			post.CommunityBannerImage = bannerImage
		}
		if linkBytes != nil {
			dbLink := &postLink{}
			if err := json.Unmarshal(linkBytes, dbLink); err != nil {
				return nil, fmt.Errorf("unmarshaling linkBytes: %w", err)
			}
			link := dbLink.PostLink()
			if linkImage.ID != nil {
				link.Image = linkImage
			}
			post.link = dbLink
			post.Link = link
			post.Link.SetImageCopies()
		}

		posts = append(posts, post)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("scanning post rows.Err: %w", err)
	}
	if len(posts) == 0 {
		return nil, errPostNotFound
	}

	if viewer != nil {
		userMutes, err := GetMutedUsers(ctx, db, *viewer, false)
		if err != nil {
			return nil, err
		}
		commMutes, err := GetMutedCommunities(ctx, db, *viewer, false)
		if err != nil {
			return nil, err
		}
		for _, post := range posts {
			for _, mute := range userMutes {
				if *mute.MutedUserID == post.AuthorID {
					post.AuthorMutedByViewer = true
					break
				}
			}
			for _, mute := range commMutes {
				if *mute.MutedCommunityID == post.CommunityID {
					post.CommunityMutedByViewer = true
				}
			}
		}
	}

	if err := populatePostsImages(ctx, db, posts); err != nil {
		return nil, err
	}

	if loggedIn {
		if err := populateNewCommentsCounts(ctx, db, posts, viewer); err != nil {
			return nil, err
		}
	}

	viewerAdmin, err := IsAdmin(db, viewer)
	if err != nil {
		return nil, err
	}

	if err := populatePostAuthors(ctx, db, posts, viewerAdmin); err != nil {
		return nil, fmt.Errorf("failed to populate post authors: %w", err)
	}

	for _, post := range posts {
		if post.DeletedContent {
			post.Link = nil
			post.Image = nil
			if post.Body.Valid {
				post.Body.String = "" // Should be empty in the DB as well.
			}
		}
		if post.AuthorDeleted {
			post.setGhostAuthorID()
			if !viewerAdmin {
				post.StripAuthorInfo()
			}
		}
	}

	return posts, nil
}

func populatePostAuthors(ctx context.Context, db *sql.DB, posts []*Post, viewerAdmin bool) error {
	var authorIDs []uid.ID
	found := make(map[uid.ID]bool)
	for _, c := range posts {
		if !found[c.AuthorID] {
			authorIDs = append(authorIDs, c.AuthorID)
			found[c.AuthorID] = true
		}
	}

	authors, err := GetUsersByIDs(ctx, db, authorIDs, nil)
	if err != nil {
		return err
	}

	if !viewerAdmin {
		for _, author := range authors {
			author.UnsetToGhost()
		}
	}

	for _, post := range posts {
		for _, author := range authors {
			if post.AuthorID == author.ID {
				post.Author = author
				break
			}
		}
	}

	if !viewerAdmin {
		for _, author := range authors {
			author.SetToGhost()
		}
	}

	return nil
}

// populatePostsImages goes through posts and fetches the images of the posts
// and sets posts[i].Image to a non-nil value (except for content deleted
// posts). Not all items in posts have to be image posts.
func populatePostsImages(ctx context.Context, db *sql.DB, posts []*Post) error {
	imagePosts := []*Post{}
	for _, post := range posts {
		if post.Type == PostTypeImage && !post.DeletedContent {
			// Exclude posts whose content is deleted, also.
			imagePosts = append(imagePosts, post)
		}
	}
	if len(imagePosts) == 0 {
		return nil
	}

	cols := images.ImageRecordColumns()
	cols = append(cols, "post_images.post_id")
	query := msql.BuildSelectQuery("post_images", cols, []string{
		"INNER JOIN images ON images.id = post_images.image_id",
	}, "WHERE post_id IN "+msql.InClauseQuestionMarks(len(imagePosts)))

	args := make([]any, len(imagePosts))
	for i := range imagePosts {
		args[i] = imagePosts[i].ID
	}

	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		record, postID := &images.ImageRecord{}, uid.ID{}
		dest := record.ScanDestinations()
		dest = append(dest, &postID)
		if err = rows.Scan(dest...); err != nil {
			return err
		}

		for _, post := range imagePosts {
			if post.ID == postID {
				img := record.Image()
				img.PostScan()
				img.AppendCopy("tiny", 120, 120, images.ImageFitCover, "")
				img.AppendCopy("small", 325, 250, images.ImageFitCover, "")
				img.AppendCopy("medium", 720, 1440, images.ImageFitContain, "")
				img.AppendCopy("large", 1080, 2160, images.ImageFitContain, "")
				img.AppendCopy("huge", 2160, 4320, images.ImageFitContain, "")
				if post.Image == nil {
					post.Image = img
				}
				post.Images = append(post.Images, img)
				break
			}
		}
	}

	if err = rows.Err(); err != nil {
		return err
	}
	return nil
}

// populateNewCommentsCounts goes through posts and fetches the number of new comments of the posts
// and sets posts[i].ViewerNewComments to a non-negative integer. Not-logged-in users/posts without comments
// will retain initialized 0.
func populateNewCommentsCounts(ctx context.Context, db *sql.DB, posts []*Post, viewer *uid.ID) error {
	/*	select post_id, count(*)
		from comments
		where user_id != ? and ( (post_id = ? and created_at > ? and deleted_at IS MISSING) or (...) ... )
		group by post_id*/
	if len(posts) == 0 || viewer == nil {
		return nil
	}

	args := make([]any, 1+2*len(posts))
	args[0] = viewer
	cols := []string{"post_id", "count(*)"}
	where := ""

	for i, post := range posts {
		args[1+2*i] = post.ID
		args[2+2*i] = post.ViewerLastVisit
		if where == "" {
			where += "WHERE user_id != ? AND ( (post_id = ? AND created_at >= ? AND deleted_at IS NULL)"
		} else {
			where += " OR (post_id = ? AND created_at >= ? AND deleted_at IS NULL)"
		}
	}
	where += " )" // close final ( () or () or ... () )
	where += " GROUP BY post_id"
	query := msql.BuildSelectQuery("comments", cols, []string{}, where)

	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		newComments, postID := 0, uid.ID{}
		if err = rows.Scan(&postID, &newComments); err != nil {
			return err
		}
		for _, post := range posts {
			if post.ID == postID {
				post.ViewerNewComments = newComments
				break
			}
		}
	}

	if err = rows.Err(); err != nil {
		return err
	}
	return nil
}

// validatePost always returns an httperr.Error on error.
func validatePost(title, body string) error {
	if len(title) < 3 {
		return httperr.NewBadRequest("post/title-too-short", "Title too short.")
	}
	return nil
}

var (
	postsTables         = []string{"posts_today", "posts_week", "posts_month", "posts_year"}
	postsTablesValidity = []time.Duration{0 - time.Hour*24, 0 - time.Hour*24*7, 0 - time.Hour*24*30, 0 - time.Hour*24*365}
)

type ImageUpload struct {
	ImageID uid.ID `json:"imageId"`
	Caption string `json:"caption"`
}

type createPostOpts struct {
	// Required:
	author    uid.ID
	community uid.ID
	postType  PostType
	title     string

	// Optional, depending on post type:
	body      string // for text posts
	link      postLink
	linkImage []byte // for link posts (thumbnail image)
	// image     uid.ID // for image posts
	images []*ImageUpload // for image posts
}

func createPost(ctx context.Context, db *sql.DB, opts *createPostOpts) (*Post, error) {
	if err := validatePost(opts.title, opts.body); err != nil {
		return nil, err
	}

	community, err := GetCommunityByID(ctx, db, opts.community, nil)
	if err != nil {
		return nil, err
	}

	// Check if the author is banned from community.
	if is, err := community.UserBanned(ctx, db, opts.author); err != nil {
		return nil, err
	} else if is {
		return nil, errUserBannedFromCommunity
	}

	// Check if posting in the community is restricted, and if so, if the user has permission.
	if community.PostingRestricted {
		if is, err := community.UserModOrAdmin(ctx, db, opts.author); err != nil {
			return nil, err
		} else if !is {
			return nil, httperr.NewForbidden("posting-restricted", "Posting in this community is restricted.")
		}
	}

	// Truncate title and body if max lengths are exceeded.
	var post Post
	post.Title = opts.title
	post.Body.Valid, post.Body.String = opts.body != "", opts.body
	post.truncateTitleAndBody()
	post.CreatedAt = time.Now()
	post.ID = uid.New()
	post.PublicID = utils.GenerateStringID(publicPostIDLength)

	cols := []msql.ColumnValue{
		{Name: "id", Value: post.ID},
		{Name: "type", Value: opts.postType},
		{Name: "public_id", Value: post.PublicID},
		{Name: "user_id", Value: opts.author},
		{Name: "community_id", Value: opts.community},
		{Name: "title", Value: post.Title},
		{Name: "body", Value: post.Body},
		{Name: "created_at", Value: post.CreatedAt},
		{Name: "hotness", Value: PostHotness(0, 0, post.CreatedAt)},
	}

	if opts.postType == PostTypeLink {
		data, err := json.Marshal(opts.link)
		if err != nil {
			return nil, err
		}
		cols = append(cols, msql.ColumnValue{Name: "link_info", Value: data})
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}

	if opts.postType == PostTypeLink && opts.linkImage != nil {
		// Save link post thumbnail.
		imageID, err := images.SaveImageTx(ctx, tx, "disk", opts.linkImage, &images.ImageOptions{
			Width:  1280,
			Height: 720,
			Format: images.ImageFormatJPEG,
			Fit:    images.ImageFitCover,
		})
		if err != nil {
			log.Printf("could not save the og:image of post %s with link %s\n", post.ID, opts.link.URL)
			// Continue on error...
		} else {
			cols = append(cols, msql.ColumnValue{Name: "link_image", Value: imageID})
		}
	}

	query, args := msql.BuildInsertQuery("posts", cols)
	if _, err = tx.ExecContext(ctx, query, args...); err != nil {
		tx.Rollback()
		return nil, err
	}

	if opts.postType == PostTypeImage {
		// Insert the rows into post_images table.
		var rows [][]msql.ColumnValue
		for _, image := range opts.images {
			row := []msql.ColumnValue{
				{Name: "post_id", Value: post.ID},
				{Name: "image_id", Value: image.ImageID},
			}
			rows = append(rows, row)
		}

		query, args := msql.BuildInsertQuery("post_images", rows...)
		if _, err = tx.ExecContext(ctx, query, args...); err != nil {
			tx.Rollback()
			return nil, err
		}

		// Delete rows from the temp_images table.
		imageIDs := make([]any, len(opts.images))
		for i := range opts.images {
			imageIDs[i] = opts.images[i].ImageID
		}
		if _, err = tx.ExecContext(ctx, fmt.Sprintf("DELETE FROM temp_images WHERE image_id IN %s", msql.InClauseQuestionMarks(len(opts.images))), imageIDs...); err != nil {
			tx.Rollback()
			return nil, err
		}
	}

	for _, table := range postsTables {
		if _, err := tx.ExecContext(ctx, fmt.Sprintf("INSERT INTO %s (community_id, post_id, user_id, created_at) VALUES (?, ?, ?, ?)", table),
			opts.community, post.ID, opts.author, post.CreatedAt); err != nil {
			tx.Rollback()
			return nil, err
		}
	}

	// For the user profile page.
	if _, err := tx.ExecContext(ctx, "INSERT INTO posts_comments (target_id, user_id, target_type) VALUES (?, ?, ?)",
		post.ID, opts.author, ContentTypePost); err != nil {
		tx.Rollback()
		return nil, err
	}

	if _, err := tx.ExecContext(ctx, "UPDATE users SET no_posts = no_posts + 1 WHERE id = ?", opts.author); err != nil {
		tx.Rollback()
		return nil, err
	}

	if _, err := tx.ExecContext(ctx, "UPDATE communities SET posts_count = posts_count + 1 WHERE id = ?", opts.community); err != nil {
		tx.Rollback()
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}

	return GetPost(ctx, db, &post.ID, "", nil, false)
}

func CreateTextPost(ctx context.Context, db *sql.DB, author, community uid.ID, title string, body string) (*Post, error) {
	return createPost(ctx, db, &createPostOpts{
		postType:  PostTypeText,
		author:    author,
		community: community,
		title:     title,
		body:      body,
	})
}

func CreateImagePost(ctx context.Context, db *sql.DB, author, community uid.ID, title string, imgs []*ImageUpload) (*Post, error) {
	// We don't check whether the image belongs to the person who uploaded it.
	// This is not a big deal as image ids are hard to guess.

	// Check if the images exist.
	recordIDs := make([]uid.ID, len(imgs))
	for i := range imgs {
		recordIDs[i] = imgs[i].ImageID
	}
	if _, err := images.GetImageRecords(ctx, db, recordIDs...); err != nil {
		if err == images.ErrImageNotFound {
			return nil, errImageNotFound
		}
		return nil, err
	}

	return createPost(ctx, db, &createPostOpts{
		postType:  PostTypeImage,
		author:    author,
		community: community,
		title:     title,
		images:    imgs,
	})
}

// getLinkPostImage returns the og:image of the url or, if no og:image can be
// found and the url is itself is an image, then that image. If no image is
// found in either case, it returns nil.
func getLinkPostImage(u *url.URL) []byte {
	fullURL := u.String()
	res, err := httputil.Get(fullURL)
	if err != nil {
		return nil
	}
	defer res.Body.Close()

	imageURL, err := httputil.ExtractOpenGraphImage(res.Body)
	if err != nil {
		log.Printf("error extracting the og:image tag of url: %v\n", u)
		return nil
	}
	if imageURL == "" {
		// Since og:image is not found, see if the link itself is an image.
		probablyAnImage := slices.Contains([]string{"image/jpeg", "image/png", "image/webp"}, res.Header.Get("Content-Type"))
		if !probablyAnImage {
			exts := []string{".jpg", ".jpeg", ".png", ".webp"}
			for _, v := range exts {
				if strings.HasSuffix(u.Path, v) {
					probablyAnImage = true
					break
				}
			}
		}
		if probablyAnImage {
			imageURL = fullURL
		}
	}
	if imageURL != "" {
		res, err := httputil.Get(imageURL)
		if err != nil {
			return nil
		}
		defer res.Body.Close()
		if res.StatusCode < 200 || res.StatusCode > 299 {
			return nil
		}
		image, err := io.ReadAll(res.Body)
		if err != nil {
			return nil
		}
		if len(image) == 0 {
			return nil
		}
		return image
	}

	return nil
}

func CreateLinkPost(ctx context.Context, db *sql.DB, author, community uid.ID, title string, link string) (*Post, error) {
	errInvalidURL := httperr.NewBadRequest("invalid-url", "Invalid URL.")
	if len(link) > maxPostLinkLength {
		link = link[:maxPostLinkLength]
	}

	u, err := url.Parse(link)
	if err != nil {
		return nil, errInvalidURL
	}
	if !u.IsAbs() {
		u.Scheme = "http"
	}
	if u.Hostname() == "" {
		return nil, errInvalidURL
	}

	return createPost(ctx, db, &createPostOpts{
		postType:  PostTypeLink,
		author:    author,
		community: community,
		title:     title,
		linkImage: getLinkPostImage(u),
		link: postLink{
			Version:  1,
			URL:      u.String(),
			Hostname: u.Hostname(),
		},
	})
}

func (p *Post) truncateTitleAndBody() {
	p.Title = utils.TruncateUnicodeString(p.Title, maxPostTitleLength)
	p.Body.String = utils.TruncateUnicodeString(p.Body.String, maxPostBodyLength)
}

func (p *Post) HasLinkImage() bool {
	return p.Link != nil && p.Link.Image != nil && p.Link.Image.ID != nil
}

// Save updates the post's updatable fields.
func (p *Post) Save(ctx context.Context, db *sql.DB, user uid.ID) error {
	if !p.AuthorID.EqualsTo(user) {
		return errNotAuthor
	}

	if err := validatePost(p.Title, p.Body.String); err != nil {
		return err
	}

	p.truncateTitleAndBody()

	now := time.Now()
	var args []any
	query := "UPDATE posts SET title = ?"
	args = append(args, p.Title)
	if p.Type == PostTypeText && !p.DeletedContent {
		query += ", body = ?"
		args = append(args, p.Body)
	}
	query += ", edited_at = ? WHERE id = ?"
	args = append(args, now, p.ID)

	_, err := db.ExecContext(ctx, query, args...)
	if err == nil {
		p.EditedAt.Valid = true
		p.EditedAt.Time = now
	}
	return err
}

// StripAuthorInfo should be called if the author account of the post is deleted
// and the viewer is not an admin.
func (p *Post) StripAuthorInfo() {
	p.setGhostAuthorID()
	p.AuthorID.Clear()
	p.AuthorUsername = "ghost"
	if p.Author != nil && !p.Author.IsGhost() {
		p.Author.SetToGhost()
	}
}

func (p *Post) setGhostAuthorID() {
	if p.AuthorGhostID == "" {
		p.AuthorGhostID = CalcGhostUserID(p.AuthorID, p.ID.String())
	}
}

// Delete deletes p on behalf of user, who's deleting the post in his capacity
// as g. In case the post is deleted by an admin or a mod, a notification is
// sent to the original poster.
func (p *Post) Delete(ctx context.Context, db *sql.DB, user uid.ID, g UserGroup, deleteContent bool, sendNotif bool) error {
	if p.Deleted && !(deleteContent && !p.DeletedContent) {
		return &httperr.Error{
			HTTPStatus: http.StatusConflict,
			Code:       "already-deleted",
			Message:    "Post is already deleted.",
		}
	}

	if deleteContent && !(g == UserGroupNormal || g == UserGroupAdmins) {
		return httperr.NewForbidden("mod-cannot-delete-content", "Moderators cannot delete the content of a post. They can only delete a post from their community.")
	}

	switch g {
	case UserGroupNormal:
		if !p.AuthorID.EqualsTo(user) {
			return errNotAuthor
		}
	case UserGroupMods:
		is, err := UserMod(ctx, db, p.CommunityID, user)
		if err != nil {
			return err
		}
		if !is {
			return errNotMod
		}
	case UserGroupAdmins:
		user, err := GetUser(ctx, db, user, nil)
		if err != nil {
			return err
		}
		if !user.Admin {
			return errNotAdmin
		}
	default:
		return errInvalidUserGroup
	}

	// Unpin all pins of this post:
	if err := p.Pin(ctx, db, user, true, true, true); err != nil { // unpin site-wide pin
		return err
	}
	if err := p.Pin(ctx, db, user, false, true, true); err != nil { // unpin community pin
		return err
	}

	now := time.Now()
	err := msql.Transact(ctx, db, func(tx *sql.Tx) (err error) {
		if !deleteContent || (deleteContent && !p.Deleted) {
			q := "UPDATE posts SET deleted = ?, deleted_at = ?, deleted_by = ?, deleted_as = ? WHERE id = ?"
			if _, err := tx.ExecContext(ctx, q, true, now, user, g, p.ID); err != nil {
				return err
			}
		}

		if deleteContent {
			var setBody string
			if p.Body.Valid {
				setBody = `body = "", `
			}
			q := fmt.Sprintf(`
			UPDATE posts SET 
				%s
				link_image = NULL,
				deleted_content = TRUE, 
				deleted_content_at = ?, 
				deleted_content_by = ?, 
				deleted_content_as = ? 
			WHERE id = ?`, setBody)

			if _, err := tx.ExecContext(ctx, q, now, user, g, p.ID); err != nil {
				return err
			}

			if p.Type == PostTypeImage {
				if _, err := tx.ExecContext(ctx, "DELETE FROM post_images WHERE post_id = ?", p.ID); err != nil {
					return err
				}

				imageIDs := make([]uid.ID, len(p.Images))
				for i := range p.Images {
					imageIDs[i] = *p.Images[i].ID
				}

				if err := images.DeleteImagesTx(ctx, tx, db, imageIDs...); err != nil {
					return err
				}
			} else if p.Type == PostTypeLink && p.HasLinkImage() {
				if err := images.DeleteImagesTx(ctx, tx, db, *p.Link.Image.ID); err != nil {
					return err
				}
			}
		}

		for _, table := range postsTables {
			if _, err := tx.ExecContext(ctx, fmt.Sprintf("DELETE FROM %s WHERE post_id = ?", table), p.ID); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return err
	}

	p.Deleted = true
	p.DeletedAt = msql.NewNullTime(now)
	p.DeletedBy.Valid, p.DeletedBy.ID = true, user
	p.DeletedAs = g

	if g != UserGroupNormal {
		RemoveAllReportsOfPost(ctx, db, p.ID)
	}

	if sendNotif && (g == UserGroupAdmins || g == UserGroupMods) {
		go func() {
			if err := CreatePostDeletedNotification(context.Background(), db, p.AuthorID, g, true, p.ID); err != nil {
				log.Printf("Failed to create deleted_post notification on post %v\n", p.PublicID)
			}
		}()
	}

	return err
}

// Lock locks the post on behalf of user who's locking the post in his or her
// capacity as g.
func (p *Post) Lock(ctx context.Context, db *sql.DB, user uid.ID, g UserGroup) error {
	switch g {
	case UserGroupMods:
		is, err := UserMod(ctx, db, p.CommunityID, user)
		if err != nil {
			return err
		}
		if !is {
			return errNotMod
		}
	case UserGroupAdmins:
		user, err := GetUser(ctx, db, user, nil)
		if err != nil {
			return err
		}
		if !user.Admin {
			return errNotAdmin
		}
	default:
		return errInvalidUserGroup
	}

	now := time.Now()
	_, err := db.ExecContext(ctx, "UPDATE posts SET locked = ?, locked_by = ?, locked_by_group = ?, locked_at = ? WHERE id = ?", true, user, g, now, p.ID)
	if err == nil {
		p.Locked = true
		p.LockedAt = msql.NewNullTime(now)
		p.LockedBy.Valid, p.LockedBy.ID = true, user
		p.LockedAs = g
	}
	return err
}

// Unlock unlocks the post on behalf of user.
func (p *Post) Unlock(ctx context.Context, db *sql.DB, user uid.ID) error {
	// TODO: Add a UserGroup argument to this method.

	isMod, err := UserMod(ctx, db, p.CommunityID, user)
	if err != nil {
		return err
	}
	u, err := GetUser(ctx, db, user, nil)
	if err != nil {
		return err
	}

	if !(isMod || u.Admin) {
		return httperr.NewForbidden("not-mod-not-admin", "User is neither a moderator nor an admin.")
	}

	_, err = db.ExecContext(ctx, "UPDATE posts SET locked = ?, locked_by = null, locked_by_group = ?, locked_at = null WHERE id = ?", false, UserGroupNaN, p.ID)
	if err == nil {
		p.Locked = false
		p.LockedAt.Valid = false
		p.LockedBy.Valid = false
		p.LockedAs = UserGroupNaN
	}
	return err
}

const MaxPinnedPosts = 2

// Pin pins a post on behalf of user to its community if siteWide is false,
// otherwise it pins the post site-wide. If skipPermissions is true, it's not
// checked if user has the permissioned to perform this action.
func (p *Post) Pin(ctx context.Context, db *sql.DB, user uid.ID, siteWide, unpin bool, skipPermissions bool) error {
	if p.Deleted && !unpin {
		return httperr.NewForbidden("cannot-pin-deleted-post", "Cannot pin deleted posts.")
	}

	maxPinsReached := func(ctx context.Context, tx *sql.Tx, community *uid.ID) (reached bool, err error) {
		count := 0
		if community == nil {
			err = tx.QueryRowContext(ctx, "SELECT COUNT(*) FROM pinned_posts WHERE community_id IS NULL").Scan(&count)
		} else {
			err = tx.QueryRowContext(ctx, "SELECT COUNT(*) FROM pinned_posts WHERE community_id = ?", *community).Scan(&count)
		}
		reached = count >= MaxPinnedPosts
		return
	}

	// Check permissions.
	if !skipPermissions {
		if siteWide { // for site-wise pins
			admin, err := IsAdmin(db, &user)
			if err != nil {
				return err
			}
			if !admin {
				return errNotAdmin
			}
		} else { // for community-wide pins
			isMod, err := UserMod(ctx, db, p.CommunityID, user)
			if err != nil {
				return err
			}
			if !isMod {
				// User is not a mod of the community. See if he's an admin.
				admin, err := IsAdmin(db, &user)
				if err != nil {
					return err
				}
				if !admin {
					return errNotMod // user is neither an admin nor a mod
				}
			}
		}
	}

	return msql.Transact(ctx, db, func(tx *sql.Tx) (err error) {
		var (
			query string
			args  []any
		)

		if unpin {
			query = "DELETE FROM pinned_posts WHERE post_id = ? "
			args = []any{p.ID}
			if siteWide {
				query += "AND community_id IS NULL"
			} else {
				query += "AND community_id = ?"
				args = append(args, p.CommunityID)
			}
		} else {
			query = "INSERT INTO pinned_posts (post_id, is_site_wide, community_id) VALUES (?, ?, ?)"
			var community *uid.ID
			if !siteWide {
				community = &p.CommunityID
			}
			args = []any{p.ID, siteWide, community}

			if reached, err := maxPinsReached(ctx, tx, community); err != nil {
				return err
			} else if reached {
				return httperr.NewForbidden("limit-reached", "Max pinned post limit reached.")
			}
		}

		if _, err = tx.ExecContext(ctx, query, args...); err != nil {
			return err
		}

		if siteWide {
			_, err = tx.ExecContext(ctx, "UPDATE posts SET is_pinned_site = ? WHERE id = ?", !unpin, p.ID)
		} else {
			_, err = tx.ExecContext(ctx, "UPDATE posts SET is_pinned = ? WHERE id = ?", !unpin, p.ID)
		}
		return err
	})
}

func (p *Post) updatePostsTablesPoints(ctx context.Context, db *sql.DB) error {
	for _, table := range postsTables {
		if _, err := db.ExecContext(ctx, "UPDATE "+table+" SET points = ? WHERE post_id = ?", p.Points, p.ID); err != nil {
			return err
		}
	}
	return nil
}

func (p *Post) Vote(ctx context.Context, db *sql.DB, user uid.ID, up bool, newUserPointsThreshold int, newUserAgeThreshold time.Duration) error {
	if p.Locked {
		return errPostLocked
	}

	err := msql.Transact(ctx, db, func(tx *sql.Tx) error {
		canUserIncrementPoints, err := userAllowedToIncrementPoints(ctx, tx, user, newUserPointsThreshold, newUserAgeThreshold)
		if err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, "INSERT INTO post_votes (post_id, user_id, up, is_user_new) VALUES (?, ?, ?, ?)", p.ID, user, up, !canUserIncrementPoints); err != nil {
			if msql.IsErrDuplicateErr(err) {
				return &httperr.Error{
					HTTPStatus: http.StatusConflict,
					Code:       "already-voted",
					Message:    "User has already voted.",
				}
			}
			return err
		}
		point := 1
		if !up {
			point = -1
		}
		query := "UPDATE posts SET points = points + ?, hotness = ?"
		newUpvotes, newDownvotes := p.Upvotes, p.Downvotes
		if up {
			query += ", upvotes = upvotes + 1"
			newUpvotes++
		} else {
			query += ", downvotes = downvotes + 1"
			newDownvotes++
		}
		query += " WHERE id = ?"
		if _, err := tx.ExecContext(ctx, query, point, PostHotness(newUpvotes, newDownvotes, p.CreatedAt), p.ID); err != nil {
			return err
		}
		if up && !p.AuthorID.EqualsTo(user) && canUserIncrementPoints {
			if err := incrementUserPoints(ctx, tx, p.AuthorID, 1); err != nil {
				return err
			}
		}
		p.Upvotes = newUpvotes
		p.Downvotes = newDownvotes
		p.Points += point
		p.ViewerVoted = msql.NewNullBool(true)
		p.ViewerVotedUp = msql.NewNullBool(up)
		return nil
	})
	if err != nil {
		return err
	}

	// Attempt to create a notification (only for upvotes).
	if !p.AuthorID.EqualsTo(user) && up {
		go func() {
			if err := CreateNewVotesNotification(context.Background(), db, p.AuthorID, p.CommunityName, true, p.ID); err != nil {
				log.Printf("Failed creating new_votes notification: %v\n", err)
			}
		}()
	}

	return p.updatePostsTablesPoints(ctx, db)
}

// DeleteVote undos users's vote on post.
func (p *Post) DeleteVote(ctx context.Context, db *sql.DB, user uid.ID) error {
	if p.Locked {
		return errPostLocked
	}

	var (
		id      = 0
		up      = false
		userNew = false
	)
	err := msql.Transact(ctx, db, func(tx *sql.Tx) error {
		if err := tx.QueryRowContext(ctx, "SELECT id, up, is_user_new FROM post_votes WHERE post_id = ? AND user_id = ?", p.ID, user).Scan(&id, &up, &userNew); err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, "DELETE FROM post_votes WHERE id = ?", id); err != nil {
			return err
		}
		query := "UPDATE posts SET points = points + ?, hotness = ?"
		point := 1
		newUpvotes, newDownvotes := p.Upvotes, p.Downvotes
		if up {
			point = -1
			query += ", upvotes = upvotes - 1"
			newUpvotes--
		} else {
			query += ", downvotes = downvotes -1"
			newDownvotes--
		}
		query += " WHERE id = ?"
		if _, err := tx.ExecContext(ctx, query, point, PostHotness(newUpvotes, newDownvotes, p.CreatedAt), p.ID); err != nil {
			return err
		}
		if up && !p.AuthorID.EqualsTo(user) && !userNew {
			if err := incrementUserPoints(ctx, tx, p.AuthorID, -1); err != nil {
				return err
			}
		}
		p.Upvotes = newUpvotes
		p.Downvotes = newDownvotes
		p.Points += point
		p.ViewerVoted.Valid = false
		p.ViewerVotedUp.Valid = false
		return nil
	})
	if err != nil {
		return err
	}

	return p.updatePostsTablesPoints(ctx, db)
}

// ChangeVote changes user's vote on post.
func (p *Post) ChangeVote(ctx context.Context, db *sql.DB, user uid.ID, up bool) error {
	if p.Locked {
		return errPostLocked
	}

	var (
		id      = 0
		dbUp    = false
		userNew = false
		exit    = false
	)
	err := msql.Transact(ctx, db, func(tx *sql.Tx) error {
		if err := tx.QueryRowContext(ctx, "SELECT id, up, is_user_new FROM post_votes WHERE post_id = ? AND user_id = ?", p.ID, user).Scan(&id, &dbUp, &userNew); err != nil {
			return err
		}
		if dbUp == up {
			exit = true
			return nil
		}
		if _, err := tx.ExecContext(ctx, "UPDATE post_votes SET up = ? WHERE id = ?", up, id); err != nil {
			return err
		}
		query := "UPDATE posts SET points = points + ?, hotness = ?"
		points := 2
		newUpvotes, newDownvotes := p.Upvotes, p.Downvotes
		if dbUp {
			points = -2
			query += ", upvotes = upvotes - 1, downvotes = downvotes + 1"
			newUpvotes--
			newDownvotes++
		} else {
			query += ", upvotes = upvotes + 1, downvotes = downvotes - 1"
			newUpvotes++
			newDownvotes--
		}
		query += " WHERE id = ?"
		if _, err := tx.ExecContext(ctx, query, points, PostHotness(newUpvotes, newDownvotes, p.CreatedAt), p.ID); err != nil {
			return err
		}
		if !p.AuthorID.EqualsTo(user) && !userNew {
			point := 1
			if dbUp {
				point = -1
			}
			if err := incrementUserPoints(ctx, tx, p.AuthorID, point); err != nil {
				return err
			}
		}
		p.Upvotes = newUpvotes
		p.Downvotes = newDownvotes
		p.Points += points
		p.ViewerVotedUp = msql.NewNullBool(up)
		return nil
	})
	if err != nil {
		return err
	}
	if exit {
		return nil
	}

	return p.updatePostsTablesPoints(ctx, db)
}

func getComments(ctx context.Context, db *sql.DB, viewer *uid.ID, where string, args ...interface{}) ([]*Comment, error) {
	var (
		loggedIn = viewer != nil
		query    = buildSelectCommentsQuery(loggedIn, where)
		rows     *sql.Rows
		err      error
	)

	ret := func(c []*Comment, err error) ([]*Comment, error) {
		if err == nil && c == nil {
			return make([]*Comment, 0), nil
		}
		return c, err
	}

	if loggedIn {
		args2 := make([]interface{}, len(args)+1)
		args2[0] = viewer
		for i := range args {
			args2[i+1] = args[i]
		}
		rows, err = db.QueryContext(ctx, query, args2...)
	} else {
		rows, err = db.QueryContext(ctx, query, args...)
	}
	if err != nil {
		return ret(nil, err)
	}

	c, err := scanComments(ctx, db, rows, viewer)
	if err != nil {
		if err == errCommentNotFound {
			return ret(nil, nil)
		}
		return ret(nil, err)
	}
	return ret(c, nil)
}

// CommentsCursor is an API pagination cursor.
type CommentsCursor struct {
	Upvotes int
	NextID  uid.ID
}

// GetComments populates c.Comments and returns the next comment's cursor.
func (p *Post) GetComments(ctx context.Context, db *sql.DB, viewer *uid.ID, cursor *CommentsCursor) (*CommentsCursor, error) {
	var args []any
	currTime := time.Now()
	where := "WHERE comments.post_id = ? "
	args = append(args, p.ID)
	if cursor != nil {
		where += "AND (comments.upvotes, comments.id) <= (?, ?) "
		args = append(args, cursor.Upvotes, cursor.NextID)
	}
	where += "ORDER BY upvotes DESC, comments.id DESC LIMIT ?"
	args = append(args, commentsFetchLimit+1)

	all, err := getComments(ctx, db, viewer, where, args...)
	if err != nil {
		return nil, err
	}

	comments := all

	// assume a page visit is an API call where cursor is nil
	if cursor == nil && viewer != nil {
		err := p.UpdateVisitTime(ctx, db, viewer, currTime)
		if err != nil {
			log.Println("Could not update post's last visit time: ", err)
		}
	}

	var nextCursor *CommentsCursor
	if len(all) >= commentsFetchLimit+1 {
		nextCursor = new(CommentsCursor)
		nextCursor.Upvotes = all[commentsFetchLimit].Upvotes
		nextCursor.NextID = all[commentsFetchLimit].ID
		comments = all[:commentsFetchLimit]
	}
	p.Comments = comments

	ids := make(map[uid.ID]bool)
	for _, c := range p.Comments {
		ids[c.ID] = true
	}

	var orphans []*Comment
	for _, c := range p.Comments {
		if c.ParentID.Valid {
			if _, ok := ids[c.ParentID.ID]; !ok {
				orphans = append(orphans, c)
			}
		}
	}

	var toGet []uid.ID
	for _, c := range orphans {
		for _, a := range c.Ancestors {
			if _, ok := ids[a]; !ok {
				ids[a] = true
				toGet = append(toGet, a)
			}
		}
	}

	if len(toGet) > 0 {
		c2, err := GetCommentsByIDs(ctx, db, viewer, toGet...)
		if err != nil {
			return nil, err
		}
		p.Comments = append(p.Comments, c2...)
	}

	if nextCursor != nil {
		p.CommentsNext.String = strconv.Itoa(nextCursor.Upvotes) + "." + nextCursor.NextID.String()
		p.CommentsNext.Valid = true
	}

	return nextCursor, nil
}

// GetCommentReplies returns all the replies of comment.
func (p *Post) GetCommentReplies(ctx context.Context, db *sql.DB, viewer *uid.ID, comment uid.ID) ([]*Comment, error) {
	rows, err := db.QueryContext(ctx, "SELECT reply_id FROM comment_replies WHERE parent_id = ?", comment)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	ids, err := scanIDs(rows)
	if err != nil {
		return nil, err
	}
	if len(ids) == 0 {
		return nil, nil
	}

	return GetCommentsByIDs(ctx, db, viewer, ids...)
}

// UpdateVisitTime updates the logged-in viewer's last visit time to the post
// using the last comment extraction (without cursor, without parent ID) as a proxy for page visit
func (p *Post) UpdateVisitTime(ctx context.Context, db *sql.DB, viewer *uid.ID, currTime time.Time) error {
	if viewer == nil {
		return nil
	}
	id, lastVisitedAt := 0, msql.NullTime{}
	if err := db.QueryRowContext(ctx, "SELECT id, last_visited_at FROM post_visits WHERE post_id = ? AND user_id = ?", p.ID, viewer).Scan(&id, &lastVisitedAt); err != nil {
		if err != sql.ErrNoRows {
			return err
		}
		// if it *is* sql.ErrNoRows, id will be 0 and can use that as a check value
	}
	if id == 0 {
		// never visited this post: create a timestamp
		if _, err := db.ExecContext(ctx, "INSERT INTO post_visits (post_id, user_id, last_visited_at, first_visited_at) values (?, ?, ?, ?)", p.ID, viewer, currTime, currTime); err != nil {
			return err
		}
	} else if !lastVisitedAt.Valid || currTime.After(lastVisitedAt.Time) {
		// visited, and current time is after last visit: update last visit time
		if _, err := db.ExecContext(ctx, "UPDATE post_visits SET last_visited_at = ? WHERE id = ?", currTime, id); err != nil {
			return err
		}
	}
	return nil
}

// AddComment adds a new comment to post.
func (p *Post) AddComment(ctx context.Context, db *sql.DB, user uid.ID, g UserGroup, parentComment *uid.ID, body string) (*Comment, error) {
	if p.Locked {
		return nil, errPostLocked
	}

	// Check if author is banned from community.
	if is, err := IsUserBannedFromCommunity(ctx, db, p.CommunityID, user); err != nil {
		return nil, err
	} else if is {
		return nil, errUserBannedFromCommunity
	}

	u, err := GetUser(ctx, db, user, nil)
	if err != nil {
		return nil, err
	}

	// Check if u has permissions to comment as g.
	switch g {
	case UserGroupNormal:
	case UserGroupMods:
		is, err := UserMod(ctx, db, p.CommunityID, user)
		if err != nil {
			return nil, err
		}
		if !is {
			return nil, errNotMod
		}
	case UserGroupAdmins:
		if !u.Admin {
			return nil, errNotAdmin
		}
	default:
		return nil, errInvalidUserGroup
	}

	body = strings.TrimSpace(body)
	comment, err := addComment(ctx, db, p, u, parentComment, body)
	if err != nil {
		return nil, err
	}
	comment.ChangeUserGroup(ctx, db, u.ID, g)
	return comment, nil
}

// ChangeUserGroup changes the capacity in which the post's author submitted the
// post.
func (p *Post) ChangeUserGroup(ctx context.Context, db *sql.DB, user uid.ID, g UserGroup) error {
	if !p.AuthorID.EqualsTo(user) {
		return errNotAuthor
	}
	if p.PostedAs == g {
		return nil
	}

	switch g {
	case UserGroupNormal:
	case UserGroupMods:
		is, err := UserMod(ctx, db, p.CommunityID, user)
		if err != nil {
			return err
		}
		if !is {
			return errNotMod
		}
	case UserGroupAdmins:
		u, err := GetUser(ctx, db, user, nil)
		if err != nil {
			return err
		}
		if !u.Admin {
			return errNotAdmin
		}
	default:
		return errInvalidUserGroup
	}

	_, err := db.ExecContext(ctx, "UPDATE posts SET user_group = ? WHERE id = ? AND deleted_at IS NULL", g, p.ID)
	if err == nil {
		p.PostedAs = g
	}
	return err
}

// AnnounceToAllUsers starts a background process to send an announcement
// notification of this post to all users. The viewer has to be an admin.
func (p *Post) AnnounceToAllUsers(ctx context.Context, db *sql.DB, viewer uid.ID) error {
	if is, err := IsAdmin(db, &viewer); err != nil {
		return err
	} else if !is {
		return errNotAdmin
	}

	if _, err := db.ExecContext(ctx, "INSERT INTO announcement_posts (post_id, announced_by) VALUES (?, ?)", p.ID, viewer); err != nil {
		if msql.IsErrDuplicateErr(err) {
			return &httperr.Error{
				HTTPStatus: http.StatusConflict,
				Code:       "duplicate",
				Message:    "Post was already announced",
			}
		}
		return err
	}
	return nil
}

// PurgePostsFromTempTables removes posts from posts_today, posts_week, etc
// tables. Call this function periodically.
func PurgePostsFromTempTables(ctx context.Context, db *sql.DB) error {
	bulk := 100
	for i, table := range postsTables {
		again := true
		total := 0
		for again {
			t := time.Now().Add(postsTablesValidity[i])
			res, err := db.ExecContext(ctx, "DELETE FROM "+table+" WHERE created_at < ? LIMIT ?", t, bulk)
			if err != nil {
				return err
			}
			n, err := res.RowsAffected()
			if err != nil {
				return err
			}
			total += int(n)
			if n == 0 {
				again = false
			}

		}
	}
	return nil
}

// IsPostLocked checks if post is locked.
func IsPostLocked(ctx context.Context, db *sql.DB, post uid.ID) (bool, error) {
	row := db.QueryRowContext(ctx, "SELECT locked FROM posts WHERE id = ?", post)
	is := true
	err := row.Scan(&is)
	return is, err
}

// PostHotness calculates the hotness score of a post.
func PostHotness(upvotes, downvotes int, date time.Time) int {
	s := 0
	for i := 1; i < upvotes+1; i++ {
		if i <= 3 {
			s += 1
		} else if i <= 6 {
			s += 3
		} else if i <= 10 {
			s += 3
		} else if i <= 20 {
			s += 4
		} else if i <= 40 {
			s += 5
		} else {
			s += 6
		}
	}

	order := math.Log10(math.Max(math.Abs(float64(s)), 1))
	var sign float64
	if s > 0 {
		sign = 1
	} else if s < 0 {
		sign = -1
	}

	interval := float64(45000) // float64(69000)
	seconds := float64(date.Unix())
	hotness := order + float64(sign*seconds)/interval
	return int(math.Round(hotness * 10000000))
}

// UpdateAllPostsHotness applies the PostHotness function to every row in the
// posts table.
func UpdateAllPostsHotness(ctx context.Context, db *sql.DB) error {
	var (
		limit      = 1000
		lastID     uid.ID
		goOn       = true
		totalCount = 0
	)

	for goOn {
		rows, err := db.QueryContext(ctx, "SELECT id, upvotes, downvotes, created_at FROM posts WHERE id > ? ORDER BY id LIMIT ?", lastID, limit)
		if err != nil {
			return err
		}

		count := 0
		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			return err
		}

		for rows.Next() {
			upvotes, downvotes := 0, 0
			var createdAt time.Time
			var postID uid.ID
			if err := rows.Scan(&postID, &upvotes, &downvotes, &createdAt); err != nil {
				tx.Rollback()
				rows.Close()
				return err
			}
			if _, err := tx.ExecContext(ctx, "UPDATE posts SET hotness = ? WHERE id = ?", PostHotness(upvotes, downvotes, createdAt), postID); err != nil {
				log.Println(err)
				goOn = false
				break
			}
			lastID = postID
			count++
		}

		if err := rows.Err(); err != nil {
			tx.Rollback()
			rows.Close()
			return err
		}

		if err = tx.Commit(); err != nil {
			return err
		}

		totalCount += count
		if count < limit {
			goOn = false
		}

		if err := rows.Close(); err != nil {
			return err
		}
	}

	log.Printf("Fixed %v posts", totalCount)
	return nil
}

func SavePostImage(ctx context.Context, db *sql.DB, authorID uid.ID, image []byte) (*images.ImageRecord, error) {
	var imageID uid.ID
	err := msql.Transact(ctx, db, func(tx *sql.Tx) (err error) {
		id, err := images.SaveImageTx(ctx, tx, "disk", image, &images.ImageOptions{
			Width:  5000,
			Height: 5000,
			Format: images.ImageFormatJPEG,
			Fit:    images.ImageFitContain,
		})
		if err != nil {
			if err == images.ErrImageFormatUnsupported {
				return httperr.NewBadRequest("unsupported-image-format", "The uploaded file is of an unsupported type.")
			}
			return fmt.Errorf("failed to save post image (author: %v): %w", authorID, err)
		}
		imageID = id
		if _, err := tx.ExecContext(ctx, "INSERT INTO temp_images (user_id, image_id) values (?, ?)", authorID, imageID); err != nil {
			return fmt.Errorf("failed to insert row into temp_images (author: %v, image: %v): %w", authorID, imageID, err)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return images.GetImageRecord(ctx, db, imageID)
}

// RemoveTempImages removes all temp images older than 12 hours and returns how
// many were removed.
func RemoveTempImages(ctx context.Context, db *sql.DB) (int, error) {
	t := time.Now().Add(-time.Hour * 12)
	rows, err := db.QueryContext(ctx, "select image_id from temp_images where created_at < ?", t)
	if err != nil {
		return 0, err
	}

	var imageIDs []uid.ID
	for rows.Next() {
		var imageID uid.ID
		if err = rows.Scan(&imageID); err != nil {
			return 0, err
		}
		imageIDs = append(imageIDs, imageID)
	}

	if err = rows.Err(); err != nil {
		return 0, err
	}
	if len(imageIDs) == 0 {
		return 0, nil
	}

	err = msql.Transact(ctx, db, func(tx *sql.Tx) (err error) {
		args := make([]any, len(imageIDs))
		for i := range imageIDs {
			args[i] = imageIDs[i]
		}
		query := fmt.Sprintf("DELETE FROM temp_images WHERE image_id IN %s", msql.InClauseQuestionMarks(len(imageIDs)))
		if _, err := db.ExecContext(ctx, query, args...); err != nil {
			return fmt.Errorf("failed to delete %d rows from temp_images: %w", len(imageIDs), err)
		}
		for _, id := range imageIDs {
			if err := images.DeleteImagesTx(ctx, tx, db, id); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return 0, err
	}

	return len(imageIDs), nil
}

// postLink is the link metadata of a link post as stored in the database.
type postLink struct {
	Version  int    `json:"v"`
	URL      string `json:"u"`
	Hostname string `json:"h"`
}

func (pl *postLink) PostLink() *PostLink {
	return &PostLink{
		Version:  pl.Version,
		URL:      pl.URL,
		Hostname: pl.Hostname,
	}
}

// PostLink is the object to be sent to the client.
type PostLink struct {
	Version  int           `json:"-"`
	URL      string        `json:"url"`
	Hostname string        `json:"hostname"`
	Image    *images.Image `json:"image"`
}

func (pl *PostLink) SetImageCopies() {
	if pl.Image != nil {
		pl.Image.PostScan()
		pl.Image.AppendCopy("tiny", 120, 120, images.ImageFitCover, "")
		pl.Image.AppendCopy("desktop", 325, 250, images.ImageFitCover, "")
		pl.Image.AppendCopy("mobile", 875, 500, images.ImageFitCover, "")
	}
}

// If community is null, site-wide pinned posts are returned.
func getPinnedPosts(ctx context.Context, db *sql.DB, viewer, community *uid.ID) ([]*Post, error) {
	var args []any
	where := "WHERE posts.id "
	if viewer != nil {
		args = append(args, *viewer, *viewer)
	}
	if community != nil {
		where += "IN (SELECT post_id FROM pinned_posts WHERE community_id = ?)"
		args = append(args, *community)
	} else {
		where += "IN (SELECT post_id FROM pinned_posts WHERE community_id IS NULL)"
	}

	q := buildSelectPostQuery(viewer != nil, where)
	rows, err := db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}

	posts, err := scanPosts(ctx, db, rows, viewer)
	if err != nil {
		if err == errPostNotFound {
			return nil, nil
		}
		return nil, err
	}
	return posts, err
}
