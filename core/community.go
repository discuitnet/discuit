package core

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"net/http"
	"slices"
	"sort"
	"strings"
	"time"

	"github.com/discuitnet/discuit/internal/httperr"
	"github.com/discuitnet/discuit/internal/images"
	msql "github.com/discuitnet/discuit/internal/sql"
	"github.com/discuitnet/discuit/internal/uid"
	"github.com/discuitnet/discuit/internal/utils"
)

const maxCommunityAboutLength = 2000 // in runes

type Community struct {
	ID                uid.ID          `json:"id"`
	AuthorID          uid.ID          `json:"userId"`
	Name              string          `json:"name"`
	NameLowerCase     string          `json:"-"` // TODO: Remove this field (only from this struct, not also from the database).
	NSFW              bool            `json:"nsfw"`
	About             msql.NullString `json:"about"`
	NumMembers        int             `json:"noMembers"`
	PostsCount        int             `json:"-"` // Including deleted posts
	ProPic            *images.Image   `json:"proPic"`
	BannerImage       *images.Image   `json:"bannerImage"`
	PostingRestricted bool            `json:"postingRestricted"` // If true only mods can post.
	CreatedAt         time.Time       `json:"createdAt"`
	DeletedAt         msql.NullTime   `json:"deletedAt"`
	DeletedBy         uid.NullID      `json:"-"`

	// IsDefault is nil until Default is called.
	IsDefault *bool `json:"isDefault,omitempty"`

	ViewerJoined  msql.NullBool `json:"userJoined"`
	ViewerMod     msql.NullBool `json:"userMod"`
	MutedByViewer bool          `json:"isMuted"`

	Mods           []*User                  `json:"mods"`
	Rules          []*CommunityRule         `json:"rules"`
	ReportsDetails *CommunityReportsDetails `json:"ReportsDetails"`
}

func buildSelectCommunityQuery(where string) string {
	var cols = []string{
		"communities.id",
		"communities.user_id",
		"communities.name",
		"communities.name_lc",
		"communities.nsfw",
		"communities.about",
		"communities.no_members",
		"communities.posts_count",
		"communities.posting_restricted",
		"communities.created_at",
		"communities.deleted_at",
	}
	cols = append(cols, images.ImageColumns("pro_pic")...)
	cols = append(cols, images.ImageColumns("banner")...)
	joins := []string{
		"LEFT JOIN images AS pro_pic ON pro_pic.id = communities.pro_pic_2",
		"LEFT JOIN images AS banner ON banner.id = communities.banner_image_2",
	}
	return msql.BuildSelectQuery("communities", cols, joins, where)
}

func getCommunities(ctx context.Context, db *sql.DB, viewer *uid.ID, where string, args ...any) ([]*Community, error) {
	query := buildSelectCommunityQuery(where)
	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}

	comms, err := scanCommunities(ctx, db, rows, viewer)
	if err != nil {
		return nil, err
	}
	return comms, nil
}

// GetCommunityByName returns a not-found httperr.Error if no community is found.
func GetCommunityByName(ctx context.Context, db *sql.DB, name string, viewer *uid.ID) (*Community, error) {
	name = strings.ToLower(name)
	comms, err := getCommunities(ctx, db, viewer, "WHERE name_lc = ?", name)
	if err != nil {
		return nil, err
	}

	if len(comms) == 0 {
		return nil, errCommunityNotFound
	}

	if viewer != nil {
		if err = comms[0].PopulateViewerFields(ctx, db, *viewer); err != nil {
			return nil, err
		}
	}
	return comms[0], err
}

// GetCommunityByID returns a not-found httperr.Error if no community is found.
func GetCommunityByID(ctx context.Context, db *sql.DB, id uid.ID, viewer *uid.ID) (*Community, error) {
	comms, err := getCommunities(ctx, db, viewer, "where communities.id = ?", id)
	if err != nil {
		return nil, err
	}

	if len(comms) == 0 {
		return nil, errCommunityNotFound
	}

	if viewer != nil {
		if err = comms[0].PopulateViewerFields(ctx, db, *viewer); err != nil {
			return nil, err
		}
	}
	return comms[0], nil
}

func GetCommunitiesByIDs(ctx context.Context, db *sql.DB, ids []uid.ID, viewer *uid.ID) ([]*Community, error) {
	if len(ids) == 0 {
		return nil, nil
	}

	args := make([]any, len(ids))
	for i := range ids {
		args[i] = ids[i]
	}

	comms, err := getCommunities(ctx, db, viewer, fmt.Sprintf("WHERE communities.id IN %s", msql.InClauseQuestionMarks(len(ids))), args...)
	if err != nil {
		return nil, err
	}
	return comms, err
}

func setCommunityProPicCopies(image *images.Image) {
	image.AppendCopy("tiny", 50, 50, images.ImageFitCover, "")
	image.AppendCopy("small", 120, 120, images.ImageFitCover, "")
	image.AppendCopy("medium", 200, 200, images.ImageFitCover, "")
}

func setCommunityBannerCopies(image *images.Image) {
	image.AppendCopy("small", 720, 240, images.ImageFitCover, "")
	image.AppendCopy("large", 1440, 480, images.ImageFitCover, "")
}

func scanCommunities(ctx context.Context, db *sql.DB, rows *sql.Rows, viewer *uid.ID) ([]*Community, error) {
	defer rows.Close()

	var comms []*Community
	for rows.Next() {
		c := &Community{}
		dests := []any{
			&c.ID,
			&c.AuthorID,
			&c.Name,
			&c.NameLowerCase,
			&c.NSFW,
			&c.About,
			&c.NumMembers,
			&c.PostsCount,
			&c.PostingRestricted,
			&c.CreatedAt,
			&c.DeletedAt,
		}

		proPic, bannerImage := &images.Image{}, &images.Image{}
		dests = append(dests, proPic.ScanDestinations()...)
		dests = append(dests, bannerImage.ScanDestinations()...)

		if err := rows.Scan(dests...); err != nil {
			return nil, err
		}

		if proPic.ID != nil {
			proPic.PostScan()
			setCommunityProPicCopies(proPic)
			c.ProPic = proPic
		}
		if bannerImage.ID != nil {
			bannerImage.PostScan()
			setCommunityBannerCopies(bannerImage)
			c.BannerImage = bannerImage
		}
		comms = append(comms, c)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	if viewer != nil {
		mutes, err := GetMutedCommunities(ctx, db, *viewer, false)
		if err != nil {
			return nil, err
		}
		for _, c := range comms {
			for _, mute := range mutes {
				if *mute.MutedCommunityID == c.ID {
					c.MutedByViewer = true
					break
				}
			}
		}
	}
	return comms, nil
}

// countUserModdingCommunities returns the number of communities user moderates.
func countUserModdingCommunities(ctx context.Context, db *sql.DB, user uid.ID) (n int, err error) {
	row := db.QueryRowContext(ctx, "SELECT COUNT(community_id) FROM community_mods WHERE user_id = ?", user)
	err = row.Scan(&n)
	return
}

// To temporary disable community creation to everyone.
var communityCreationAdminOnly = true

// CreateCommunity returns an error if creator doesn't have reqPoints or if he's
// created more communities than maxPerUser.
func CreateCommunity(ctx context.Context, db *sql.DB, creator uid.ID, reqPoints, maxPerUser int, name, about string) (*Community, error) {
	about = utils.TruncateUnicodeString(about, maxCommunityAboutLength)
	if err := IsUsernameValid(name); err != nil {
		return nil, httperr.NewBadRequest("invalid-community-name", fmt.Sprintf("Community name invalid. It %s.", err.Error()))
	}

	user, err := GetUser(ctx, db, creator, nil)
	if err != nil {
		return nil, err
	}

	if communityCreationAdminOnly {
		if !user.Admin {
			return nil, errNotAdmin
		}
	} else {
		if user.Points < reqPoints {
			return nil, httperr.NewForbidden("not-enough-points", "You don't have enough points to create a community.")
		}
		n, err := countUserModdingCommunities(ctx, db, creator)
		if err != nil {
			return nil, err
		}
		if n >= maxPerUser {
			return nil, httperr.NewForbidden("max-limit-reached", "You've reached the maximum number of communities you can create, for the time being.")
		}
	}

	// Check for duplicates first.
	if exists, _, err := CommunityExists(ctx, db, name); err != nil {
		return nil, err
	} else if exists {
		return nil, &httperr.Error{HTTPStatus: http.StatusConflict, Code: "community-exists", Message: fmt.Sprintf("A community with name %s already exists.", name)}
	}

	query := "INSERT INTO communities (id, name, name_lc, user_id, about) VALUES (?, ?, ?, ?, ?)"
	id := uid.New()
	var about_ any
	if about != "" {
		about_ = about
	}

	if _, err = db.ExecContext(ctx, query, id, name, strings.ToLower(name), creator, about_); err != nil {
		return nil, err
	}

	comm, err := GetCommunityByID(ctx, db, id, nil)
	if err != nil {
		return nil, err
	}

	// Attempt to make user a mod of community.
	if err := comm.Join(ctx, db, creator); err == nil {
		comm.ViewerJoined = msql.NewNullBool(true)
		if err = makeUserMod(ctx, db, comm, creator, true); err == nil {
			comm.ViewerMod = msql.NewNullBool(true)
		}
	}

	return comm, nil
}

func CommunityExists(ctx context.Context, db *sql.DB, name string) (bool, *Community, error) {
	comm, err := GetCommunityByName(ctx, db, name, nil)
	if err != nil {
		if err == errCommunityNotFound {
			return false, nil, nil
		}
		return false, nil, err
	}
	return true, comm, err
}

type CommunitiesSort string

const (
	CommunitiesSortNew     = CommunitiesSort("new")
	CommunitiesSortOld     = CommunitiesSort("old")
	CommunitiesSortSize    = CommunitiesSort("size")
	CommunitiesSortNameAsc = CommunitiesSort("name_asc")
	CommunitiesSortNameDsc = CommunitiesSort("name_dsc")
	CommunitiesSortDefault = CommunitiesSortNameAsc
)

func (s CommunitiesSort) Valid() bool {
	valid := []CommunitiesSort{
		CommunitiesSortNew,
		CommunitiesSortOld,
		CommunitiesSortSize,
		CommunitiesSortNameAsc,
		CommunitiesSortNameDsc,
	}
	return slices.Contains(valid, s)
}

const (
	CommunitiesSetAll        = "all"
	CommunitiesSetDefault    = "default"
	CommunitiesSetSubscribed = "subscribed"
)

// GetCommunities returns a maximum of n communities.
func GetCommunities(ctx context.Context, db *sql.DB, sort CommunitiesSort, set string, n int, viewer *uid.ID) ([]*Community, error) {
	if !slices.Contains([]string{CommunitiesSetAll, CommunitiesSetDefault, CommunitiesSetSubscribed}, set) {
		return nil, httperr.NewBadRequest("invalid-set", "Invalid community set options.")
	}

	var args []any
	where := "WHERE communities.deleted_at IS NULL "
	if set == CommunitiesSetDefault {
		where += "AND communities.id IN (SELECT community_id FROM default_communities) "
	} else if set == CommunitiesSetSubscribed {
		where += " AND communities.id IN (SELECT community_id FROM community_members WHERE user_id = ?) "
		args = append(args, *viewer)
	}

	order_by := ""
	switch sort {
	case CommunitiesSortNew:
		order_by = "ORDER BY communities.created_at DESC "
	case CommunitiesSortOld:
		order_by = "ORDER BY communities.created_at "
	case CommunitiesSortSize:
		order_by = "ORDER BY communities.no_members DESC "
	case CommunitiesSortNameAsc:
		order_by = "ORDER BY communities.name_lc "
	case CommunitiesSortNameDsc:
		order_by = "ORDER BY communities.name_lc DESC "
	default:
		return nil, httperr.NewBadRequest("invalid-sort", "Invalid community sort option.")
	}

	limit := ""
	if n > 0 {
		limit = fmt.Sprintf("LIMIT %d ", n)
	}

	rows, err := db.QueryContext(ctx, buildSelectCommunityQuery(where+order_by+limit), args...)
	if err != nil {
		return nil, err
	}
	return scanCommunities(ctx, db, rows, viewer)
}

// GetCommunitiesPrefix returns all communities with name prefix s sorted by created at.
func GetCommunitiesPrefix(ctx context.Context, db *sql.DB, s string) ([]*Community, error) {
	const limit = 10
	query := buildSelectCommunityQuery("WHERE communities.name LIKE ? AND communities.deleted_at IS NULL LIMIT ?")
	rows, err := db.QueryContext(ctx, query, "%"+s+"%", limit)
	if err != nil {
		return nil, err
	}
	comms, err := scanCommunities(ctx, db, rows, nil)
	if err != nil {
		return nil, err
	}

	query = buildSelectCommunityQuery("WHERE communities.name = ?")
	rows, err = db.QueryContext(ctx, query, s)
	if err != nil {
		return nil, err
	}

	exact, err := scanCommunities(ctx, db, rows, nil)
	if err != nil {
		return nil, err
	}

	total := append(exact, comms...)
	if len(total) > limit {
		total = total[:limit]
	}

	deduped := make([]*Community, 0, len(total))
	{
		// Remove duplicate communities.
		added := make(map[uid.ID]bool)
		for _, comm := range total {
			if !added[comm.ID] {
				deduped = append(deduped, comm)
				added[comm.ID] = true
			}
		}
	}

	return deduped, nil
}

// Update updates the updatable fields of the community. These are:
//   - NSFW
//   - About
//   - PostingRestricted
func (c *Community) Update(ctx context.Context, db *sql.DB, mod uid.ID) error {
	if is, err := c.UserModOrAdmin(ctx, db, mod); err != nil {
		return err
	} else if !is {
		return errNotMod
	}

	c.About.String = utils.TruncateUnicodeString(c.About.String, maxCommunityAboutLength)
	_, err := db.ExecContext(ctx, "UPDATE communities SET nsfw = ?, about = ?, posting_restricted = ? WHERE id = ?", c.NSFW, c.About, c.PostingRestricted, c.ID)
	return err
}

// Default reports whether c is a default community, and, if there's no error,
// it sets c.IsDefault to a non-nil value.
func (c *Community) Default(ctx context.Context, db *sql.DB) (bool, error) {
	row := db.QueryRowContext(ctx, "SELECT name_lc FROM default_communities WHERE name_lc = ?", c.NameLowerCase)
	name := ""
	if err := row.Scan(&name); err != nil {
		if err == sql.ErrNoRows {
			c.IsDefault = new(bool)
			return false, nil
		}
		return false, err
	}
	c.IsDefault = new(bool)
	*c.IsDefault = true
	return true, nil
}

// SetDefault adds c to the list of default communities. If set is false, c is
// removed from the default communities.
func (c *Community) SetDefault(ctx context.Context, db *sql.DB, set bool) error {
	if set {
		_, err := db.ExecContext(ctx, "INSERT INTO default_communities (name_lc, community_id) VALUES (?, ?)", c.NameLowerCase, c.ID)
		if err != nil && msql.IsErrDuplicateErr(err) {
			return nil
		}
		return err
	}
	_, err := db.ExecContext(ctx, "DELETE FROM default_communities WHERE name_lc = ?", c.NameLowerCase)
	return err
}

func (c *Community) Join(ctx context.Context, db *sql.DB, user uid.ID) error {
	err := msql.Transact(ctx, db, func(tx *sql.Tx) error {
		if _, err := tx.ExecContext(ctx, "INSERT INTO community_members (community_id, user_id) VALUES (?, ?)", c.ID, user); err != nil {
			if msql.IsErrDuplicateErr(err) {
				return nil // already a member, exit
			}
			return err
		}
		if _, err := tx.ExecContext(ctx, "UPDATE communities SET no_members = no_members + 1 WHERE id = ?", c.ID); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return err
	}
	c.NumMembers++
	return nil
}

func (c *Community) Leave(ctx context.Context, db *sql.DB, user uid.ID) error {
	err := msql.Transact(ctx, db, func(tx *sql.Tx) error {
		if _, err := tx.ExecContext(ctx, "DELETE FROM community_members WHERE community_id = ? AND user_id = ?", c.ID, user); err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, "DELETE FROM community_mods WHERE community_id = ? AND user_id = ?", c.ID, user); err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, "UPDATE communities SET no_members = no_members - 1 WHERE id = ?", c.ID); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return err
	}
	c.NumMembers--
	return nil
}

func (c *Community) UpdateProPic(ctx context.Context, db *sql.DB, image []byte) error {
	var newImageID uid.ID
	err := msql.Transact(ctx, db, func(tx *sql.Tx) error {
		if err := c.DeleteProPicTx(ctx, db, tx); err != nil {
			return err
		}
		imageID, err := images.SaveImageTx(ctx, tx, "disk", image, &images.ImageOptions{
			Width:  2000,
			Height: 2000,
			Format: images.ImageFormatJPEG,
			Fit:    images.ImageFitContain,
		})
		if err != nil {
			return fmt.Errorf("fail to save community profile picture: %w", err)
		}
		if _, err := tx.ExecContext(ctx, "UPDATE communities SET pro_pic_2 = ? WHERE id = ?", imageID, c.ID); err != nil {
			return err
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
	c.ProPic = record.Image()
	setCommunityProPicCopies(c.ProPic)
	return nil
}

func (c *Community) DeleteProPic(ctx context.Context, db *sql.DB) error {
	if c.ProPic == nil {
		return nil
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	if err := c.DeleteProPicTx(ctx, db, tx); err != nil {
		if rErr := tx.Rollback(); rErr != nil {
			return fmt.Errorf("%w (rollback error: %w)", err, rErr)
		}
		return err
	}
	return tx.Commit()
}

func (c *Community) DeleteProPicTx(ctx context.Context, db *sql.DB, tx *sql.Tx) error {
	if c.ProPic == nil {
		return nil
	}
	if _, err := db.ExecContext(ctx, "UPDATE communities SET pro_pic_2 = NULL where id = ?", c.ID); err != nil {
		return fmt.Errorf("failed to set communities.pro_pic to null: %w", err)
	}
	if err := images.DeleteImagesTx(ctx, tx, db, *c.ProPic.ID); err != nil {
		return fmt.Errorf("failed to delete pro pic (community: %s): %w", c.Name, err)
	}
	c.ProPic = nil
	return nil
}

func (c *Community) UpdateBannerImage(ctx context.Context, db *sql.DB, image []byte) error {
	var newImageID uid.ID
	err := msql.Transact(ctx, db, func(tx *sql.Tx) error {
		if err := c.DeleteBannerImageTx(ctx, db, tx); err != nil {
			return err
		}
		imageID, err := images.SaveImageTx(ctx, tx, "disk", image, &images.ImageOptions{
			Width:  2000,
			Height: 2000,
			Format: images.ImageFormatJPEG,
			Fit:    images.ImageFitContain,
		})
		if err != nil {
			return fmt.Errorf("fail to save banner image: %w", err)
		}
		if _, err := tx.ExecContext(ctx, "UPDATE communities SET banner_image_2 = ? WHERE id = ?", imageID, c.ID); err != nil {
			return err
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
	c.BannerImage = record.Image()
	setCommunityBannerCopies(c.BannerImage)
	return nil
}

// DeleteBannerImage deletes the community's banner image.
func (c *Community) DeleteBannerImage(ctx context.Context, db *sql.DB) error {
	if c.BannerImage == nil {
		return nil
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	if err := c.DeleteBannerImageTx(ctx, db, tx); err != nil {
		if rErr := tx.Rollback(); rErr != nil {
			return fmt.Errorf("%w (rollback error: %w)", err, rErr)
		}
		return err
	}
	return tx.Commit()
}

func (c *Community) DeleteBannerImageTx(ctx context.Context, db *sql.DB, tx *sql.Tx) error {
	if c.BannerImage == nil {
		return nil
	}
	if _, err := tx.ExecContext(ctx, "UPDATE communities SET banner_image_2 = NULL WHERE id = ?", c.ID); err != nil {
		return fmt.Errorf("failed to set communities.banner to null (community: %s): %w", c.Name, err)
	}
	if err := images.DeleteImagesTx(ctx, tx, db, *c.BannerImage.ID); err != nil {
		return fmt.Errorf("failed to delete banner image: %w", err)
	}
	c.BannerImage = nil
	return nil
}

// PopulateViewerFields populates c.ViewerJoined and c.ViewerMod fields.
func (c *Community) PopulateViewerFields(ctx context.Context, db *sql.DB, user uid.ID) error {
	row := db.QueryRowContext(ctx, "SELECT is_mod FROM community_members WHERE community_id = ? AND user_id = ?", c.ID, user)
	isMod := false
	if err := row.Scan(&isMod); err != nil {
		if err == sql.ErrNoRows {
			c.ViewerJoined = msql.NewNullBool(false)
			c.ViewerMod = msql.NewNullBool(false)
			return nil
		}
		return err
	}
	c.ViewerJoined = msql.NewNullBool(true)
	c.ViewerMod = msql.NewNullBool(isMod)
	return nil
}

// BanUser bans user by mod. If expires is non-nil, the ban is permanent.
func (c *Community) BanUser(ctx context.Context, db *sql.DB, mod, user uid.ID, expires *time.Time) error {
	if is, err := c.UserModOrAdmin(ctx, db, mod); err != nil {
		return err
	} else if !is {
		return errNotMod
	}

	// TODO: Shouldn't be able to ban another mod or an admin.

	var t msql.NullTime
	if expires != nil {
		t.Valid = true
		t.Time = *expires
	}
	_, err := db.ExecContext(ctx, "INSERT INTO community_banned (user_id, community_id, expires, banned_by) VALUES (?, ?, ?, ?)", user, c.ID, t, mod)
	return err
}

func (c *Community) UnbanUser(ctx context.Context, db *sql.DB, mod, user uid.ID) error {
	if is, err := c.UserModOrAdmin(ctx, db, mod); err != nil {
		return err
	} else if !is {
		return errNotMod
	}
	return unbanUserFromCommunity(ctx, db, c.ID, user)
}

func unbanUserFromCommunity(ctx context.Context, db *sql.DB, community, user uid.ID) error {
	_, err := db.ExecContext(ctx, "DELETE FROM community_banned WHERE community_id = ? AND user_id = ?", community, user)
	return err
}

func (c *Community) GetBannedUsers(ctx context.Context, db *sql.DB) ([]*User, error) {
	rows, err := db.QueryContext(ctx, "SELECT user_id FROM community_banned WHERE community_id = ?", c.ID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ids []uid.ID
	for rows.Next() {
		var id uid.ID
		if err = rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	if len(ids) == 0 {
		return nil, nil
	}
	return GetUsersByIDs(ctx, db, ids, nil)
}

// IsUserBannedFromCommunity checks if user is banned from community. If user is
// banned and the ban is expired he is unbanned.
func IsUserBannedFromCommunity(ctx context.Context, db *sql.DB, community, user uid.ID) (bool, error) {
	row := db.QueryRowContext(ctx, "SELECT expires FROM community_banned WHERE community_id = ? AND user_id = ?", community, user)
	var expires msql.NullTime
	if err := row.Scan(&expires); err != nil {
		if err == sql.ErrNoRows {
			return false, nil
		}
		return false, err
	}
	if expires.Valid {
		now := time.Now()
		if now.Sub(expires.Time) < 0 {
			// expired
			return false, unbanUserFromCommunity(ctx, db, community, user)
		}
	}
	return true, nil
}

// UserBanned reports if user is banned from community. If user is banned and
// the ban is expired he is unbanned.
func (c *Community) UserBanned(ctx context.Context, db *sql.DB, user uid.ID) (bool, error) {
	return IsUserBannedFromCommunity(ctx, db, c.ID, user)
}

// PopulateMods populates c.Mods.
func (c *Community) PopulateMods(ctx context.Context, db *sql.DB) (err error) {
	c.Mods, err = GetCommunityMods(ctx, db, c.ID)
	if err == nil && c.Mods == nil {
		c.Mods = make([]*User, 0)
	}
	return err
}

// UserMod checks if user is a moderator of community.
func UserMod(ctx context.Context, db *sql.DB, community, user uid.ID) (bool, error) {
	var id int
	err := db.QueryRowContext(ctx, "SELECT id FROM community_mods WHERE community_id = ? AND user_id = ?", community, user).Scan(&id)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

// UserModOrAdmin reports whether user is a moderator of community or if user is
// an admin.
func UserModOrAdmin(ctx context.Context, db *sql.DB, community, user uid.ID) (bool, error) {
	isMod, err := UserMod(ctx, db, community, user)
	if err != nil {
		return false, err
	}
	if isMod {
		return true, nil
	}

	isAdmin := false
	if err = db.QueryRowContext(ctx, "SELECT is_admin FROM users WHERE id = ?", user).Scan(&isAdmin); err != nil {
		if err == sql.ErrNoRows {
			return false, nil
		}
		return false, err
	}
	return isAdmin, nil
}

// UserMod checks if user is a moderator of c.
func (c *Community) UserMod(ctx context.Context, db *sql.DB, user uid.ID) (bool, error) {
	return UserMod(ctx, db, c.ID, user)
}

// UserModOrAdmin reports whether user is a moderator of c or if user is an
// admin.
func (c *Community) UserModOrAdmin(ctx context.Context, db *sql.DB, user uid.ID) (bool, error) {
	return UserModOrAdmin(ctx, db, c.ID, user)
}

// ModHigherUp reports whether higher mod is above the lower mod in the mod
// hierarchy. It returns true when the two mods have the same position value. It
// also returns true if the two mods, higher and lower, are the same.
//
// ModHigherUp does not check properly for permissions.
func (c *Community) ModHigherUp(ctx context.Context, db *sql.DB, higher, lower uid.ID) (bool, error) {
	if higher == lower {
		return true, nil
	}

	rows, err := db.QueryContext(ctx, "SELECT user_id, position FROM community_mods WHERE community_id = ? AND user_id IN (?, ?)", c.ID, higher, lower)
	if err != nil {
		return false, err
	}
	defer rows.Close()

	var rowCount, higherPos, lowerPos int
	for rows.Next() {
		var id uid.ID
		var position int
		if err := rows.Scan(&id, &position); err != nil {
			return false, err
		}

		if id == higher {
			higherPos = position
		} else {
			lowerPos = position
		}
		rowCount++
	}

	if err := rows.Err(); err != nil {
		return false, err
	}

	if rowCount != 2 {
		return false, fmt.Errorf("select row count is not 2 but %d", rowCount)
	}

	if higherPos <= lowerPos {
		return true, nil
	}

	return false, nil
}

// FixModPositions fixes the mod hierarchy of moderators. If two mods have the
// same position, they are given new positions according when they were made
// mods of c.
func (c *Community) FixModPositions(ctx context.Context, db *sql.DB) error {
	rows, err := db.QueryContext(ctx, "SELECT user_id, position, created_at FROM community_mods WHERE community_id = ?", c.ID)
	if err != nil {
		return err
	}
	defer rows.Close()

	type Mods struct {
		UserID    uid.ID    ``
		Pos       int       ``
		CreatedAt time.Time ``
	}

	var mods []*Mods
	for rows.Next() {
		mod := &Mods{}
		if err = rows.Scan(&mod.UserID, &mod.Pos, &mod.CreatedAt); err != nil {
			return err
		}
		mods = append(mods, mod)
	}
	if err = rows.Err(); err != nil {
		return err
	}

	// Sort mods.
	sort.Slice(mods, func(i, j int) bool {
		if mods[i].Pos == mods[j].Pos {
			return mods[i].CreatedAt.Before(mods[j].CreatedAt)
		}
		return mods[i].Pos < mods[j].Pos
	})

	for i, mod := range mods {
		if _, err := db.ExecContext(ctx, "UPDATE community_mods SET position = ? WHERE user_id = ? AND community_id = ?", i, mod.UserID, c.ID); err != nil {
			return err
		}
	}
	return nil
}

// GetCommunityMods returns the list of moderators of community sorted by mod
// hierarchy.
func GetCommunityMods(ctx context.Context, db *sql.DB, community uid.ID) ([]*User, error) {
	rows, err := db.QueryContext(ctx, "SELECT user_id, position FROM community_mods WHERE community_id = ? ORDER BY position", community)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	type Temp struct {
		User   *User
		UserID uid.ID
		Pos    int
	}

	var items []*Temp
	var ids []uid.ID
	for rows.Next() {
		t := &Temp{}
		if err := rows.Scan(&t.UserID, &t.Pos); err != nil {
			return nil, err
		}
		items = append(items, t)
		ids = append(ids, t.UserID)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(items) == 0 {
		return nil, nil
	}

	users, err := GetUsersByIDs(ctx, db, ids, nil)
	if err != nil {
		if err == errUserNotFound {
			return nil, nil
		}
		return nil, err
	}

	for _, user := range users {
		found := false
		for _, t := range items {
			if t.UserID == user.ID {
				t.User = user
				found = true
			}
		}
		if !found {
			return nil, errors.New("could not found a matching user (fetching community core.Community)")
		}
	}

	var newUsers []*User
	for _, t := range items {
		newUsers = append(newUsers, t.User)
	}

	return newUsers, err
}

// MakeUserMod makes user a moderator of c. If user wasn't already a member of
// c, he's made into one. Calling the function with isMod = false removes user
// as a moderator of c.
//
// Viewer must be an admin or a higher up mod of c.
func MakeUserMod(ctx context.Context, db *sql.DB, c *Community, viewer uid.ID, user uid.ID, isMod bool) error {
	addMod := isMod
	if isMod {
		if is, err := c.UserMod(ctx, db, user); err != nil {
			return err
		} else if is {
			return nil
		}
	}

	actionUser, err := GetUser(ctx, db, viewer, nil)
	if err != nil {
		return err
	}

	if is, err := c.UserMod(ctx, db, viewer); err != nil {
		return err
	} else if !is {
		if !actionUser.Admin {
			return httperr.NewForbidden("not-mod-not-admin", "User is neither a moderator nor an admin.")
		}
	}

	// A mod is trying to remove a mod, allow only higher up mods to remove
	// lower down mods.
	//
	// A mod, however, is allowed to resign.
	if !addMod && !actionUser.Admin {
		higher, err := c.ModHigherUp(ctx, db, actionUser.ID, user)
		if err != nil {
			return err
		}
		if !higher && !(actionUser.ID == user) {
			return httperr.NewForbidden("lower-mod", "User is lower on the mod hierarchy.")
		}
	}

	err = makeUserMod(ctx, db, c, user, isMod)
	if err == nil {
		if err := c.FixModPositions(ctx, db); err != nil {
			log.Println("Fixing mod positions failed: ", err)
		}
		// send notification
		if isMod {
			if addedBy, err := GetUser(ctx, db, viewer, nil); err == nil {
				go func() {
					if err := CreateNewModAddNotification(context.Background(), db, user, c.Name, addedBy.Username); err != nil {
						log.Println("Failed to create mod_add notification: ", err)
					}
				}()
			}
		}

	}
	return err
}

// MakeUserModCLI adds or removes user as a mod of c. Do not use this function
// in an API.
func MakeUserModCLI(ctx context.Context, db *sql.DB, c *Community, user uid.ID, isMod bool) error {
	return makeUserMod(ctx, db, c, user, isMod)
}

// makeUserMod makes user a moderator of c, or, if isMod is false, user is
// removed as a moderator of c.
//
// It's okay to call this function if user is already a mod of c. It doesn't
// change anything.
func makeUserMod(ctx context.Context, db *sql.DB, c *Community, user uid.ID, isMod bool) error {
	// When changing the SQL queries of this function, make duplicate the
	// changes in User.Delete function as well.

	// First add user as member of c.
	if err := c.Join(ctx, db, user); err != nil {
		if e, ok := err.(*httperr.Error); ok {
			if e.HTTPStatus != http.StatusConflict {
				return err
			}
		} else {
			return err
		}
	}

	return msql.Transact(ctx, db, func(tx *sql.Tx) error {
		lowestPos := -1
		row := tx.QueryRowContext(ctx, "SELECT position FROM community_mods WHERE community_id = ? ORDER BY position DESC LIMIT 1", c.ID)
		if err := row.Scan(&lowestPos); err != nil {
			if err != sql.ErrNoRows {
				return err
			}
		}

		query := ""
		var args []any
		if isMod {
			query = "INSERT INTO community_mods (community_id, user_id, position) VALUES (?, ?, ?)"
			args = append(args, c.ID, user, lowestPos+1)
		} else {
			query = "DELETE FROM community_mods WHERE community_id = ? AND user_id = ?"
			args = append(args, c.ID, user)
		}

		if _, err := tx.ExecContext(ctx, query, args...); err != nil {
			if !(isMod && msql.IsErrDuplicateErr(err)) {
				return err
			}
		}

		if _, err := tx.ExecContext(ctx, "UPDATE community_members SET is_mod = ? WHERE community_id = ? AND user_id = ?", isMod, c.ID, user); err != nil {
			return err
		}
		return nil
	})
}

func (c *Community) AddRule(ctx context.Context, db *sql.DB, rule, description string, mod uid.ID) error {
	if is, err := c.UserModOrAdmin(ctx, db, mod); err != nil {
		return err
	} else if !is {
		return errNotMod
	}

	zIndex := 0
	row := db.QueryRowContext(ctx, "SELECT z_index FROM community_rules WHERE community_id = ? ORDER BY z_index DESC LIMIT 1", c.ID)
	if err := row.Scan(&zIndex); err != nil && err != sql.ErrNoRows {
		return err
	}

	var d any
	if description != "" {
		d = description
	}
	_, err := db.ExecContext(ctx, "INSERT INTO community_rules (rule, description, community_id, created_by, z_index) VALUES (?, ?, ?, ?, ?)", rule, d, c.ID, mod, zIndex+1)
	return err
}

func (c *Community) RemoveRule(ctx context.Context, db *sql.DB, ruleID string, mod uid.ID) error {
	if is, err := c.UserModOrAdmin(ctx, db, mod); err != nil {
		return err
	} else if !is {
		return errNotMod
	}
	_, err := db.ExecContext(ctx, "DELETE FROM community_rules WHERE id = ?", ruleID)
	return err
}

// FetchRules populates c.Rules.
func (c *Community) FetchRules(ctx context.Context, db *sql.DB) error {
	query := msql.BuildSelectQuery("community_rules", selectCommunityRuleCols, nil, "WHERE community_id = ?")
	rows, err := db.QueryContext(ctx, query, c.ID)
	if err != nil {
		return err
	}

	rules, err := scanCommunityRules(db, rows)
	if err != nil {
		if hErr, ok := err.(*httperr.Error); ok {
			if hErr.HTTPStatus != http.StatusNotFound {
				return err
			}
			// Fall through.
		} else {
			return err
		}
	}

	c.Rules = rules
	if c.Rules == nil {
		c.Rules = make([]*CommunityRule, 0)
	}
	return nil
}

type CommunityRule struct {
	ID          uint            `json:"id"`
	Rule        string          `json:"rule"`
	Description msql.NullString `json:"description"`
	CommunityID uid.ID          `json:"communityId"`
	ZIndex      int             `json:"zIndex"`
	CreatedBy   uid.ID          `json:"createdBy"`
	CreatedAt   time.Time       `json:"createdAt"`
}

var selectCommunityRuleCols = []string{
	"id",
	"rule",
	"description",
	"community_id",
	"created_by",
	"z_index",
	"created_at",
}

func GetCommunityRule(ctx context.Context, db *sql.DB, ruleID uint) (*CommunityRule, error) {
	query := msql.BuildSelectQuery("community_rules", selectCommunityRuleCols, nil, "WHERE id = ?")
	rows, err := db.QueryContext(ctx, query, ruleID)
	if err != nil {
		return nil, err
	}
	rules, err := scanCommunityRules(db, rows)
	if err != nil {
		return nil, err
	}
	return rules[0], nil
}

// scanCommunityRules returns an httperr.Error if no rules are found.
func scanCommunityRules(db *sql.DB, rows *sql.Rows) ([]*CommunityRule, error) {
	defer rows.Close()

	var rules []*CommunityRule
	var err error
	for rows.Next() {
		rule := &CommunityRule{}
		err = rows.Scan(&rule.ID,
			&rule.Rule,
			&rule.Description,
			&rule.CommunityID,
			&rule.CreatedBy,
			&rule.ZIndex,
			&rule.CreatedAt)
		if err != nil {
			return nil, err
		}
		rules = append(rules, rule)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(rules) == 0 {
		return nil, httperr.NewNotFound("rules-not-found", "Community rules not found.")
	}
	return rules, nil
}

// Update updates the rule's rule, description, and ZIndex.
func (r *CommunityRule) Update(ctx context.Context, db *sql.DB, mod uid.ID) error {
	if is, err := UserModOrAdmin(ctx, db, r.CommunityID, mod); err != nil {
		return err
	} else if !is {
		return errNotMod
	}
	_, err := db.ExecContext(ctx, "UPDATE community_rules SET rule = ?, description = ?, z_index = ? WHERE id = ?", r.Rule, r.Description, r.ZIndex, r.ID)
	return err
}

func (r *CommunityRule) Delete(ctx context.Context, db *sql.DB, mod uid.ID) error {
	if is, err := UserModOrAdmin(ctx, db, r.CommunityID, mod); err != nil {
		return err
	} else if !is {
		return errNotMod
	}
	_, err := db.ExecContext(ctx, "DELETE FROM community_rules WHERE id = ?", r.ID)
	return err
}

// CommunityReportsDetails holds summary information about user-reports
// submitted in a community.
type CommunityReportsDetails struct {
	NumReports        int `json:"noReports"`
	NumPostReports    int `json:"noPostReports"`
	NumCommentReports int `json:"noCommentReports"`
}

func FetchReportsDetails(ctx context.Context, db *sql.DB, community uid.ID) (d CommunityReportsDetails, err error) {
	row := db.QueryRowContext(ctx, "SELECT COUNT(*) FROM reports WHERE community_id = ?", community)
	if err = row.Scan(&d.NumReports); err != nil {
		return
	}
	row = db.QueryRowContext(ctx, "SELECT COUNT(*) FROM reports WHERE community_id = ? AND report_type = ?", community, ReportTypePost)
	if err = row.Scan(&d.NumPostReports); err != nil {
		return
	}
	row = db.QueryRowContext(ctx, "SELECT COUNT(*) FROM reports WHERE community_id = ? AND report_type = ?", community, ReportTypeComment)
	if err = row.Scan(&d.NumCommentReports); err != nil {
		return
	}
	return
}

// AddAllUsersToCommunity adds all users to community. Do not use this function
// outside of a CLI environment.
func AddAllUsersToCommunity(ctx context.Context, db *sql.DB, community string) error {
	var id uid.ID
	row := db.QueryRowContext(ctx, "SELECT id FROM communities WHERE name = ?", community)
	if err := row.Scan(&id); err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("community %v not found", community)
		}
		return err
	}

	return msql.Transact(ctx, db, func(tx *sql.Tx) error {
		query := `	INSERT INTO community_members (community_id, user_id) 
						SELECT communities.id, users.id FROM users 
						INNER JOIN communities ON communities.name = ? 
					WHERE users.id NOT IN (SELECT user_id FROM community_members WHERE community_id = ?)`
		if _, err := tx.ExecContext(ctx, query, community, id); err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, "UPDATE communities SET no_members = (SELECT COUNT(*) FROM users) WHERE name = ?", community); err != nil {
			return err
		}
		return nil
	})
}

// DeleteUnusedCommunities deletes communities older than n days with 0 posts in
// them. It returns the names (all in lowercase) of the deleted communities.
func DeleteUnusedCommunities(ctx context.Context, db *sql.DB, n uint, dryRun bool) ([]string, error) {
	var deleted []string
	err := msql.Transact(ctx, db, func(tx *sql.Tx) error {
		where := "WHERE posts_count = 0 AND created_at < ?"
		args := []any{time.Now().Add(time.Duration(n) * time.Hour * 24 * -1)}

		rows, err := tx.QueryContext(ctx, fmt.Sprintf("SELECT name_lc FROM communities %s", where), args...)
		if err != nil {
			return err
		}
		defer rows.Close()

		communities := []string{}
		for rows.Next() {
			var name string
			if err := rows.Scan(&name); err != nil {
				return err
			}
			communities = append(communities, name)
		}

		var b strings.Builder
		for i, name := range communities {
			if i > 0 {
				b.WriteString(", ")
			}
			b.WriteString(name)
		}

		if err := rows.Err(); err != nil {
			return err
		}

		if !dryRun {
			if _, err := tx.ExecContext(ctx, fmt.Sprintf("DELETE FROM communities %s", where), args...); err != nil {
				return err
			}
		}

		deleted = communities
		return nil
	})
	if err != nil {
		return nil, err
	}
	return deleted, nil
}

type CommunityRequest struct {
	ID              int             `json:"id"`
	ByUser          string          `json:"byUser"`
	CommunityName   string          `json:"communityName"`
	CommunityExists bool            `json:"communityExists"`
	Note            msql.NullString `json:"note"`
	CreatedAt       time.Time       `json:"createdAt"`
	DeniedNote      msql.NullString `json:"deniedNote"`
	DeniedBy        msql.NullString `json:"deniedBy"`
	DeniedAt        msql.NullTime   `json:"deniedAt"`
}

func CreateCommunityRequest(ctx context.Context, db *sql.DB, byUser, name, note string) error {
	exists, _, err := CommunityExists(ctx, db, name)
	if err != nil {
		return err
	}
	if exists {
		return &httperr.Error{
			HTTPStatus: http.StatusConflict,
			Code:       "community-already-exists",
			Message:    "The community you're requesting to create already exists",
		}
	}

	_, err = db.ExecContext(ctx, "INSERT INTO community_requests (by_user, community_name, community_name_lc, note) VALUES (?, ?, ?, ?)",
		byUser, name, strings.ToLower(name), note)
	if err != nil && msql.IsErrDuplicateErr(err) {
		return httperr.NewForbidden("previously-declined", "Your request for this community is pending or was declined before.")
	}
	return err
}

func GetCommunityRequests(ctx context.Context, db *sql.DB) ([]*CommunityRequest, error) {
	rows, err := db.QueryContext(ctx, `
		SELECT cr.id, cr.by_user, cr.community_name, cr.note, cr.created_at, c.id IS NOT NULL, cr.denied_note, cr.denied_by, cr.denied_at
		FROM community_requests AS cr 
		LEFT JOIN communities AS c ON cr.community_name_lc = c.name_lc 
		WHERE cr.created_at >  SUBDATE(NOW(), 90)
		ORDER BY created_at DESC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	requests := []*CommunityRequest{}
	for rows.Next() {
		r := &CommunityRequest{}
		if err := rows.Scan(&r.ID, &r.ByUser, &r.CommunityName, &r.Note, &r.CreatedAt, &r.CommunityExists,
			&r.DeniedNote, &r.DeniedBy, &r.DeniedAt); err != nil {
			return nil, err
		}
		requests = append(requests, r)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return requests, nil
}

func DeleteCommunityRequest(ctx context.Context, db *sql.DB, id int) error {
	_, err := db.ExecContext(ctx, "UPDATE community_requests SET deleted_at = ? WHERE id = ?", time.Now(), id)
	return err
}
