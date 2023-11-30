package server

import (
	"encoding/json"
	"net/http"
	"net/url"
	"strconv"

	"github.com/discuitnet/discuit/core"
	"github.com/discuitnet/discuit/internal/httperr"
	"github.com/discuitnet/discuit/internal/sessions"
	"github.com/discuitnet/discuit/internal/uid"
	"github.com/gorilla/mux"
)

func (s *Server) getFeedLimit(w http.ResponseWriter, r *http.Request, q url.Values) (n int, err error) {
	apiError := httperr.NewBadRequest("invalid_limit", "Invalid feed limit.")
	if limitText := q.Get("limit"); limitText != "" {
		if n, err = strconv.Atoi(limitText); err != nil {
			s.writeError(w, r, apiError)
			return
		}
		if n > s.config.PaginationLimitMax || n < 1 {
			s.writeError(w, r, apiError)
		}
		return
	}
	n = s.config.PaginationLimit
	return
}

// /api/users/{username}/feed [GET]
func (s *Server) getUsersFeed(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	loggedIn, viewerID := isLoggedIn(ses)

	ctx := r.Context()
	user, err := core.GetUserByUsername(ctx, s.db, mux.Vars(r)["username"], viewerID)
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	if user.Banned { // Forbid viewing profile of banned users except for admins.
		if !loggedIn {
			s.writeErrorCustom(w, r, http.StatusUnauthorized, "", "user_banned")
			return
		}
		viewer, err := core.GetUser(ctx, s.db, *viewerID, nil)
		if err != nil {
			s.writeError(w, r, err)
			return
		}
		if !viewer.Admin {
			s.writeErrorCustom(w, r, http.StatusForbidden, "Not an admin", "not_admin")
			return
		}
	}

	query := r.URL.Query()
	limit, err := s.getFeedLimit(w, r, query)
	if err != nil {
		return
	}
	var next *uid.ID
	if nextText := query.Get("next"); nextText != "" {
		next = new(uid.ID)
		if err = next.UnmarshalText([]byte(nextText)); err != nil {
			s.writeErrorCustom(w, r, http.StatusBadRequest, "Invalid cursor", "invalid_cursor")
			return
		}
	}
	set, err := core.GetUserFeed(ctx, s.db, viewerID, user.ID, limit, next)
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	data, err := json.Marshal(set)
	if err != nil {
		s.writeError(w, r, err)
		return
	}
	w.Write(data)
}

func isFilterValid(filter string) bool {
	validFilters := []string{"", "all", "deleted", "locked"}
	for _, f := range validFilters {
		if f == filter {
			return true
		}
	}
	return false
}

var errInvalidFeedFilter = httperr.NewBadRequest("invalid_filter", "Invalid feed filter.")

// /api/posts [GET]
func (s *Server) feed(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	loggedIn, userID := isLoggedIn(ses)
	var err error
	query := r.URL.Query()

	communityIDText := query.Get("communityId")
	filter := query.Get("filter")
	if !isFilterValid(filter) {
		s.writeError(w, r, errInvalidFeedFilter)
		return
	}
	sort := core.FeedSortLatest
	if query.Get("sort") != "" {
		if err = sort.UnmarshalText([]byte(query.Get("sort"))); err != nil {
			s.writeError(w, r, core.ErrInvalidFeedSort)
			return
		}
	}
	limit, err := s.getFeedLimit(w, r, query)
	if err != nil {
		return
	}

	nextText := query.Get("next")
	if nextText == "null" || nextText == "undefined" {
		nextText = ""
	}
	var set *core.FeedResultSet

	feed := query.Get("feed") // All or home or community.

	ctx := r.Context()
	if filter == "" {
		// Home, all and community feeds.
		homeFeed := feed == "home"
		var cid *uid.ID
		if communityIDText != "" {
			c, err := s.getID(w, r, communityIDText)
			if err != nil {
				return
			}
			cid = &c
		}
		if cid != nil {
			homeFeed = false
		}
		set, err = core.GetFeed(ctx, s.db, &core.FeedOptions{
			Sort:        sort,
			DefaultSort: sort == s.config.DefaultFeedSort,
			Viewer:      userID,
			Community:   cid,
			Homefeed:    homeFeed,
			Limit:       limit,
			Next:        nextText,
		})
		if err != nil {
			s.writeError(w, r, err)
			return
		}
	} else {
		// Modtools feeds.
		if !loggedIn {
			s.writeErrorNotLoggedIn(w, r)
			return
		}

		page, err := strconv.Atoi(query.Get("page"))
		if err != nil {
			s.writeErrorCustom(w, r, http.StatusBadRequest, "Invalid page.", "invalid_page")
			return
		}

		communityID, err := s.getID(w, r, communityIDText)
		if err != nil {
			return
		}
		comm, err := core.GetCommunityByID(ctx, s.db, communityID, userID)
		if err != nil {
			s.writeError(w, r, err)
			return
		}

		// Only admins and mods.
		if _, err := s.modOrAdmin(w, r, comm, *userID); err != nil {
			return
		}

		res := struct {
			NoPosts int          `json:"noPosts"`
			Limit   int          `json:"limit"`
			Page    int          `json:"page"`
			Posts   []*core.Post `json:"posts"`
		}{
			Limit: limit,
			Page:  page,
		}

		if filter == "deleted" {
			res.NoPosts, res.Posts, err = core.GetPostsDeleted(ctx, s.db, communityID, limit, page)
		} else if filter == "locked" {
			res.NoPosts, res.Posts, err = core.GetPostsLocked(ctx, s.db, communityID, limit, page)
		} else {
			s.writeError(w, r, errInvalidFeedFilter)
			return
		}
		if err != nil {
			if !httperr.IsNotFound(err) {
				s.writeError(w, r, err)
				return
			}
		}

		data, _ := json.Marshal(res)
		w.Write(data)
		return
	}

	data, _ := json.Marshal(set)
	w.Write(data)
}
