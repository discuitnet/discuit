package server

import (
	"github.com/discuitnet/discuit/core"
	"github.com/discuitnet/discuit/internal/uid"
)

// api/bookmarks [GET]
func (s *Server) getBookmarkLists(w *responseWriter, r *request) error {
	if !r.loggedIn {
		return errNotLoggedIn
	}

	user, err := core.GetUser(r.ctx, s.db, *r.viewer, r.viewer)
	if err != nil {
		return err
	}

	bookmarkLists, err := core.GetBookmarkLists(r.ctx, s.db, user.ID)
	if err != nil {
		return err
	}

	if len(bookmarkLists) == 0 {
		return w.writeJSON([]struct{}{})
	}

	return w.writeJSON(bookmarkLists)
}

// api/bookmarks [POST]
func (s *Server) createBookmarkList(w *responseWriter, r *request) error {
	if !r.loggedIn {
		return errNotLoggedIn
	}

	user, err := core.GetUser(r.ctx, s.db, *r.viewer, r.viewer)
	if err != nil {
		return err
	}

	values, err := r.unmarshalJSONBodyToStringsMap(true)
	if err != nil {
		return err
	}

	name := values["name"]

	bookmarkList, err := core.CreateBookmarkList(r.ctx, s.db, user.ID, name)
	if err != nil {
		return err
	}

	return w.writeJSON(bookmarkList)
}

// /api/bookmarks/:listID [GET]
func (s *Server) getBookmarksFromList(w *responseWriter, r *request) error {
	if !r.loggedIn {
		return errNotLoggedIn
	}

	listID, err := strToID(r.muxVar("listID"))
	if err != nil {
		return err
	}

	bookmarkList, err := core.GetBookmarkList(r.ctx, s.db, listID)
	if err != nil {
		return err
	}

	if bookmarkList.UserID != *r.viewer {
		return errNotFound
	}

	bookmarks, err := core.GetBookmarksFromList(r.ctx, s.db, listID)
	if err != nil {
		return err
	}

	if len(bookmarks) == 0 {
		return w.writeJSON([]struct{}{})
	}

	return w.writeJSON(bookmarks)
}

// /api/bookmarks/:listID [DELETE]
func (s *Server) deleteBookmarkList(w *responseWriter, r *request) error {
	if !r.loggedIn {
		return errNotLoggedIn
	}

	listID, err := strToID(r.muxVar("listID"))
	if err != nil {
		return err
	}

	bookmarkList, err := core.GetBookmarkList(r.ctx, s.db, listID)
	if err != nil {
		return err
	}

	if bookmarkList.UserID != *r.viewer {
		return errNotFound
	}

	err = core.DeleteBookmarkList(r.ctx, s.db, listID)
	if err != nil {
		return err
	}

	return w.writeJSON(nil)

}

// /api/bookmarks/:listID [POST]
func (s *Server) addBookmark(w *responseWriter, r *request) error {
	if !r.loggedIn {
		return errNotLoggedIn
	}

	listID, err := strToID(r.muxVar("listID"))
	if err != nil {
		return err
	}

	bookmarkList, err := core.GetBookmarkList(r.ctx, s.db, listID)
	if err != nil {
		return err
	}

	if bookmarkList.UserID != *r.viewer {
		return errNotFound
	}

	req := struct {
		ItemType string `json:"itemType"`
		ItemID   uid.ID `json:"itemId"`
	}{}

	if err := r.unmarshalJSONBody(&req); err != nil {
		return err
	}

	// Ensure that ItemType exists and is either "post" or "comment"
	if req.ItemType != "post" && req.ItemType != "comment" {
		return nil
	}

	bookmark, err := core.CreateBookmark(r.ctx, s.db, listID, req.ItemType, req.ItemID)
	if err != nil {
		return err
	}

	return w.writeJSON(bookmark)
}

// /api/bookmarks/:listID/:itemID [GET]
func (s *Server) getBookmark(w *responseWriter, r *request) error {
	if !r.loggedIn {
		return errNotLoggedIn
	}

	listID, err := strToID(r.muxVar("listID"))
	if err != nil {
		return err
	}

	itemID, err := strToID(r.muxVar("itemID"))
	if err != nil {
		return err
	}

	bookmarkList, err := core.GetBookmarkList(r.ctx, s.db, listID)
	if err != nil {
		return err
	}

	if bookmarkList.UserID != *r.viewer {
		return errNotFound
	}

	bookmark, err := core.GetBookmark(r.ctx, s.db, itemID, listID)
	if err != nil {
		return err
	}

	return w.writeJSON(bookmark)
}

// /api/bookmarks/:listID/:itemID [DELETE]
func (s *Server) deleteBookmark(w *responseWriter, r *request) error {
	if !r.loggedIn {
		return errNotLoggedIn
	}

	listID, err := strToID(r.muxVar("listID"))
	if err != nil {
		return err
	}

	itemID, err := strToID(r.muxVar("itemID"))
	if err != nil {
		return err
	}

	bookmarkList, err := core.GetBookmarkList(r.ctx, s.db, listID)
	if err != nil {
		return err
	}

	if bookmarkList.UserID != *r.viewer {
		return errNotFound
	}

	err = core.DeleteBookmark(r.ctx, s.db, itemID, listID)
	if err != nil {
		return err
	}

	return w.writeJSON(nil)
}
