package core

import (
	"context"
	"database/sql"
	"github.com/discuitnet/discuit/internal/uid"
	"time"
)

type BookmarkList struct {
	db *sql.DB

	ID        uid.ID    `json:"id"`
	UserID    uid.ID    `json:"user_id"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
}

type Bookmark struct {
	db *sql.DB

	ID        uid.ID    `json:"id"`
	ListID    uid.ID    `json:"list_id"`
	ItemType  string    `json:"item_type"`
	ItemID    uid.ID    `json:"item_id"`
	CreatedAt time.Time `json:"created_at"`
}

func GetBookmark(ctx context.Context, db *sql.DB, id uid.ID, listID uid.ID) (Bookmark, error) {
	row := db.QueryRowContext(ctx, "SELECT * FROM bookmarks WHERE id = ? AND list_id = ?", id, listID)
	var bookmark Bookmark
	if err := row.Scan(&bookmark.ID, &bookmark.ListID, &bookmark.ItemType, &bookmark.ItemID, &bookmark.CreatedAt); err != nil {
		return Bookmark{}, err
	}
	return bookmark, nil
}

func CheckBookmark(ctx context.Context, db *sql.DB, listID uid.ID, itemType string, itemID uid.ID) (bool, error) {
	row := db.QueryRowContext(ctx, "SELECT * FROM bookmarks WHERE list_id = ? AND item_type = ? AND item_id = ?", listID, itemType, itemID)
	var bookmark Bookmark
	if err := row.Scan(&bookmark.ID, &bookmark.ListID, &bookmark.ItemType, &bookmark.ItemID, &bookmark.CreatedAt); err != nil {
		return false, nil
	}
	return true, nil
}

func GetBookmarkList(ctx context.Context, db *sql.DB, id uid.ID) (BookmarkList, error) {
	row := db.QueryRowContext(ctx, "SELECT * FROM bookmark_lists WHERE id = ?", id)
	var list BookmarkList
	if err := row.Scan(&list.ID, &list.UserID, &list.Name, &list.CreatedAt); err != nil {
		return BookmarkList{}, err
	}
	return list, nil
}

func GetBookmarkLists(ctx context.Context, db *sql.DB, userID uid.ID) ([]BookmarkList, error) {
	rows, err := db.QueryContext(ctx, "SELECT * FROM bookmark_lists WHERE user_id = ?", userID)
	if err != nil {
		return nil, err
	}

	var lists []BookmarkList
	for rows.Next() {
		var list BookmarkList
		if err := rows.Scan(&list.ID, &list.UserID, &list.Name, &list.CreatedAt); err != nil {
			return nil, err
		}
		lists = append(lists, list)
	}
	return lists, nil
}

func CreateBookmarkList(ctx context.Context, db *sql.DB, id uid.ID, name string) (BookmarkList, error) {
	list := BookmarkList{
		ID:        uid.New(),
		UserID:    id,
		Name:      name,
		CreatedAt: time.Now(),
	}

	_, err := db.ExecContext(ctx, "INSERT INTO bookmark_lists (id, user_id, name, created_at) VALUES (?, ?, ?, ?)",
		list.ID, list.UserID, list.Name, list.CreatedAt)
	if err != nil {
		return BookmarkList{}, err
	}

	return list, nil
}

func GetBookmarksFromList(ctx context.Context, db *sql.DB, listID uid.ID) ([]Bookmark, error) {
	rows, err := db.QueryContext(ctx, "SELECT * FROM bookmarks WHERE list_id = ?", listID)
	if err != nil {
		return nil, err
	}

	var bookmarks []Bookmark
	for rows.Next() {
		var bookmark Bookmark
		if err := rows.Scan(&bookmark.ID, &bookmark.ListID, &bookmark.ItemType, &bookmark.ItemID, &bookmark.CreatedAt); err != nil {
			return nil, err
		}
		bookmarks = append(bookmarks, bookmark)
	}
	return bookmarks, nil
}

func CreateBookmark(ctx context.Context, db *sql.DB, listID uid.ID, itemType string, itemID uid.ID) (Bookmark, error) {
	bookmark := Bookmark{
		ID:        uid.New(),
		ListID:    listID,
		ItemType:  itemType,
		ItemID:    itemID,
		CreatedAt: time.Now(),
	}

	if bookmark.ItemType != "post" && bookmark.ItemType != "comment" {
		return Bookmark{}, nil
	}

	exists, err := CheckBookmark(ctx, db, listID, itemType, itemID)
	if err != nil {
		return Bookmark{}, err
	}
	if exists {
		return Bookmark{}, nil
	}

	_, err = db.ExecContext(ctx, "INSERT INTO bookmarks (id, list_id, item_type, item_id, created_at) VALUES (?, ?, ?, ?, ?)",
		bookmark.ID, bookmark.ListID, bookmark.ItemType, bookmark.ItemID, bookmark.CreatedAt)
	if err != nil {
		return Bookmark{}, err
	}

	return bookmark, nil
}

func DeleteBookmark(ctx context.Context, db *sql.DB, id uid.ID, listID uid.ID) error {
	_, err := db.ExecContext(ctx, "DELETE FROM bookmarks WHERE id = ? AND list_id = ?", id, listID)
	if err != nil {
		return err
	}
	return nil
}

func DeleteBookmarkList(ctx context.Context, db *sql.DB, id uid.ID) error {
	_, err := db.ExecContext(ctx, "DELETE FROM bookmarks WHERE list_id = ?", id)
	if err != nil {
		return err
	}

	_, err = db.ExecContext(ctx, "DELETE FROM bookmark_lists WHERE id = ?", id)
	if err != nil {
		return err
	}

	return nil
}
