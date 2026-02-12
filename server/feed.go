package server

import (
	"net/http"
	"net/url"
	"strconv"

	"github.com/discuitnet/discuit/core"
	"github.com/discuitnet/discuit/internal/httperr"
	"github.com/discuitnet/discuit/internal/uid"
)

func getFeedLimit(q url.Values, defaultValue, maxValue int) (n int, err error) {
	hErr := &httperr.Error{
		HTTPStatus: http.StatusBadRequest,
		Code:       "invalid_limit",
	}
	if limitText := q.Get("limit"); limitText != "" {
		n, err = strconv.Atoi(limitText)
		if err != nil {
			hErr.Message = "Invalid feed limit (limit is not a number)."
			err = hErr
			return
		}
		if n > maxValue || n < 1 {
			hErr.Message = "Invalid feed limit (not within the valid range)."
			err = hErr
			return
		}
		return
	}
	n = defaultValue
	return
}

// /api/users/{username}/feed [GET]
func (s *Server) getUsersFeed(w *responseWriter, r *request) error {
	user, err := core.GetUserByUsername(r.ctx, s.db, r.muxVar("username"), r.viewer)
	if err != nil {
		return err
	}

	if user.Banned { // Forbid viewing profile of banned users except for admins.
		if !r.loggedIn {
			return &httperr.Error{
				HTTPStatus: http.StatusUnauthorized,
				Code:       "user_banned",
				Message:    "User is banned.",
			}
		}
		viewer, err := core.GetUser(r.ctx, s.db, *r.viewer, nil)
		if err != nil {
			return err
		}
		if !viewer.Admin {
			return httperr.NewForbidden("not_admin", "You are not an admin.")
		}
	}

	query := r.urlQueryParams()
	limit, err := getFeedLimit(query, s.config.PaginationLimit, s.config.PaginationLimitMax)
	if err != nil {
		return err
	}
	var next *uid.ID
	if nextText := query.Get("next"); nextText != "" {
		next = new(uid.ID)
		if err = next.UnmarshalText([]byte(nextText)); err != nil {
			return core.ErrInvalidFeedCursor
		}
	}
	set, err := core.GetUserFeed(r.ctx, s.db, r.viewer, user.ID, query.Get("filter"), limit, next)
	if err != nil {
		return err
	}

	return w.writeJSON(set)
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
func (s *Server) feed(w *responseWriter, r *request) error {
	query := r.urlQueryParams()
	communityIDText := query.Get("communityId")
	filter := query.Get("filter")
	if !isFilterValid(filter) {
		return errInvalidFeedFilter
	}
	sort := core.FeedSortLatest
	if query.Get("sort") != "" {
		if err := sort.UnmarshalText([]byte(query.Get("sort"))); err != nil {
			return core.ErrInvalidFeedSort
		}
	}
	limit, err := getFeedLimit(query, s.config.PaginationLimit, s.config.PaginationLimitMax)
	if err != nil {
		return err
	}

	nextText := query.Get("next")
	if nextText == "null" || nextText == "undefined" {
		nextText = ""
	}
	var set *core.FeedResultSet

	if filter == "" {
		var cid *uid.ID
		if communityIDText != "" {
			c, err := strToID(communityIDText)
			if err != nil {
				return err
			}
			cid = &c
		}
		var feed core.FeedType
		switch feedParam := query.Get("feed"); feedParam {
		case "all", "":
			feed = core.FeedTypeAll
		case "home":
			feed = core.FeedTypeSubscriptions
		case "community":
			feed = core.FeedTypeCommunity
			if cid == nil {
				return httperr.NewBadRequest("community-is-empty", "The query parameter 'community' cannot be empty.")
			}
		case "moderating":
			feed = core.FeedTypeModerating
		default:
			return httperr.NewBadRequest("invalid-feed-type", "Invalid feed type.")
		}
		if cid != nil {
			feed = core.FeedTypeCommunity
		}
		set, err = core.GetFeed(r.ctx, s.db, &core.FeedOptions{
			Feed:        feed,
			Sort:        sort,
			DefaultSort: sort == s.config.DefaultFeedSort,
			Viewer:      r.viewer,
			Community:   cid,
			Limit:       limit,
			Next:        nextText,
		})
		if err != nil {
			return err
		}
	} else {
		// Modtools feeds.
		if !r.loggedIn {
			return errNotLoggedIn
		}

		page, err := strconv.Atoi(query.Get("page"))
		if err != nil {
			return httperr.NewBadRequest("invalid_page", "Invalid page.")
		}

		communityID, err := strToID(communityIDText)
		if err != nil {
			return err
		}
		comm, err := core.GetCommunityByID(r.ctx, s.db, communityID, r.viewer)
		if err != nil {
			return err
		}

		// Only mods and admins have access.
		if ok, err := userModOrAdmin(r.ctx, s.db, *r.viewer, comm); err != nil {
			return err
		} else if !ok {
			return errNotAdminNorMod
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
			res.NoPosts, res.Posts, err = core.GetPostsDeleted(r.ctx, s.db, communityID, limit, page)
		} else if filter == "locked" {
			res.NoPosts, res.Posts, err = core.GetPostsLocked(r.ctx, s.db, communityID, limit, page)
		} else {
			return errInvalidFeedFilter
		}
		if err != nil {
			if !httperr.IsNotFound(err) {
				return err
			}
		}

		return w.writeJSON(res)
	}

	return w.writeJSON(set)
}
