package server

import (
	"net/http"

	"github.com/discuitnet/discuit/core"
	"github.com/discuitnet/discuit/internal/sessions"
)

// /api/_admin [POST]
func (s *Server) adminActions(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	ctx := r.Context()
	loggedIn, adminID := isLoggedIn(ses)
	if !loggedIn {
		s.writeErrorNotLoggedIn(w, r)
		return
	}

	admin, err := core.GetUser(ctx, s.db, *adminID, adminID)
	if err != nil {
		s.writeError(w, r, err)
		return
	}
	if !admin.Admin {
		s.writeErrorCustom(w, r, http.StatusForbidden, "You are not an admin", "not_admin")
		return
	}
	// user is an admin, proceed

	reqBody, err := s.bodyToMap(w, r, true)
	if err != nil {
		return
	}

	action := reqBody["action"]
	switch action {
	case "ban_user":
		username := reqBody["username"]
		user, err := core.GetUserByUsername(ctx, s.db, username, nil)
		if err != nil {
			s.writeError(w, r, err)
			return
		}
		if err := s.logoutAllSessionsOfUser(user); err != nil {
			s.writeErrorCustom(w, r, http.StatusInternalServerError, "Error logging out user: "+err.Error(), "error_loggin_out_user")
			return
		}
		if user.Admin {
			s.writeErrorCustom(w, r, http.StatusForbidden, "Admin can't ban admin yo!", "no_ban_admin")
			return
		}
		// now you can ban
		if err := user.Ban(ctx); err != nil {
			s.writeError(w, r, err)
			return
		}
	case "unban_user":
		user, err := core.GetUserByUsername(ctx, s.db, reqBody["username"], nil)
		if err != nil {
			s.writeError(w, r, err)
			return
		}
		if err := user.Unban(ctx); err != nil {
			s.writeError(w, r, err)
			return
		}
		return
	case "add_default_forum", "remove_default_forum":
		name := reqBody["name"]
		comm, err := core.GetCommunityByName(ctx, s.db, name, adminID)
		if err != nil {
			s.writeError(w, r, err)
			return
		}
		if err = comm.SetDefault(ctx, action == "add_default_forum"); err != nil {
			s.writeError(w, r, err)
			return
		}
	default:
		s.writeErrorCustom(w, r, http.StatusBadRequest, "Unsupported admin action", "unsupported_action")
		return
	}

	w.Write([]byte(`{"success:":true}`))
}
