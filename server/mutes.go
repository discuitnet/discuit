package server

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"

	"github.com/discuitnet/discuit/core"
	"github.com/discuitnet/discuit/internal/sessions"
	"github.com/discuitnet/discuit/internal/uid"
	"github.com/gorilla/mux"
)

// /api/mutes [GET, POST, DELETE]
func (s *Server) handleMutes(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	isLoggedIn, userID := isLoggedIn(ses)
	if !isLoggedIn {
		s.writeErrorNotLoggedIn(w, r)
		return
	}

	ctx := r.Context()
	writeMutes := func(w io.Writer) error {
		commMutes, err := core.GetMutedCommunities(ctx, s.db, *userID, true)
		if err != nil {
			return err
		}
		userMutes, err := core.GetMutedUsers(ctx, s.db, *userID, true)
		if err != nil {
			return err
		}

		if commMutes == nil {
			commMutes = []*core.Mute{}
		}
		if userMutes == nil {
			userMutes = []*core.Mute{}
		}

		response := struct {
			CommunityMutes []*core.Mute `json:"communityMutes"`
			UserMutes      []*core.Mute `json:"userMutes"`
		}{commMutes, userMutes}

		return json.NewEncoder(w).Encode(response)
	}

	switch r.Method {
	case "GET":
		if err := writeMutes(w); err != nil {
			s.writeError(w, r, err)
			return
		}
	case "POST":
		request := struct {
			UserID      uid.ID `json:"userId"`
			CommunityID uid.ID `json:"communityId"`
		}{}
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			s.writeError(w, r, err)
			return
		}
		if !request.UserID.Zero() {
			if err := core.MuteUser(ctx, s.db, *userID, request.UserID); err != nil {
				s.writeError(w, r, err)
				return
			}
		}
		if !request.CommunityID.Zero() {
			if err := core.MuteCommunity(ctx, s.db, *userID, request.CommunityID); err != nil {
				s.writeError(w, r, err)
				return
			}
		}
		if err := writeMutes(w); err != nil {
			s.writeError(w, r, err)
			return
		}
	case "DELETE":
		muteType := core.MuteType(r.URL.Query().Get("type"))
		if !muteType.Valid() {
			s.writeErrorCustom(w, r, http.StatusBadRequest, "Invalid mute type", "")
			return
		}
		buf := bytes.Buffer{} // Output saved here for now.
		if err := writeMutes(&buf); err != nil {
			s.writeError(w, r, err)
			return
		}
		if err := core.ClearMutes(ctx, s.db, *userID, muteType); err != nil {
			s.writeError(w, r, err)
			return
		}
		if _, err := io.Copy(w, &buf); err != nil {
			s.writeError(w, r, err)
			return
		}
	default:
		s.writeErrorCustom(w, r, http.StatusBadRequest, "", "")
	}

}

// /api/mutes/{muteID} [DELETE]
func (s *Server) deleteMute(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	loggedIn, userID := isLoggedIn(ses)
	if !loggedIn {
		s.writeErrorNotLoggedIn(w, r)
		return
	}

	muteID := mux.Vars(r)["muteID"]
	if err := core.Unmute(r.Context(), s.db, *userID, muteID); err != nil {
		s.writeError(w, r, err)
		return
	}
	w.Write([]byte(`{"success":true}`))
}

// /api/mutes/users/{mutedUserID} [DELETE]
func (s *Server) deleteUserMute(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	loggedIn, userID := isLoggedIn(ses)
	if !loggedIn {
		s.writeErrorNotLoggedIn(w, r)
		return
	}

	mutedUserID, err := s.getID(w, r, mux.Vars(r)["mutedUserID"])
	if err != nil {
		return
	}

	if err := core.UnmuteUser(r.Context(), s.db, *userID, mutedUserID); err != nil {
		s.writeError(w, r, err)
		return
	}

	w.Write([]byte(`{"success":true}`))
}

// /api/mutes/communities/{mutedCommunityID} [DELETE]
func (s *Server) deleteCommunityMute(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	loggedIn, userID := isLoggedIn(ses)
	if !loggedIn {
		s.writeErrorNotLoggedIn(w, r)
		return
	}

	mutedCommunityID, err := s.getID(w, r, mux.Vars(r)["mutedCommunityID"])
	if err != nil {
		return
	}

	if err := core.UnmuteCommunity(r.Context(), s.db, *userID, mutedCommunityID); err != nil {
		s.writeError(w, r, err)
		return
	}

	w.Write([]byte(`{"success":true}`))
}
