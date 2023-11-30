package server

import (
	"database/sql"
	"encoding/json"
	"io"
	"net/http"
	"time"

	"github.com/SherClockHolmes/webpush-go"
	"github.com/discuitnet/discuit/core"
	"github.com/discuitnet/discuit/internal/hcaptcha"
	"github.com/discuitnet/discuit/internal/httperr"
	"github.com/discuitnet/discuit/internal/httputil"
	"github.com/discuitnet/discuit/internal/sessions"
	"github.com/discuitnet/discuit/internal/uid"
	"github.com/gorilla/mux"
)

// /api/users/{username} [GET]
func (s *Server) getUser(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	_, viewerID := isLoggedIn(ses)
	username := mux.Vars(r)["username"]
	ctx := r.Context()
	user, err := core.GetUserByUsername(ctx, s.db, username, viewerID)
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	if err := user.LoadModdingList(ctx); err != nil {
		s.writeError(w, r, err)
		return
	}

	bytes, _ := json.Marshal(user)
	w.Write(bytes)
}

// /api/_initial [GET]
func (s *Server) initial(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	isLoggedIn, userID := isLoggedIn(ses)
	var err error

	response := struct {
		ReportReasons  []core.ReportReason `json:"reportReasons"`
		User           *core.User          `json:"user"`
		Communities    []*core.Community   `json:"communities"`
		NoUsers        int                 `json:"noUsers"`
		BannedFrom     []uid.ID            `json:"bannedFrom"`
		VAPIDPublicKey string              `json:"vapidPublicKey"`
		Mutes          struct {
			CommunityMutes []*core.Mute `json:"communityMutes"`
			UserMutes      []*core.Mute `json:"userMutes"`
		} `json:"mutes"`
	}{
		VAPIDPublicKey: s.vapidKeys.Public,
	}

	response.Mutes.CommunityMutes = []*core.Mute{}
	response.Mutes.UserMutes = []*core.Mute{}

	ctx := r.Context()
	if isLoggedIn {
		if response.User, err = core.GetUser(ctx, s.db, *userID, userID); err != nil {
			if httperr.IsNotFound(err) {
				// Possible deleted user.
				// Reset session.
				// s.logoutUser(response.User, ses, w, r)
				// TODO: Things are weird here.
			}
			s.writeError(w, r, err)
			return
		}
		if response.BannedFrom, err = response.User.GetBannedFromCommunities(ctx); err != nil {
			s.writeError(w, r, err)
			return
		}
		if communityMutes, err := core.GetMutedCommunities(ctx, s.db, *userID, true); err != nil {
			s.writeError(w, r, err)
			return
		} else if communityMutes != nil {
			response.Mutes.CommunityMutes = communityMutes
		}
		if userMutes, err := core.GetMutedUsers(ctx, s.db, *userID, true); err != nil {
			s.writeError(w, r, err)
			return
		} else if userMutes != nil {
			response.Mutes.UserMutes = userMutes
		}
	}

	if response.ReportReasons, err = core.GetReportReasons(ctx, s.db); err != nil && err != sql.ErrNoRows {
		s.writeError(w, r, err)
		return
	}

	commsSet := core.CommunitiesSetDefault
	if isLoggedIn {
		commsSet = core.CommunitiesSetSubscribed
	}

	if response.Communities, err = core.GetCommunities(ctx, s.db, core.CommunitiesSortDefault, commsSet, -1, userID); err != nil && err != sql.ErrNoRows {
		s.writeError(w, r, err)
		return
	}
	if response.NoUsers, err = core.CountAllUsers(ctx, s.db); err != nil {
		s.writeError(w, r, err)
		return
	}

	bytes, _ := json.Marshal(response)
	w.Write(bytes)
}

// /api/_login [POST]
func (s *Server) login(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	loggedIn, userID := isLoggedIn(ses)

	ctx := r.Context()
	if loggedIn {
		user, err := core.GetUser(ctx, s.db, *userID, userID)
		if err != nil {
			s.writeError(w, r, err)
			return
		}

		action := r.URL.Query().Get("action")
		if action != "" {
			switch action {
			case "logout":
				if err := s.logoutUser(user, ses, w, r); err != nil {
					s.writeError(w, r, err)
					return
				}
				w.WriteHeader(http.StatusOK)
				return
			default:
				s.writeErrorCustom(w, r, http.StatusBadRequest, "Unsupported action.", "")
				return
			}
		}

		data, _ := json.Marshal(user)
		w.Write(data)
		return
	}

	values, err := s.bodyToMap(w, r, true)
	if err != nil {
		return
	}
	username := values["username"]
	password := values["password"]

	// TODO: Require a captcha if user is suspicious looking.

	// Limits.
	ip := httputil.GetIP(r)
	if err := s.rateLimit(w, r, "login_1_"+ip, time.Second, 10); err != nil {
		return
	}
	if err := s.rateLimit(w, r, "login_2_"+ip+username, time.Hour, 20); err != nil {
		return
	}

	user, err := core.MatchLoginCredentials(ctx, s.db, username, password)
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	if err = s.loginUser(user, ses, w, r); err != nil {
		s.writeError(w, r, err)
		return
	}
	data, _ := json.Marshal(user)
	w.Write(data)
}

// /api/_signup [POST]
func (s *Server) signup(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	if is, _ := isLoggedIn(ses); is {
		s.writeErrorCustom(w, r, http.StatusBadRequest, "You are already logged in", "already_logged_in")
		return
	}

	values, err := s.bodyToMap(w, r, true)
	if err != nil {
		return
	}

	username := values["username"]
	// email, _ := values["email"]
	password := values["password"]
	captchaToken := values["captchaToken"]

	// Verify captcha.
	if s.config.CaptchaSecret != "" {
		if ok, err := hcaptcha.VerifyReCaptcha(s.config.CaptchaSecret, captchaToken); err != nil {
			s.writeErrorCustom(w, r, http.StatusForbidden, "Captha verification failed", "captcha_verify_fail_1")
			return
		} else if !ok {
			s.writeErrorCustom(w, r, http.StatusForbidden, "Captha verification failed", "captcha_verify_fail_2")
			return
		}
	}

	// Limits.
	ip := httputil.GetIP(r)
	if err := s.rateLimit(w, r, "signup_1_"+ip, time.Minute, 2); err != nil {
		return
	}
	if err := s.rateLimit(w, r, "signup_2_"+ip, time.Hour*6, 10); err != nil {
		return
	}

	user, err := core.RegisterUser(r.Context(), s.db, username, "", password)
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	// Try logging in user.
	s.loginUser(user, ses, w, r)

	data, _ := json.Marshal(user)
	w.WriteHeader(http.StatusCreated)
	w.Write(data)
}

// /api/_user [GET]
func (s *Server) getLoggedInUser(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	loggedIn, userID := isLoggedIn(ses)
	if !loggedIn {
		s.writeErrorNotLoggedIn(w, r)
		return
	}

	ctx := r.Context()
	user, err := core.GetUser(ctx, s.db, *userID, userID)
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	if err := user.LoadModdingList(ctx); err != nil {
		s.writeError(w, r, err)
		return
	}

	bytes, _ := json.Marshal(user)
	w.Write(bytes)
}

// /api/notifications [POST]
func (s *Server) updateNotifications(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	isLoggedIn, userID := isLoggedIn(ses)
	if !isLoggedIn {
		s.writeErrorNotLoggedIn(w, r)
		return
	}

	// Limits.
	if err := s.rateLimit(w, r, "update_notifs_1_"+userID.String(), time.Second*1, 5); err != nil {
		return
	}

	ctx := r.Context()
	user, err := core.GetUser(ctx, s.db, *userID, nil)
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	query := r.URL.Query()
	action := query.Get("action")
	switch action {
	case "resetNewCount":
		if err = user.ResetNewNotificationsCount(ctx); err != nil {
			s.writeError(w, r, err)
			return
		}
	case "markAllAsSeen":
		if err = user.MarkAllNotificationsAsSeen(ctx, core.NotificationType(query.Get("type"))); err != nil {
			s.writeError(w, r, err)
			return
		}
	case "deleteAll":
		if err = user.DeleteAllNotifications(ctx); err != nil {
			s.writeError(w, r, err)
			return
		}
	default:
		s.writeErrorCustom(w, r, http.StatusBadRequest, "Invalid action.", "")
		return
	}

	w.Write([]byte(`{"success":true}`))
}

// /api/notifications [GET]
func (s *Server) getNotifications(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	isLoggedIn, userID := isLoggedIn(ses)
	if !isLoggedIn {
		s.writeErrorNotLoggedIn(w, r)
		return
	}

	ctx := r.Context()
	user, err := core.GetUser(ctx, s.db, *userID, nil)
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	out := struct {
		Count    int                  `json:"count"`
		NewCount int                  `json:"newCount"`
		Items    []*core.Notification `json:"items"`
		Next     string               `json:"next"`
	}{}
	if out.Count, err = core.NotificationsCount(ctx, s.db, user.ID); err != nil {
		s.writeError(w, r, err)
		return
	}
	out.NewCount = user.NumNewNotifications

	query := r.URL.Query()
	if out.Items, out.Next, err = core.GetNotifications(ctx, s.db, user.ID, 10, query.Get("next")); err != nil {
		s.writeError(w, r, err)
		return
	}

	b, _ := json.Marshal(out)

	w.Write(b)
}

// /api/notifications/{notificationID} [GET, PUT]
func (s *Server) getNotification(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	isLoggedIn, userID := isLoggedIn(ses)
	if !isLoggedIn {
		s.writeErrorNotLoggedIn(w, r)
		return
	}

	ctx := r.Context()

	notifID := mux.Vars(r)["notificationID"]
	notif, err := core.GetNotification(ctx, s.db, notifID)
	if err != nil {
		if err == sql.ErrNoRows {
			s.writeErrorCustom(w, r, http.StatusNotFound, "Notification not found", "")
			return
		}
		s.writeError(w, r, err)
		return
	}

	if !notif.UserID.EqualsTo(*userID) {
		s.writeErrorCustom(w, r, http.StatusForbidden, "", "")
		return
	}

	query := r.URL.Query()
	if r.Method == "PUT" {
		action := query.Get("action")
		switch action {
		case "markAsSeen":
			if err = notif.Saw(ctx, query.Get("seen") != "false"); err != nil {
				s.writeError(w, r, err)
				return
			}
			if query.Get("seenFrom") == "webpush" {
				notif.ResetUserNewNotificationsCount(ctx) // attempt
			}
		default:
			s.writeErrorCustom(w, r, http.StatusBadRequest, "Unsupported action", "")
			return
		}
	}

	data, _ := json.Marshal(notif)
	w.Write(data)
}

// /api/notifications/{notificationID} [DELETE]
func (s *Server) deleteNotification(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	isLoggedIn, userID := isLoggedIn(ses)
	if !isLoggedIn {
		s.writeErrorNotLoggedIn(w, r)
		return
	}

	ctx := r.Context()

	notifID := mux.Vars(r)["notificationID"]
	notif, err := core.GetNotification(ctx, s.db, notifID)
	if err != nil {
		if err == sql.ErrNoRows {
			s.writeErrorCustom(w, r, http.StatusNotFound, "Notification not found", "")
			return
		}
		s.writeError(w, r, err)
		return
	}

	if !notif.UserID.EqualsTo(*userID) {
		s.writeErrorCustom(w, r, http.StatusForbidden, "", "")
		return
	}

	if err = notif.Delete(ctx); err != nil {
		s.writeError(w, r, err)
		return
	}

	data, _ := json.Marshal(notif)
	w.Write(data)
}

// /api/push_subscriptions [POST]
func (s *Server) pushSubscriptions(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	isLoggedIn, viewer := isLoggedIn(ses)
	if !isLoggedIn {
		s.writeErrorNotLoggedIn(w, r)
		return
	}

	data, err := io.ReadAll(r.Body)
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	sub := webpush.Subscription{}
	if err := json.Unmarshal(data, &sub); err != nil {
		s.writeError(w, r, err)
		return
	}

	if err := core.SaveWebPushSubscription(r.Context(), s.db, ses.ID, *viewer, sub); err != nil {
		s.writeError(w, r, err)
		return
	}

	w.Write([]byte(`{"success":true}`))
}

// /api/_settings [POST]
func (s *Server) updateUserSettings(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	isLoggedIn, userID := isLoggedIn(ses)
	if !isLoggedIn {
		s.writeErrorNotLoggedIn(w, r)
		return
	}

	// Limits.
	if err := s.rateLimit(w, r, "update_settings_1_"+userID.String(), time.Second*1, 5); err != nil {
		return
	}
	if err := s.rateLimit(w, r, "update_settings_2_"+userID.String(), time.Hour, 100); err != nil {
		return
	}

	ctx := r.Context()
	user, err := core.GetUser(ctx, s.db, *userID, userID)
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	query := r.URL.Query()
	switch query.Get("action") {
	case "updateProfile":
		if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
			s.writeError(w, r, err)
			return
		}

		if err = user.Update(ctx); err != nil {
			s.writeError(w, r, err)
			return
		}
	case "changePassword":
		m, err := s.bodyToMap(w, r, true)
		if err != nil {
			return
		}
		password := m["password"]
		newPassword := m["newPassword"]
		repeatPassword := m["repeatPassword"]
		if newPassword != repeatPassword {
			s.writeErrorCustom(w, r, http.StatusBadRequest, "Passwords do not match", "password_not_match")
			return
		}
		if err = user.ChangePassword(ctx, password, newPassword); err != nil {
			s.writeError(w, r, err)
			return
		}
	default:
		s.writeErrorCustom(w, r, http.StatusBadRequest, "Unsupported action", "")
		return
	}

	data, _ := json.Marshal(user)
	w.Write(data)
}

// /api/_settings [DELETE]
func (s *Server) deleteUser(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	// Unavailable for now.
	s.writeErrorCustom(w, r, http.StatusServiceUnavailable, "Account delete feature is yet to be implemented", "account_del_503")
}
