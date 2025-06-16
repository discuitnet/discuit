package server

import (
	"database/sql"
	"fmt"
	"net/http"
	"time"

	"github.com/discuitnet/discuit/core"
	"github.com/discuitnet/discuit/core/sitesettings"
	"github.com/discuitnet/discuit/internal/httperr"
	msql "github.com/discuitnet/discuit/internal/sql"
	"github.com/discuitnet/discuit/internal/utils"
)

// getLoggedInAdmin returns the logged in admin, if the
// logged is user is an admin, or it returns an error.
func getLoggedInAdmin(db *sql.DB, r *request) (*core.User, error) {
	if !r.loggedIn {
		return nil, errNotLoggedIn
	}
	admin, err := core.GetUser(r.ctx, db, *r.viewer, r.viewer)
	if err != nil {
		return nil, err
	}
	if !admin.Admin {
		return nil, httperr.NewForbidden("not_admin", "You are not an admin.")
	}
	return admin, nil
}

// /api/_admin [POST]
func (s *Server) adminActions(w *responseWriter, r *request) error {
	admin, err := getLoggedInAdmin(s.db, r)
	if err != nil {
		return err
	}

	reqBody, err := r.unmarshalJSONBodyToMap()
	if err != nil {
		return err
	}

	invalidJSONErr := httperr.NewBadRequest("invalid_json", "Invalid JSON body.")

	action, ok := reqBody["action"].(string)
	if !ok {
		return invalidJSONErr
	}

	switch action {
	case "ban_user":
		username, ok := reqBody["username"].(string)
		if !ok {
			return invalidJSONErr
		}
		user, err := core.GetUserByUsername(r.ctx, s.db, username, r.viewer)
		if err != nil {
			return err
		}
		if err := s.LogoutAllSessionsOfUser(user); err != nil {
			// s.writeErrorCustom(w, r, http.StatusInternalServerError, "Error logging out user: "+err.Error(), "error_loggin_out_user")
			// return
			return &httperr.Error{
				HTTPStatus: http.StatusInternalServerError,
				Code:       "error_loggin_out_user",
				Message:    "Error logging out user: " + err.Error(),
			}
		}
		if user.Admin {
			return httperr.NewForbidden("no_ban_admin", "Admin can't ban another admin, yo!")
		}
		if _, ok := reqBody["deleteContentDays"]; ok {
			n, ok := reqBody["deleteContentDays"].(float64)
			if !ok {
				return invalidJSONErr
			}
			if err := user.DeleteContent(r.ctx, s.db, int(n), *r.viewer); err != nil {
				return err
			}
		}
		if err := user.Ban(r.ctx, s.db); err != nil {
			return err
		}
	case "unban_user":
		username, ok := reqBody["username"].(string)
		if !ok {
			return invalidJSONErr
		}
		user, err := core.GetUserByUsername(r.ctx, s.db, username, r.viewer)
		if err != nil {
			return err
		}
		if err := user.Unban(r.ctx, s.db); err != nil {
			return err
		}
	case "add_default_forum", "remove_default_forum":
		name, ok := reqBody["name"].(string)
		if !ok {
			return invalidJSONErr
		}
		comm, err := core.GetCommunityByName(r.ctx, s.db, name, r.viewer)
		if err != nil {
			return err
		}
		if err = comm.SetDefault(r.ctx, s.db, action == "add_default_forum"); err != nil {
			return err
		}
	case "deny_comm":
		id, ok := reqBody["id"].(float64)
		if !ok {
			return invalidJSONErr
		}
		var deniedAt msql.NullTime
		var commName, byUser string
		if err := s.db.QueryRowContext(r.ctx, "SELECT community_name, by_user, denied_at from community_requests where id = ?", id).Scan(&commName, &byUser, &deniedAt); err != nil {
			if err != sql.ErrNoRows {
				return err
			}
			// somehow, an invalid community request ID was passed in
			return httperr.NewBadRequest("invalid_id", "Invalid community request ID.")
		}
		if deniedAt.Valid {
			return httperr.NewBadRequest("already_denied", "Community was already denied.")
		}
		user, err := core.GetUserByUsername(r.ctx, s.db, byUser, r.viewer)
		if err != nil {
			return err
		}
		body, ok := reqBody["body"].(string)
		if !ok || body == "" {
			body = fmt.Sprintf("Your request for +%s has been declined.", commName)
		}
		body = utils.TruncateUnicodeString(body, 500)
		if _, err := s.db.ExecContext(r.ctx,
			"UPDATE community_requests SET denied_note = ?, denied_by = ?, denied_at = ? WHERE id = ?",
			body, admin.Username, time.Now(), id); err != nil {
			return err
		}
		if err = core.CreateDeniedCommNotification(r.ctx, s.db, user.ID, body); err != nil {
			return err
		}
	default:
		return httperr.NewBadRequest("invalid_action", "Unsupported admin action.")
	}

	return w.writeString(`{"success:":true}`)
}

func (s *Server) getComments(w *responseWriter, r *request) error {
	_, err := getLoggedInAdmin(s.db, r)
	if err != nil {
		return err
	}

	var nextPtr *string
	if next := r.urlQueryParamsValue("next"); next != "" {
		nextPtr = &next
	}

	comments, nextNext, err := core.GetSiteComments(r.ctx, s.db, 100, nextPtr, r.viewer)
	if err != nil {
		return err
	}

	res := struct {
		Comments []*core.Comment `json:"comments"`
		Next     *string         `json:"next"`
	}{comments, nextNext}

	return w.writeJSON(res)
}

func (s *Server) getUsers(w *responseWriter, r *request) error {
	_, err := getLoggedInAdmin(s.db, r)
	if err != nil {
		return err
	}

	var nextPtr *string
	if next := r.urlQueryParamsValue("next"); next != "" {
		nextPtr = &next
	}

	users, nextNext, err := core.GetUsers(r.ctx, s.db, 100, nextPtr, r.viewer)
	if err != nil {
		return err
	}

	res := struct {
		Users []*core.User `json:"users"`
		Next  *string      `json:"next"`
	}{users, nextNext}

	return w.writeJSON(res)
}

func (s *Server) handleSiteSettings(w *responseWriter, r *request) error {
	_, err := getLoggedInAdmin(s.db, r)
	if err != nil {
		return err
	}

	settings, err := sitesettings.GetSiteSettings(r.ctx, s.db)
	if err != nil {
		return err
	}

	if r.req.Method == "PUT" {
		if err = r.unmarshalJSONBody(settings); err != nil {
			return err
		}
		if err = settings.Save(r.ctx, s.db); err != nil {
			return err
		}
	}

	return w.writeJSON(settings)
}

func (s *Server) getBasicSiteStats(w *responseWriter, r *request) error {
	_, err := getLoggedInAdmin(s.db, r)
	if err != nil {
		return err
	}

	events, err := core.GetBasicSiteStats(r.ctx, s.db, 30)
	if err != nil {
		return err
	}

	return w.writeJSON(events)
}

func (s *Server) getCommunityRequests(w *responseWriter, r *request) error {
	_, err := getLoggedInAdmin(s.db, r)
	if err != nil {
		return err
	}

	request, err := core.GetCommunityRequests(r.ctx, s.db)
	if err != nil {
		return err
	}

	return w.writeJSON(request)
}
