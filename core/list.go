package core

import (
	"context"
	"database/sql"
	"fmt"
	"strconv"
	"time"

	msql "github.com/discuitnet/discuit/internal/sql"
	"github.com/discuitnet/discuit/internal/uid"
)

type ListItemsSort int

const (
	ListItemsSortByAddedDsc = ListItemsSort(iota)
	ListItemsSortByAddedAsc
	ListItemsSortByCreatedDesc
	ListItemsSortByCreatedAsc
)

func (o ListItemsSort) String() string {
	switch o {
	case ListItemsSortByAddedDsc:
		return "addedDsc"
	case ListItemsSortByAddedAsc:
		return "addedAsc"
	case ListItemsSortByCreatedDesc:
		return "createdDsc"
	case ListItemsSortByCreatedAsc:
		return "createdAsc"
	}
	return "" // Unsupported list sort.
}

type List struct {
	ID            int           `json:"id"`
	UserID        uid.ID        `json:"userId"`
	Name          string        `json:"name"`
	DisplayName   string        `json:"displayName"`
	Public        bool          `json:"public"`
	NumItmes      int           `json:"numItems"`
	Sort          ListItemsSort `json:"sort"` // current sort
	CreatedAt     time.Time     `json:"createdAt"`
	LastUpdatedAt time.Time     `json:"lastUpdatedAt"`
}

// GetUsersLists returns all the lists of user.
func GetUsersLists(ctx context.Context, db *sql.DB, user uid.ID) ([]*List, error) {
	query := msql.BuildSelectQuery("lists", []string{
		"lists.id",
		"lists.user_id",
		"lists.name",
		"lists.dispaly_name",
		"lists.public",
		"lists.num_items",
		"lists.ordering",
		"lists.created_at",
		"lists.last_updated_at",
	}, nil, "WHERE user_id = ? ORDER BY last_updated_at DESC")

	rows, err := db.QueryContext(ctx, query, user)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var lists []*List
	for rows.Next() {
		list := &List{}
		err = rows.Scan(
			&list.ID,
			&list.UserID,
			&list.Name,
			&list.DisplayName,
			&list.Public,
			&list.NumItmes,
			&list.Sort,
			&list.CreatedAt,
			&list.LastUpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		lists = append(lists, list)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return lists, nil
}

type ListItem struct {
	ID         int       `json:"id"`
	ListID     int       `json:"listId"`
	TargetType int       `json:"targetType"`
	TargetID   uid.ID    `json:"targetId"`
	CreatedAt  time.Time `json:"createdAt"` // When the list item was created, not the target item.

	TargetItem any `json:"targetItem"` // Either a Post or a Comment.
}

// The next string should contain either a timestamp or a marshaled uid.ID; if
// not, the function will return an error. It's safe for next to be nil.
func GetListItems(ctx context.Context, db *sql.DB, listID, limit int, sort ListItemsSort, next *string, viewer *uid.ID) (*ListItemsResultSet, error) {
	query := "SELECT id, target_type, target_id, created_at FROM list_items WHERE list_id = ?"
	args := []any{listID}

	// Parse the pagination cursor, if present.
	if next != nil {
		if sort == ListItemsSortByAddedAsc || sort == ListItemsSortByAddedDsc {
			// next should be a time.Time value.
			i, err := strconv.ParseInt(*next, 10, 64)
			if err != nil {
				return nil, fmt.Errorf("failed to parse next (GetListItems, time): %w", err)
			}
			nextTime := time.Unix(i, 0)
			if sort == ListItemsSortByAddedAsc {
				query += " AND created_at > ?"
			} else {
				// order is ListItemsSortByAddedDsc.
				query += " AND created_at < ?"
			}
			args = append(args, nextTime)
		} else {
			// next should be a uid.ID.
			nextID, err := uid.FromString(*next)
			if err != nil {
				return nil, fmt.Errorf("failed to parse next (GetListItems, uid.ID): %w", err)
			}
			if sort == ListItemsSortByCreatedAsc {
				query += " AND target_id > ?"
			} else {
				// order is ListItemsSortByCreatedDsc
				query += " AND target_id < ?"
			}
			args = append(args, nextID)
		}
	}

	orderBy := ""
	switch sort {
	case ListItemsSortByAddedAsc:
		orderBy = "created_at ASC"
	case ListItemsSortByAddedDsc:
		orderBy = "created_at DESC"
	case ListItemsSortByCreatedAsc:
		orderBy = "target_id ASC"
	case ListItemsSortByCreatedDesc:
		orderBy = "target_id ASC"
	}
	query += " ORDER BY " + orderBy

	if limit > 0 {
		query += fmt.Sprintf(" LIMIT %d", limit+1) // +1 for an extra item for the next cursor.
	}

	// Fetch the rows.
	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []*ListItem
	for rows.Next() {
		item := &ListItem{ListID: listID}
		err := rows.Scan(
			&item.ID,
			&item.TargetType,
			&item.TargetID,
			&item.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Return the result set.
	set := &ListItemsResultSet{}
	if len(items) > limit {
		lastItem := items[len(items)-1]
		set.Next = new(string)
		if sort == ListItemsSortByAddedAsc || sort == ListItemsSortByAddedDsc {
			// Sort by added at.
			*set.Next = strconv.FormatInt(lastItem.CreatedAt.Unix(), 10)
		} else {
			// Sort by target created at.
			*set.Next = lastItem.TargetID.String()
		}
		set.Items = items[:len(items)-1]
	} else {
		set.Items = items
	}

	// Fetch the posts and comments.
	var (
		postIDs         = make([]uid.ID, 0, len(set.Items))
		postItemsMap    = make(map[uid.ID]*ListItem, len(set.Items))
		commentIDs      = make([]uid.ID, 0, len(set.Items))
		commentItemsMap = make(map[uid.ID]*ListItem, len(set.Items))
	)
	for _, item := range set.Items {
		if item.TargetType == postsCommentsTypePosts {
			postIDs = append(postIDs, item.TargetID)
			postItemsMap[item.TargetID] = item
		} else if item.TargetType == postsCommentsTypeComments {
			commentIDs = append(commentIDs, item.TargetID)
			commentItemsMap[item.TargetID] = item
		}
	}

	posts, err := GetPostsByIDs(ctx, db, viewer, true, postIDs...)
	if err != nil {
		return nil, err
	}
	for _, post := range posts {
		postItemsMap[post.ID].TargetItem = post
	}

	comments, err := GetCommentsByIDs(ctx, db, viewer, commentIDs...)
	if err != nil {
		return nil, err
	}
	for _, comment := range comments {
		commentItemsMap[comment.ID].TargetItem = comment
	}

	return set, nil
}

type ListItemsResultSet struct {
	Items []*ListItem `json:"items"`
	Next  *string     `json:"next"` // either a timestamp or a uid.ID.
}
