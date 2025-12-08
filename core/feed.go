package core

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/discuitnet/discuit/internal/httperr"
	msql "github.com/discuitnet/discuit/internal/sql"
	"github.com/discuitnet/discuit/internal/uid"
)

// FeedSort represents how the items in a feed are to be sorted.
type FeedSort int

const (
	FeedSortHot = FeedSort(iota)
	FeedSortLatest
	FeedSortActivity
	FeedSortTopDay
	FeedSortTopWeek
	FeedSortTopMonth
	FeedSortTopYear
	FeedSortTopAll
)

// Valid reports whether f is a valid FeedSort.
func (s FeedSort) Valid() bool {
	_, err := s.MarshalText()
	return err == nil
}

// MarshalText implements the encoding.TextMarshaler interface.
func (s FeedSort) MarshalText() ([]byte, error) {
	switch s {
	case FeedSortLatest:
		return []byte("latest"), nil
	case FeedSortTopDay:
		return []byte("day"), nil
	case FeedSortTopWeek:
		return []byte("week"), nil
	case FeedSortTopMonth:
		return []byte("month"), nil
	case FeedSortTopYear:
		return []byte("year"), nil
	case FeedSortTopAll:
		return []byte("all"), nil
	case FeedSortHot:
		return []byte("hot"), nil
	case FeedSortActivity:
		return []byte("activity"), nil
	}
	return nil, fmt.Errorf("cannot marshal unsupported FeedSort (%v)", int(s))
}

// UnmarshalText implements the encoding.TextUnmarshaler interface.
func (s *FeedSort) UnmarshalText(text []byte) error {
	if s == nil {
		s = new(FeedSort)
	}

	t := string(text)
	switch t {
	case "latest":
		*s = FeedSortLatest
	case "day":
		*s = FeedSortTopDay
	case "week":
		*s = FeedSortTopWeek
	case "month":
		*s = FeedSortTopMonth
	case "year":
		*s = FeedSortTopYear
	case "all":
		*s = FeedSortTopAll
	case "hot":
		*s = FeedSortHot
	case "activity":
		*s = FeedSortActivity
	default:
		return fmt.Errorf("cannot unmarshal unsupported FeedSort: %v", t)
	}
	return nil
}

type FeedType int

const (
	FeedTypeAll = FeedType(iota)
	FeedTypeSubscriptions
	FeedTypeModding
	FeedTypeCommunity
	FeedTypeUser
)

func (ft FeedType) Valid() bool {
	_, err := ft.MarshalText()
	return err == nil
}

func (ft FeedType) String() string {
	b, err := ft.MarshalText()
	if err != nil {
		return ""
	}
	return string(b)
}

// MarshalText implements the encoding.TextMarshaler interface.
func (ft FeedType) MarshalText() ([]byte, error) {
	switch ft {
	case FeedTypeAll:
		return []byte("all"), nil
	case FeedTypeSubscriptions:
		return []byte("subscriptions"), nil
	case FeedTypeModding:
		return []byte("modding"), nil
	case FeedTypeCommunity:
		return []byte("community"), nil
	case FeedTypeUser:
		return []byte("user"), nil
	}
	return nil, fmt.Errorf("cannot marshal unsupported FeedType (%v)", int(ft))
}

// UnmarshalText implements the encoding.TextUnmarshaler interface.
func (ft *FeedType) UnmarshalText(text []byte) error {
	if ft == nil {
		ft = new(FeedType)
	}

	switch string(text) {
	case "all":
		*ft = FeedTypeAll
	case "subscriptions":
		*ft = FeedTypeSubscriptions
	case "modding":
		*ft = FeedTypeModding
	case "community":
		*ft = FeedTypeCommunity
	case "user":
		*ft = FeedTypeUser
	default:
		return fmt.Errorf("cannot unmarshal text unsupported text: %v", string(text))
	}
	return nil
}

// FeedResultSet is a page of results of a feed.
type FeedResultSet struct {
	Posts []*Post     `json:"posts"`
	Next  interface{} `json:"next"`
}

func newFeedResultSet(posts []*Post, limit int, sort FeedSort) *FeedResultSet {
	max := limit
	var nextnext interface{}
	if len(posts) < limit+1 {
		max = len(posts)
	} else {
		switch sort {
		case FeedSortTopAll, FeedSortTopYear, FeedSortTopMonth, FeedSortTopWeek, FeedSortTopDay:
			nextnext = strconv.Itoa(posts[limit].Points) + "." + posts[limit].ID.String()
		case FeedSortLatest:
			nextnext = posts[limit].ID
		case FeedSortHot:
			nextnext = strconv.Itoa(posts[limit].Hotness) + "." + posts[limit].ID.String()
		case FeedSortActivity:
			nextnext = posts[limit].LastActivityAt.UnixNano()
		default:
			// Shouldn't happen, ever.
			panic("invalid feed sort")
		}
	}

	return &FeedResultSet{
		Posts: posts[:max],
		Next:  nextnext,
	}
}

func NextPointsIDCursor(text string) (p int, id *uid.ID, err error) {
	i := strings.Index(text, ".")
	if i == -1 || len(text) < i+2 {
		err = errors.New("text too short")
		return
	}
	if p, err = strconv.Atoi(text[:i]); err != nil {
		return
	}
	id = new(uid.ID)
	if err = id.UnmarshalText([]byte(text[i+1:])); err != nil {
		id = nil
	}
	return
}

func homeFeedWhereClause(ctx context.Context, db *sql.DB, user uid.ID, where string, args []any) (string, []any, error) {
	rows, err := db.QueryContext(ctx, "SELECT community_members.community_id FROM community_members WHERE community_members.user_id = ?", user)
	if err != nil {
		return where, args, err
	}
	defer rows.Close()

	var communityIDs []any
	for rows.Next() {
		var cid uid.ID
		if err := rows.Scan(&cid); err != nil {
			return where, args, err
		}
		communityIDs = append(communityIDs, cid)
	}

	if err := rows.Err(); err != nil {
		return where, args, err
	}

	joiner := ""
	if where != "" {
		joiner = "AND"
	}

	if len(communityIDs) == 0 {
		// User is not subscribed to any communities. Use the sentinel value of
		// zero-bytes community ID, which no community would have, to return an
		// empty result set.
		where = fmt.Sprintf("%s %s community_id = ? ", where, joiner)
		args = append(args, uid.ID{})
		return where, args, nil
	}

	where = fmt.Sprintf("%s %s community_id IN %s ", where, joiner, msql.InClauseQuestionMarks(len(communityIDs)))
	args = append(args, communityIDs...)

	return where, args, nil
}

func moddingFeedWhereClause(ctx context.Context, db *sql.DB, user uid.ID, where string, args []any) (string, []any, error) {
	rows, err := db.QueryContext(ctx, "SELECT community_mods.community_id FROM community_mods WHERE community_mods.user_id = ?", user)
	if err != nil {
		return where, args, err
	}
	defer rows.Close()

	var communityIDs []any
	for rows.Next() {
		var cid uid.ID
		if err := rows.Scan(&cid); err != nil {
			return where, args, err
		}
		communityIDs = append(communityIDs, cid)
	}

	if err := rows.Err(); err != nil {
		return where, args, err
	}

	joiner := ""
	if where != "" {
		joiner = "AND"
	}

	if len(communityIDs) == 0 {
		// User is not subscribed to any communities. Use the sentinel value of
		// zero-bytes community ID, which no community would have, to return an
		// empty result set.
		where = fmt.Sprintf("%s %s community_id = ? ", where, joiner)
		args = append(args, uid.ID{})
		return where, args, nil
	}

	where = fmt.Sprintf("%s %s community_id IN %s ", where, joiner, msql.InClauseQuestionMarks(len(communityIDs)))
	args = append(args, communityIDs...)

	return where, args, nil
}

type FeedOptions struct {
	Feed        FeedType
	Sort        FeedSort
	DefaultSort bool
	Viewer      *uid.ID
	Community   *uid.ID // Community should be nil if Homefeed is true.
	// Homefeed    bool    // If true, the requested feed is the feed with only posts from communities where the user is a member
	Limit int
	Next  string // The pagination cursor, taken from previous API response.
}

var (
	ErrInvalidFeedCursor = httperr.NewBadRequest("invalid_cursor", "Invalid feed pagination cursor.")
	ErrInvalidFeedSort   = httperr.NewBadRequest("invalid-sort", "Invalid feed sort.")
)

// nextID parses o.Next assuming it contains an uid.ID.
func (o *FeedOptions) nextID() (_ uid.ID, err error) {
	var id uid.ID
	if err = id.UnmarshalText([]byte(o.Next)); err != nil {
		err = ErrInvalidFeedCursor
	}
	return id, err
}

// nextPointsID parses o.Next assuming it contains a pair of points and uid.ID.
func (o *FeedOptions) nextPointsID() (int, uid.ID, error) {
	var id uid.ID
	i, gotId, err := NextPointsIDCursor(o.Next)
	if gotId != nil {
		id = *gotId
	}
	if err != nil {
		err = ErrInvalidFeedCursor
	}
	return i, id, err
}

// nextInt64 parses o.Next assuming it contains an int64.
func (o *FeedOptions) nextInt64() (i int64, err error) {
	i, err = strconv.ParseInt(o.Next, 10, 64)
	if err != nil {
		err = ErrInvalidFeedCursor
	}
	return
}

func GetFeed(ctx context.Context, db *sql.DB, opts *FeedOptions) (_ *FeedResultSet, err error) {
	if !opts.Sort.Valid() {
		return nil, ErrInvalidFeedSort
	}
	var set *FeedResultSet
	if opts.Sort == FeedSortLatest {
		set, err = getPostsLatest(ctx, db, opts)
	} else if opts.Sort == FeedSortHot {
		set, err = getPostsHot(ctx, db, opts)
	} else if opts.Sort == FeedSortActivity {
		set, err = getPostsActivity(ctx, db, opts)
	} else {
		set, err = getPostsTop(ctx, db, opts)
	}
	if err != nil {
		return nil, err
	}
	if opts.DefaultSort {
		// Merge pinned posts.
		return mergePinnedPosts(ctx, db, opts.Viewer, opts.Community, opts.Next, set)
	}
	return set, err
}

// getPostsLatest returns site wide latest posts, if opts.Community is nil, or
// latest posts in opts.Community, if not.
func getPostsLatest(ctx context.Context, db *sql.DB, opts *FeedOptions) (*FeedResultSet, error) {
	var args []any
	loggedIn := opts.Viewer != nil

	if loggedIn {
		args = append(args, opts.Viewer, opts.Viewer)
	}
	where := "WHERE posts.deleted = FALSE "
	switch opts.Feed {
	case FeedTypeAll:
	case FeedTypeSubscriptions:
		var err error
		where, args, err = homeFeedWhereClause(ctx, db, *opts.Viewer, where, args)
		if err != nil {
			return nil, err
		}
	case FeedTypeModding:
		var err error
		where, args, err = moddingFeedWhereClause(ctx, db, *opts.Viewer, where, args)
		if err != nil {
			return nil, err
		}
	case FeedTypeCommunity:
		where += "AND community_id = ? "
		args = append(args, *opts.Community)
	}
	if loggedIn && opts.Feed != FeedTypeModding {
		where, args = whereMutedAndHidden(where, "posts", args, *opts.Viewer, opts.Feed == FeedTypeAll)
	}
	if opts.Next != "" {
		next, err := opts.nextID()
		if err != nil {
			return nil, err
		}
		where += "AND posts.id <= ? "
		args = append(args, next)
	}
	where += "ORDER BY posts.id DESC LIMIT ?"
	query := buildSelectPostQuery(loggedIn, where)

	var rows *sql.Rows
	var err error
	args = append(args, opts.Limit+1)
	rows, err = db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}

	posts, err := scanPosts(ctx, db, rows, opts.Viewer)
	if err != nil {
		if err == errPostNotFound {
			return &FeedResultSet{}, nil
		}
		return nil, err
	}
	return newFeedResultSet(posts, opts.Limit, FeedSortLatest), nil
}

func sortFeedToTable(s FeedSort) string {
	switch s {
	case FeedSortTopDay:
		return "posts_today"
	case FeedSortTopWeek:
		return "posts_week"
	case FeedSortTopMonth:
		return "posts_month"
	case FeedSortTopYear:
		return "posts_year"
	default:
		panic(fmt.Sprintf("cannot convert FeedSort (%v) to string", s))
	}
}

func scanIDs(rows *sql.Rows) ([]uid.ID, error) {
	defer rows.Close()
	var ids []uid.ID
	for rows.Next() {
		id := uid.ID{}
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

// mergePinnedPosts fetches site-wide pinned posts, if community is nil, or
// community-wide pinned posts, if not, and merges them to rs.
func mergePinnedPosts(ctx context.Context, db *sql.DB, viewer, community *uid.ID, next string, rs *FeedResultSet) (*FeedResultSet, error) {
	if next != "" {
		return rs, nil
	}

	pinned, err := getPinnedPosts(ctx, db, viewer, community)
	if err != nil {
		return nil, err
	}

	var notPinned []*Post
	for _, post := range rs.Posts {
		if community == nil {
			if !post.PinnedSite {
				notPinned = append(notPinned, post)
			}
		} else {
			if !post.Pinned {
				notPinned = append(notPinned, post)
			}
		}
	}
	rs.Posts = append(pinned, notPinned...)
	return rs, nil
}

func whereMutedAndHidden(where, postsTable string, args []any, viewer uid.ID, muteCommunities bool) (string, []any) {
	if !(where == "" || strings.TrimSpace(strings.ToUpper(where)) == "WHERE") {
		where += "AND "
	}
	if muteCommunities {
		where += "community_id NOT IN (SELECT community_id FROM muted_communities WHERE user_id = ?) AND "
		args = append(args, viewer)
	}
	where += postsTable + ".user_id NOT IN (SELECT muted_user_id FROM muted_users WHERE user_id = ?) "
	args = append(args, viewer)

	colName := "id"
	if postsTable != "posts" {
		colName = "post_id"
	}
	where += fmt.Sprintf(" AND %s.%s NOT IN (SELECT post_id FROM hidden_posts WHERE user_id = ?) ", postsTable, colName)
	args = append(args, viewer)

	return where, args
}

// getPostsHot returns site wide hot posts, if opts.Community is nil, or hot
// posts in opts.Community, if not.
func getPostsHot(ctx context.Context, db *sql.DB, opts *FeedOptions) (*FeedResultSet, error) {
	var args []any
	loggedIn := opts.Viewer != nil

	if loggedIn {
		args = append(args, opts.Viewer, opts.Viewer)
	}
	where := "WHERE posts.deleted = FALSE "
	switch opts.Feed {
	case FeedTypeAll:
	case FeedTypeSubscriptions:
		var err error
		where, args, err = homeFeedWhereClause(ctx, db, *opts.Viewer, where, args)
		if err != nil {
			return nil, err
		}
	case FeedTypeModding:
		var err error
		where, args, err = moddingFeedWhereClause(ctx, db, *opts.Viewer, where, args)
		if err != nil {
			return nil, err
		}
	case FeedTypeCommunity:
		where += "AND community_id = ? "
		args = append(args, *opts.Community)

	}
	if loggedIn && opts.Feed != FeedTypeModding {
		where, args = whereMutedAndHidden(where, "posts", args, *opts.Viewer, opts.Feed == FeedTypeAll)
	}
	if opts.Next != "" {
		nextHotness, nextID, err := opts.nextPointsID()
		if err != nil {
			return nil, err
		}
		where += "AND (posts.hotness, posts.id) <= (?, ?) "
		args = append(args, nextHotness)
		args = append(args, nextID)
	}
	where += "ORDER BY posts.hotness DESC, posts.id DESC LIMIT ?"
	query := buildSelectPostQuery(loggedIn, where)

	var rows *sql.Rows
	var err error
	args = append(args, opts.Limit+1)
	rows, err = db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}

	posts, err := scanPosts(ctx, db, rows, opts.Viewer)
	if err != nil {
		if err == errPostNotFound {
			return &FeedResultSet{}, nil
		}
		return nil, err
	}
	return newFeedResultSet(posts, opts.Limit, FeedSortHot), nil
}

// getPostsTopAll returns site wide all time top posts, if opts.Community is
// nil, or all time top posts in opts.Community, if not.
func getPostsTopAll(ctx context.Context, db *sql.DB, opts *FeedOptions) (*FeedResultSet, error) {
	loggedIn := opts.Viewer != nil
	var args []any
	if loggedIn {
		args = append(args, *opts.Viewer, *opts.Viewer)
	}

	where := "WHERE deleted = FALSE "
	switch opts.Feed {
	case FeedTypeAll:
	case FeedTypeSubscriptions:
		var err error
		where, args, err = homeFeedWhereClause(ctx, db, *opts.Viewer, where, args)
		if err != nil {
			return nil, err
		}
	case FeedTypeModding:
		var err error
		where, args, err = moddingFeedWhereClause(ctx, db, *opts.Viewer, where, args)
		if err != nil {
			return nil, err
		}
	case FeedTypeCommunity:
		where += "AND community_id = ? "
		args = append(args, *opts.Community)

	}
	if loggedIn && opts.Feed != FeedTypeModding {
		where, args = whereMutedAndHidden(where, "posts", args, *opts.Viewer, opts.Feed == FeedTypeAll)
	}
	if opts.Next != "" {
		nextPoints, nextID, err := opts.nextPointsID()
		if err != nil {
			return nil, err
		}
		where += "AND (posts.points, posts.id) <= (?, ?) "
		args = append(args, nextPoints)
		args = append(args, nextID)
	}
	where += "ORDER BY posts.points DESC, posts.id DESC LIMIT ?"
	args = append(args, opts.Limit+1)
	query := buildSelectPostQuery(loggedIn, where)

	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}

	posts, err := scanPosts(ctx, db, rows, opts.Viewer)
	if err != nil {
		if err == errPostNotFound {
			return &FeedResultSet{}, nil
		}
		return nil, err
	}
	return newFeedResultSet(posts, opts.Limit, FeedSortTopAll), nil
}

// getPostsTop returns site wide top posts (daily, weekly, etc), if
// opts.Community is nil, or top posts (daily, weekly, etc) in opts.Community,
// if not.
func getPostsTop(ctx context.Context, db *sql.DB, opts *FeedOptions) (*FeedResultSet, error) {
	if opts.Sort == FeedSortTopAll {
		return getPostsTopAll(ctx, db, opts)
	}
	table := sortFeedToTable(opts.Sort)

	var args []any
	query := fmt.Sprintf("SELECT post_id FROM %s ", table)
	where := ""
	switch opts.Feed {
	case FeedTypeAll:
	case FeedTypeSubscriptions:
		var err error
		where, args, err = homeFeedWhereClause(ctx, db, *opts.Viewer, where, args)
		if err != nil {
			return nil, err
		}
	case FeedTypeModding:
		var err error
		where, args, err = moddingFeedWhereClause(ctx, db, *opts.Viewer, where, args)
		if err != nil {
			return nil, err
		}
	case FeedTypeCommunity:
		where += "AND community_id = ? "
		args = append(args, *opts.Community)

	}
	if opts.Viewer != nil && opts.Feed != FeedTypeModding {
		where, args = whereMutedAndHidden(where, table, args, *opts.Viewer, opts.Feed == FeedTypeAll)
	}
	if opts.Next != "" {
		nextPoints, nextID, err := opts.nextPointsID()
		if err != nil {
			return nil, err
		}
		if where != "" {
			where += " AND "
		}
		where += "(points, id) <= (?, ?) "
		args = append(args, nextPoints)
		args = append(args, nextID)
	}
	if where != "" {
		where = "WHERE " + where
	}
	query += where + "ORDER BY points DESC, post_id DESC LIMIT ?"
	args = append(args, opts.Limit+1)

	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}

	ids, err := scanIDs(rows)
	if err != nil {
		return nil, err
	}

	if ids == nil { // 0 posts
		return &FeedResultSet{}, nil
	}

	posts, err := getPostsList(ctx, db, opts.Viewer, ids...)
	if err != nil {
		return nil, err
	}
	return newFeedResultSet(posts, opts.Limit, opts.Sort), nil
}

// getPostsActivity returns site wide posts sorted by activity, if
// opts.Community is nil, or community-wide posts sorted by activity, if not.
func getPostsActivity(ctx context.Context, db *sql.DB, opts *FeedOptions) (*FeedResultSet, error) {
	var args []interface{}
	loggedIn := opts.Viewer != nil

	if loggedIn {
		args = append(args, opts.Viewer, opts.Viewer)
	}
	where := "WHERE posts.deleted = FALSE "
	switch opts.Feed {
	case FeedTypeAll:
	case FeedTypeSubscriptions:
		var err error
		where, args, err = homeFeedWhereClause(ctx, db, *opts.Viewer, where, args)
		if err != nil {
			return nil, err
		}
	case FeedTypeModding:
		var err error
		where, args, err = moddingFeedWhereClause(ctx, db, *opts.Viewer, where, args)
		if err != nil {
			return nil, err
		}
	case FeedTypeCommunity:
		where += "AND community_id = ? "
		args = append(args, *opts.Community)

	}
	if loggedIn && opts.Feed != FeedTypeModding {
		where, args = whereMutedAndHidden(where, "posts", args, *opts.Viewer, opts.Feed == FeedTypeAll)
	}
	if opts.Next != "" {
		next, err := opts.nextInt64()
		if err != nil {
			return nil, err
		}
		if next > -1 {
			where += "AND posts.last_activity_at <= ? "
			args = append(args, time.Unix(0, next))
		}
	}
	where += "ORDER BY posts.last_activity_at DESC LIMIT ?"
	query := buildSelectPostQuery(loggedIn, where)

	var rows *sql.Rows
	var err error
	args = append(args, opts.Limit+1)
	rows, err = db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}

	posts, err := scanPosts(ctx, db, rows, opts.Viewer)
	if err != nil {
		if err == errPostNotFound {
			return &FeedResultSet{}, nil
		}
		return nil, err
	}
	return newFeedResultSet(posts, opts.Limit, FeedSortActivity), nil
}

// getPostsList returns a slice of posts that are ordered by points.
func getPostsList(ctx context.Context, db *sql.DB, viewer *uid.ID, ids ...uid.ID) ([]*Post, error) {
	loggedIn := viewer != nil
	where := fmt.Sprintf("WHERE posts.id IN %s ORDER BY posts.points DESC, posts.id DESC", msql.InClauseQuestionMarks(len(ids)))
	query := buildSelectPostQuery(loggedIn, where)

	var args []any
	if loggedIn {
		args = append(args, *viewer, *viewer)
	}
	for _, id := range ids {
		args = append(args, id)
	}

	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	return scanPosts(ctx, db, rows, viewer)
}

// GetPostsDeleted returns a slice of deleted posts (sorted by ID) and the
// number of deleted posts in community.
func GetPostsDeleted(ctx context.Context, db *sql.DB, community uid.ID, limit, page int) (int, []*Post, error) {
	count := 0
	row := db.QueryRowContext(ctx, "SELECT COUNT(*) FROM posts WHERE community_id = ? AND posts.deleted = TRUE", community)
	if err := row.Scan(&count); err != nil {
		return 0, nil, err
	}

	query := buildSelectPostQuery(false, "WHERE community_id = ? AND posts.deleted = TRUE ORDER BY communities.id DESC LIMIT ? OFFSET ?")
	rows, err := db.QueryContext(ctx, query, community, limit, limit*(page-1))
	if err != nil {
		return 0, nil, err
	}

	posts, err := scanPosts(ctx, db, rows, nil)
	if err != nil {
		return 0, nil, err
	}
	return count, posts, nil
}

// GetPostsLocked returns a slice of locked posts (sorted by ID) and the number
// of locked posts in community.
func GetPostsLocked(ctx context.Context, db *sql.DB, community uid.ID, limit, page int) (int, []*Post, error) {
	count := 0
	row := db.QueryRowContext(ctx, "SELECT COUNT(*) FROM posts WHERE community_id = ? AND posts.deleted = FALSE AND locked = TRUE", community)
	if err := row.Scan(&count); err != nil {
		return 0, nil, err
	}

	query := buildSelectPostQuery(false, "WHERE community_id = ? AND posts.deleted = FALSE AND locked = TRUE ORDER BY communities.id DESC LIMIT ? OFFSET ?")
	rows, err := db.QueryContext(ctx, query, community, limit, limit*(page-1))
	if err != nil {
		return 0, nil, err
	}

	posts, err := scanPosts(ctx, db, rows, nil)
	if err != nil {
		return 0, nil, err
	}
	return count, posts, nil
}

// UserFeedItem is an item in a user page's feed.
type UserFeedItem struct {
	// Item is either a post or a comment.
	Item any `json:"item"`
	// Type is Item's type.
	Type ContentType `json:"type"`
}

// UserFeedResultSet holds the user page's feed's items.
type UserFeedResultSet struct {
	Items []UserFeedItem `json:"items"`
	Next  *uid.ID        `json:"next"`
}

func GetUserFeed(ctx context.Context, db *sql.DB, viewer *uid.ID, userID uid.ID, filter string, limit int, next *uid.ID) (*UserFeedResultSet, error) {
	if !(filter == "posts" || filter == "comments" || filter == "") {
		return nil, httperr.NewBadRequest("invalid-filter", "filter must be one of 'posts' or 'comments' or it must be empty")
	}

	query := "SELECT target_id, target_type FROM posts_comments WHERE user_id = ? "
	args := []any{userID}

	if filter != "" {
		query += "AND target_type = ? "
		t := ContentTypePost
		if filter == "comments" {
			t = ContentTypeComment
		}
		args = append(args, t)
	}

	// Show posts and comments deleted by someone other than their author to
	// admins. If the viewer is not an admin, hide them entirely (even if the
	// comment content is purged).
	if is, err := IsAdmin(db, viewer); err != nil {
		return nil, err
	} else if !is {
		query += "AND deleted = false "
	}

	if next != nil {
		query += "AND target_id <= ? "
		args = append(args, *next)
	}
	query += "ORDER BY target_id DESC LIMIT ?"
	args = append(args, limit+1)

	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}

	var ids []uid.ID
	var types []ContentType
	for rows.Next() {
		id := uid.ID{}
		var t ContentType
		if err = rows.Scan(&id, &t); err != nil {
			return nil, err
		}
		ids = append(ids, id)
		types = append(types, t)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(ids) == 0 {
		return &UserFeedResultSet{Items: []UserFeedItem{}}, nil
	}

	max := len(ids) - 1
	if len(ids) < limit+1 {
		max = len(ids)
	}
	var (
		set             = &UserFeedResultSet{Items: make([]UserFeedItem, max)}
		postIDs         = make([]uid.ID, 0, max)
		commentIDs      = make([]uid.ID, 0, max)
		postItemsMap    = make(map[uid.ID]*UserFeedItem, max)
		commentItemsMap = make(map[uid.ID]*UserFeedItem, max)
	)
	for i := 0; i < max; i++ {
		item := &set.Items[i]
		item.Type = types[i]
		if types[i] == ContentTypePost {
			postIDs = append(postIDs, ids[i])
			postItemsMap[ids[i]] = item
		} else if types[i] == ContentTypeComment {
			commentIDs = append(commentIDs, ids[i])
			commentItemsMap[ids[i]] = item
		}
	}

	if len(postIDs) > 0 {
		posts, err := GetPostsByIDs(ctx, db, viewer, true, postIDs...)
		if err != nil {
			return nil, err
		}
		for _, post := range posts {
			postItemsMap[post.ID].Item = post
		}
	}

	if len(commentIDs) > 0 {
		comments, err := GetCommentsByIDs(ctx, db, viewer, commentIDs...)
		if err != nil {
			return nil, err
		}
		for _, comment := range comments {
			commentItemsMap[comment.ID].Item = comment
		}
		if err := getCommentsPostTitles(ctx, db, comments, viewer); err != nil {
			return nil, err
		}
	}

	if len(ids) == limit+1 {
		set.Next = &ids[limit]
	}
	return set, nil
}

func getCommentsPostTitles(ctx context.Context, db *sql.DB, comments []*Comment, viewer *uid.ID) error {
	postIDs := make([]uid.ID, len(comments))
	postTitles := make(map[uid.ID]string, len(comments))
	for i, comment := range comments {
		postIDs[i] = comment.PostID
	}

	posts, err := GetPostsByIDs(ctx, db, viewer, true, postIDs...)
	if err != nil {
		return err
	}

	for _, post := range posts {
		if post.Title == "" {
			return fmt.Errorf("populating comments' postTitle, could not find post title of post id %v", post.ID)
		}

		if _, ok := postTitles[post.ID]; ok {
			continue
		}

		postTitles[post.ID] = post.Title
	}

	for _, comment := range comments {
		comment.PostTitle = postTitles[comment.PostID]
	}

	return nil
}

// func getPostsModding(ctx context.Context, db *sql.DB, userID uid.ID, opts *FeedOptions) (*FeedResultSet, error) {
// 	// comms, err := getUserModdingCommunities(ctx, db, userID)
// 	// if err != nil {
// 	// 	return nil, err
// 	// }
//
// 	var args []any
// 	loggedIn := opts.Viewer != nil
//
// 	if loggedIn {
// 		args = append(args, opts.Viewer, opts.Viewer)
// 	}
// 	where := "WHERE posts.deleted = FALSE"
//
// 	if opts.Next != "" {
// 		next, err := opts.next
// 	}
//
// 	query := buildSelectPostQuery(loggedIn, "posts.community_id in (SELECT community_mods.community_id FROM community_mods WHERE user_id = ?)")
// 	args = append(args, userID)
//
// 	return nil, nil
// }
