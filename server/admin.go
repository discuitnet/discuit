package server

import (
	"context"
	"database/sql"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/discuitnet/discuit/core"
	"github.com/discuitnet/discuit/core/ipblocks"
	"github.com/discuitnet/discuit/core/sitesettings"
	"github.com/discuitnet/discuit/internal/httperr"
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
		body, ok := reqBody["body"].(string)
		if !ok {
			return invalidJSONErr
		}
		if err := core.DenyCommunityRequest(r.ctx, s.db, int(id), body, admin); err != nil {
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

func reloadTorIPBlocking(db *sql.DB, bl *ipblocks.Blocker) {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second*10)
	defer cancel()

	s, err := sitesettings.GetSiteSettings(ctx, db)
	if err != nil {
		log.Printf("Refreshing Tor blocking failed: error fetching SiteSettings: %v\n", err)
		return
	}

	if s.TorBlocked != bl.TorBlocked() {
		if s.TorBlocked {
			bl.BlockTor()
			log.Println("Blocking Tor IPs")
		} else {
			bl.UnblockTor()
			log.Println("Unblocking Tor IPs")
		}
	}
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
		go reloadTorIPBlocking(s.db, s.ipblocks)
	}

	return w.writeJSON(settings)
}

func (s *Server) getBasicSiteStats(w *responseWriter, r *request) error {
	_, err := getLoggedInAdmin(s.db, r)
	if err != nil {
		return err
	}

	limit, err := r.urlQueryParamsValueInt("limit", 250)
	if err != nil {
		return httperr.NewBadRequest("invalid-limit", "Invalid limit parameter.")
	}
	events, next, err := core.GetBasicSiteStats(r.ctx, s.db, limit, r.urlQueryParamsValueString("next", ""))
	if err != nil {
		return err
	}

	response := struct {
		Events []*core.AnalyticsEvent `json:"events"`
		Next   string                 `json:"next"`
	}{
		Events: events,
		Next:   next,
	}

	return w.writeJSON(response)
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

func (s *Server) handleIPBlocks(w *responseWriter, r *request) error {
	_, err := getLoggedInAdmin(s.db, r)
	if err != nil {
		return err
	}

	if r.req.Method == "POST" {
		reqBody := struct {
			Address   string  `json:"address"`
			ExpiresIn float64 `json:"expiresIn"`
			Note      string  `json:"note"`
		}{}
		if err := r.unmarshalJSONBody(&reqBody); err != nil {
			return err
		}
		var expiresAt *time.Time
		if reqBody.ExpiresIn > 0.0001 {
			t := time.Now().Add(time.Duration(reqBody.ExpiresIn * float64(time.Hour)))
			expiresAt = &t
		}
		block, err := s.ipblocks.Block(r.ctx, reqBody.Address, *r.viewer, expiresAt, reqBody.Note)
		if err != nil {
			return err
		}
		return w.writeJSON(block)
	}

	if r.req.Method == "DELETE" {
		if err := s.ipblocks.CancelAllBlocks(r.ctx); err != nil {
			return err
		}
	}

	limit, err := r.urlQueryParamsValueInt("limit", 20)
	if err != nil {
		return httperr.NewBadRequest("invalid-limit", "Invalid limit value.")
	}
	resulSet, err := ipblocks.GetAllIPBlocks(r.ctx, s.db, ipblocks.InEffectAll, limit, r.urlQueryParamsValueString("next", ""))
	if err != nil {
		return err
	}
	return w.writeJSON(resulSet)
}

func (s *Server) handleSingleIPBlock(w *responseWriter, r *request) error {
	_, err := getLoggedInAdmin(s.db, r)
	if err != nil {
		return err
	}

	blockID, err := strconv.Atoi(r.muxVar("blockID"))
	if err != nil {
		return httperr.NewBadRequest("invalid-block-id", "Invalid block ID.")
	}

	if r.req.Method == "DELETE" {
		if err := s.ipblocks.CancelBlock(r.ctx, blockID); err != nil {
			return err
		}
	}

	block, err := ipblocks.GetIPBlock(r.ctx, s.db, blockID)
	if err != nil {
		return err
	}

	return w.writeJSON(block)
}

func (s *Server) CancelExpiredIPBlocks(ctx context.Context) (int, error) {
	return s.ipblocks.CancelExpiredBlocks(ctx)
}
