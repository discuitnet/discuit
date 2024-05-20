package core

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/discuitnet/discuit/internal/httperr"
	msql "github.com/discuitnet/discuit/internal/sql"
	"github.com/discuitnet/discuit/internal/uid"
	"github.com/discuitnet/discuit/internal/utils"
)

type ListItemsSort int

const (
	ListItemsSortByAddedDsc = ListItemsSort(iota)
	ListItemsSortByAddedAsc
	ListItemsSortByCreatedDesc
	ListItemsSortByCreatedAsc

	ListOrderingDefault = ListItemsSortByAddedDsc
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

// MarshalText implements the text.Marshaler interface. It returns an
// httperr.Error (bad request) on error.
func (o ListItemsSort) MarshalText() ([]byte, error) {
	text := o.String()
	if text == "" {
		return nil, httperr.NewBadRequest("invalid-list-sort", "Invalid list sort.")
	}
	return []byte(text), nil
}

// UnmarshalText implements the text.Unmarshaler interface. It returns an
// httperr.Error (bad request) on error.
func (o *ListItemsSort) UnmarshalText(data []byte) error {
	switch string(data) {
	case "addedDsc":
		*o = ListItemsSortByAddedDsc
	case "addedAsc":
		*o = ListItemsSortByAddedAsc
	case "createdDsc":
		*o = ListItemsSortByCreatedDesc
	case "createdAsc":
		*o = ListItemsSortByCreatedAsc
	}
	return httperr.NewBadRequest("invalid-list-sort", "Invalid list sort.")
}

type List struct {
	ID            int             `json:"id"`
	UserID        uid.ID          `json:"userId"`
	Username      string          `json:"username"`
	Name          string          `json:"name"`
	DisplayName   string          `json:"displayName"`
	Description   msql.NullString `json:"description"`
	Public        bool            `json:"public"`
	NumItmes      int             `json:"numItems"`
	Sort          ListItemsSort   `json:"sort"` // current sort
	CreatedAt     time.Time       `json:"createdAt"`
	LastUpdatedAt time.Time       `json:"lastUpdatedAt"`
}

func getLists(ctx context.Context, db *sql.DB, where string, args ...any) ([]*List, error) {
	query := msql.BuildSelectQuery("lists", []string{
		"lists.id",
		"lists.user_id",
		"users.username",
		"lists.name",
		"lists.display_name",
		"lists.description",
		"lists.public",
		"lists.num_items",
		"lists.ordering",
		"lists.created_at",
		"lists.last_updated_at",
	}, []string{
		"INNER JOIN users on lists.user_id = users.id",
	}, where)

	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	lists := []*List{}
	for rows.Next() {
		list := &List{}
		err = rows.Scan(
			&list.ID,
			&list.UserID,
			&list.Username,
			&list.Name,
			&list.DisplayName,
			&list.Description,
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

func GetList(ctx context.Context, db *sql.DB, id int) (*List, error) {
	lists, err := getLists(ctx, db, "WHERE lists.id = ?", id)
	if err != nil {
		return nil, err
	}
	if len(lists) == 0 {
		return nil, httperr.NewNotFound("list-not-found", "List not found.")
	}
	return lists[0], nil
}

func GetListByName(ctx context.Context, db *sql.DB, user uid.ID, name string) (*List, error) {
	lists, err := getLists(ctx, db, "WHERE user_id = ? AND lists.name = ?", user, name)
	if err != nil {
		return nil, err
	}
	if len(lists) == 0 {
		return nil, httperr.NewNotFound("list-not-found", "List not found.")
	}
	return lists[0], nil
}

// GetUsersLists returns all the lists of user. The argument sort has to be
// either empty or one of be one of: lexical, last_updated. And filter has to be
// either empty or one of: all, public, private.
func GetUsersLists(ctx context.Context, db *sql.DB, user uid.ID, sort, filter string) ([]*List, error) {
	if sort == "" {
		sort = "lastAdded"
	}
	if filter == "" {
		filter = "all"
	}
	if !(sort == "name" || sort == "lastAdded") {
		return nil, httperr.NewBadRequest("invalid-lists-sort", "Invalid lists sort.")
	}
	if !(filter == "all" || filter == "public" || filter == "private") {
		return nil, httperr.NewBadRequest("invalid-lists-filter", "Invalid lists filter.")
	}

	where := "WHERE user_id = ? "
	if filter == "public" {
		where += "AND public = true "
	} else if filter == "private" {
		where += "AND public = false "
	}
	if sort == "name" {
		where += "ORDER BY name ASC"
	} else if sort == "lastAdded" {
		where += "ORDER BY last_updated_at DESC"
	}

	return getLists(ctx, db, where, user)
}

// listnameValid always returns an httperr.Error.
func listnameValid(name string) error {
	if err := IsUsernameValid(name); err != nil {
		return httperr.NewBadRequest("invalid-list-name", fmt.Sprintf("list name %v", err))
	}
	return nil
}

func truncateListDisplayName(s string) string {
	return utils.TruncateUnicodeString(s, 50)
}

func CreateList(ctx context.Context, db *sql.DB, user uid.ID, name, displayName string, description msql.NullString, public bool) error {
	if description.String == "" {
		description.Valid = false
	}

	if err := listnameValid(name); err != nil {
		return err
	}

	displayName = truncateListDisplayName(displayName)

	description.String = utils.TruncateUnicodeString(description.String, maxUserProfileAboutLength)
	query, args := msql.BuildInsertQuery("lists", []msql.ColumnValue{
		{Name: "user_id", Value: user},
		{Name: "name", Value: name},
		{Name: "display_name", Value: displayName},
		{Name: "description", Value: description},
		{Name: "public", Value: public},
		{Name: "ordering", Value: ListOrderingDefault},
	})
	_, err := db.ExecContext(ctx, query, args...)
	if err != nil && msql.IsErrDuplicateErr(err) {
		return &httperr.Error{
			HTTPStatus: http.StatusConflict,
			Code:       "duplicate-list",
			Message:    "A list with that name already exists.",
		}
	}
	return err
}

// Update updates the list's updatable fields.
func (l *List) Update(ctx context.Context, db *sql.DB) error {
	// Check errors:
	if err := listnameValid(l.Name); err != nil {
		return err
	}

	// Truncate:
	l.Description.String = utils.TruncateUnicodeString(l.Description.String, maxUserProfileAboutLength)
	l.DisplayName = truncateListDisplayName(l.DisplayName)

	_, err := db.ExecContext(ctx, `
		UPDATE lists SET 
			name = ?, 
			display_name = ?, 
			description = ?,
			public = ?, 
			ordering = ? 
		WHERE lists.id = ?`,
		l.Name,
		l.DisplayName,
		l.Description,
		l.Public,
		l.Sort,
		l.ID)
	return err
}

// UnmarshalUpdatableFieldsJSON extracts the updatable values of the list from
// the encoded JSON string.
func (l *List) UnmarshalUpdatableFieldsJSON(data []byte) error {
	temp := *l // shallow copy
	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}
	l.Name = temp.Name
	l.DisplayName = temp.DisplayName
	l.Description = temp.Description
	if l.Description.String == "" {
		l.Description.Valid = false
	}
	l.Public = temp.Public
	l.Sort = temp.Sort
	return nil
}

func (l *List) Delete(ctx context.Context, db *sql.DB) error {
	// The list items will be automaticaly deleted because ON DELETE CASCADE is
	// set on the foreign key on the list_items table.
	_, err := db.ExecContext(ctx, "DELETE FROM lists WHERE id = ?", l.ID)
	return err
}

func (l *List) AddItem(ctx context.Context, db *sql.DB, targetType ContentType, targetID uid.ID) error {
	errDup := errors.New("duplicate")
	err := msql.Transact(ctx, db, func(tx *sql.Tx) error {
		query, args := msql.BuildInsertQuery("list_items", []msql.ColumnValue{
			{Name: "list_id", Value: l.ID},
			{Name: "target_type", Value: targetType},
			{Name: "target_id", Value: targetID},
		})
		if _, err := tx.ExecContext(ctx, query, args...); err != nil {
			if msql.IsErrDuplicateErr(err) {
				return errDup
			}
			return err
		}
		if _, err := tx.ExecContext(ctx, "UPDATE lists SET num_items = num_items + 1, last_updated_at = now() WHERE id = ?", l.ID); err != nil {
			return err
		}
		return nil
	})
	if err == errDup {
		return nil
	}
	return err
}

func (l *List) DeleteItem(ctx context.Context, db *sql.DB, targetType ContentType, targetID uid.ID) error {
	err := msql.Transact(ctx, db, func(tx *sql.Tx) error {
		_, err := tx.ExecContext(ctx, "DELETE FROM list_items WHERE list_id = ? AND target_id = ? AND target_type = ?", l.ID, targetID, targetType)
		if err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, "UPDATE lists SET num_items = num_items - 1 WHERE id = ?", l.ID); err != nil {
			return err
		}
		return nil
	})
	return err
}

func (l *List) DeleteAllItems(ctx context.Context, db *sql.DB) error {
	err := msql.Transact(ctx, db, func(tx *sql.Tx) error {
		_, err := db.ExecContext(ctx, "DELETE FROM list_items WHERE list_id = ?", l.ID)
		if err != nil {
			return err
		}
		if _, err := db.Exec("UPDATE lists SET num_items = 0 WHERE id = ?", l.ID); err != nil {
			return err
		}
		return nil
	})
	return err
}

type ListItem struct {
	ID         int         `json:"id"`
	ListID     int         `json:"listId"`
	TargetType ContentType `json:"targetType"`
	TargetID   uid.ID      `json:"targetId"`
	CreatedAt  time.Time   `json:"createdAt"` // When the list item was created, not the target item.

	TargetItem any `json:"targetItem"` // Either a Post or a Comment.
}

func GetListItem(ctx context.Context, db *sql.DB, listID, itemID int) (*ListItem, error) {
	query := buildSelectListItemsQuery("WHERE id = ? AND list_id = ?")
	args := []any{itemID, listID}

	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}

	items, err := scanListItems(rows, listID)
	if err != nil {
		return nil, err
	}

	if len(items) == 0 {
		return nil, fmt.Errorf("list item not found for listID %d and itemID %d", listID, itemID)
	}

	return items[0], nil
}

// The next string should contain either a timestamp or a marshaled uid.ID; if
// not, the function will return an error. It's safe for next to be nil.
func GetListItems(ctx context.Context, db *sql.DB, listID, limit int, sort ListItemsSort, next *string, viewer *uid.ID) (*ListItemsResultSet, error) {
	query := buildSelectListItemsQuery("WHERE list_id = ?")
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
				query += " AND created_at >= ?"
			} else {
				// order is ListItemsSortByAddedDsc.
				query += " AND created_at <= ?"
			}
			args = append(args, nextTime)
		} else {
			// next should be a uid.ID.
			nextID, err := uid.FromString(*next)
			if err != nil {
				return nil, fmt.Errorf("failed to parse next (GetListItems, uid.ID): %w", err)
			}
			if sort == ListItemsSortByCreatedAsc {
				query += " AND target_id >= ?"
			} else {
				// order is ListItemsSortByCreatedDsc
				query += " AND target_id <= ?"
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

	items, err := scanListItems(rows, listID)
	if err != nil {
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
		if item.TargetType == ContentTypePost {
			postIDs = append(postIDs, item.TargetID)
			postItemsMap[item.TargetID] = item
		} else if item.TargetType == ContentTypeComment {
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

func (li *ListItem) Delete(ctx context.Context, db *sql.DB) error {
	err := msql.Transact(ctx, db, func(tx *sql.Tx) error {
		if _, err := tx.ExecContext(ctx, "UPDATE lists SET num_items = num_items - 1 WHERE id = ?", li.ListID); err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, "DELETE FROM list_items WHERE id = ?", li.ID); err != nil {
			return err
		}
		return nil
	})
	return err
}

func buildSelectListItemsQuery(where string) string {
	return "SELECT id, target_type, target_id, created_at FROM list_items " + where
}

func scanListItems(rows *sql.Rows, listID int) ([]*ListItem, error) {
	defer rows.Close()

	items := []*ListItem{}
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

	return items, nil
}

type ListItemsResultSet struct {
	Items []*ListItem `json:"items"`
	Next  *string     `json:"next"` // either a timestamp or a uid.ID.
}

// ListsItemIsSavedTo returns the ids of the lists the post or comment target is
// saved in.
func ListsItemIsSavedTo(ctx context.Context, db *sql.DB, user uid.ID, targetID uid.ID, targetType ContentType) ([]int, error) {
	rows, err := db.QueryContext(ctx, `
		select 
			lists.id 
		from list_items 
		inner join lists on lists.id = list_items.list_id 
		where 
			list_items.target_id = ? 
			and list_items.target_type = ?`,
		targetID, targetType)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	ids := []int{} // So, it's JSON marshaled as an array.
	for rows.Next() {
		var id int
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
