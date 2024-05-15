package server

import (
	"io"
	"strconv"
	"strings"

	"github.com/discuitnet/discuit/core"
	"github.com/discuitnet/discuit/internal/httperr"
	"github.com/discuitnet/discuit/internal/uid"
)

// /api/users/{username}/lists [GET, POST]
func (s *Server) handleLists(w *responseWriter, r *request) error {
	var (
		username     = strings.ToLower(r.muxVar("username"))
		user         *core.User
		userIsViewer = false
		err          error
	)

	user, err = core.GetUserByUsername(r.ctx, s.db, username, r.viewer)
	if err != nil {
		return err
	}

	if r.loggedIn {
		if user.ID == *r.viewer {
			userIsViewer = true
		}
	}

	if r.req.Method == "POST" {
		// Create a new list.

		// Check permissions first.
		if !r.loggedIn {
			return errNotLoggedIn
		}
		if !userIsViewer {
			return httperr.NewForbidden("not-your-list", "Not your list.")
		}

		form := struct {
			Name        string `json:"name"`
			DisplayName string `json:"displayName"` // Optional field, defaults to Name.
			Public      bool   `json:"public"`      // Optional field, defaults to false.
		}{}
		if err := r.unmarshalJSONBody(&form); err != nil {
			return err
		}

		if form.Name == "" {
			return httperr.NewBadRequest("list-name-empty", "List name cannot be empty.")
		}
		if form.DisplayName == "" {
			form.DisplayName = form.Name
		}

		if err := core.CreateList(r.ctx, s.db, *r.viewer, form.Name, form.DisplayName, form.Public); err != nil {
			return err
		}
	}

	lists, err := core.GetUsersLists(r.ctx, s.db, user.ID, r.urlQueryParamsValue("sort"), r.urlQueryParamsValue("filter"))
	if err != nil {
		return err
	}
	if !userIsViewer {
		// Viewer is requesting the lists of someone else. Only show them the
		// public lists.
		public := make([]*core.List, 0, len(lists))
		for _, list := range lists {
			if list.Public {
				public = append(public, list)
			}
		}
		lists = public
	}
	return w.writeJSON(lists)
}

// /api/lists/{listId} [GET, PUT, DELETE]
func (s *Server) handleList(w *responseWriter, r *request) error {
	var (
		listID uid.ID
		err    error
	)

	if listID, err = uid.FromString(r.muxVar("listId")); err != nil {
		return httperr.NewBadRequest("invalid-list-id", "Invalid list id.")
	}

	list, err := core.GetList(r.ctx, s.db, listID)
	if err != nil {
		return err
	}

	if r.req.Method != "GET" || !list.Public { // Check permissions.
		if !r.loggedIn {
			return errNotLoggedIn
		}
		viewer, err := core.GetUser(r.ctx, s.db, *r.viewer, r.viewer)
		if err != nil {
			return err
		}
		if viewer.ID != list.UserID {
			return httperr.NewForbidden("not-owner", "It's not your list.")
		}
	}

	switch r.req.Method {
	case "PUT":
		data, err := io.ReadAll(r.req.Body)
		if err != nil {
			return err
		}
		if err := list.UnmarshalUpdatableFieldsJSON(data); err != nil {
			return err
		}
		if err := list.Update(r.ctx, s.db); err != nil {
			return err
		}
	case "DELETE":
		if err := list.Delete(r.ctx, s.db); err != nil {
			return err
		}
	}

	return w.writeJSON(list)
}

// /api/lists/{listId}/items [GET, POST]
func (s *Server) handleListItems(w *responseWriter, r *request) error {
	var (
		listID uid.ID
		err    error
	)

	if listID, err = uid.FromString(r.muxVar("listId")); err != nil {
		return httperr.NewBadRequest("invalid-list-id", "Invalid list id.")
	}

	list, err := core.GetList(r.ctx, s.db, listID)
	if err != nil {
		return err
	}

	if r.req.Method != "GET" || !list.Public { // Check permissions.
		if !r.loggedIn {
			return errNotLoggedIn
		}
		viewer, err := core.GetUser(r.ctx, s.db, *r.viewer, r.viewer)
		if err != nil {
			return err
		}
		if viewer.ID != list.UserID {
			return httperr.NewForbidden("not-owner", "It's not your list.")
		}
	}

	if r.req.Method == "POST" {
		form := struct {
			TargetType core.ContentType `json:"targetType"`
			TargetID   uid.ID           `json:"targetId"`
		}{}
		if err := r.unmarshalJSONBody(&form); err != nil {
			return err
		}
		if err := list.AddItem(r.ctx, s.db, form.TargetType, form.TargetID); err != nil {
			return err
		}
	}

	var (
		limit int
		next  *string
		sort  core.ListItemsSort = core.ListOrderingDefault
	)

	if limit, err = r.urlQueryParamsValueInt("limit", 50); err != nil {
		return httperr.NewBadRequest("invalid-limit", "Invalid limit value.")
	}
	if nextString := r.urlQueryParamsValue("next"); nextString != "" {
		next = &nextString
	}
	if sortString := r.urlQueryParamsValue("sort"); sortString != "" {
		if err := sort.UnmarshalText([]byte(sortString)); err != nil {
			return err
		}
	}

	resultSet, err := core.GetListItems(r.ctx, s.db, list.ID, limit, sort, next, r.viewer)
	if err != nil {
		return err
	}
	return w.writeJSON(resultSet)
}

// /api/lists/{listId}/items/{itemId} [DELETE]
func (s *Server) deleteListItem(w *responseWriter, r *request) error {
	if !r.loggedIn {
		return errNotLoggedIn
	}

	var (
		listID uid.ID
		itemID int
		err    error
	)

	if listID, err = uid.FromString(r.muxVar("listId")); err != nil {
		return httperr.NewBadRequest("invalid-list-id", "Invalid list id.")
	}

	itemID, err = strconv.Atoi(r.muxVar("itemId"))
	if err != nil {
		return httperr.NewBadRequest("invalid-item-id", "Invalid item id.")
	}

	list, err := core.GetList(r.ctx, s.db, listID)
	if err != nil {
		return err
	}

	if list.UserID != *r.viewer { // Check permissions.
		return httperr.NewForbidden("not-your-list", "Not your list.")
	}

	item, err := core.GetListItem(r.ctx, s.db, list.ID, itemID)
	if err != nil {
		return err
	}

	if err := item.Delete(r.ctx, s.db); err != nil {
		return err
	}

	return w.writeJSON(item)
}
