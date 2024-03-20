package server

import (
	"database/sql"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/SherClockHolmes/webpush-go"
	"github.com/discuitnet/discuit/core"
	"github.com/discuitnet/discuit/internal/hcaptcha"
	"github.com/discuitnet/discuit/internal/httperr"
	"github.com/discuitnet/discuit/internal/httputil"
	"github.com/discuitnet/discuit/internal/uid"
	"github.com/gorilla/mux"
)

// /api/users/{username} [GET]
func (s *Server) getUser(w *responseWriter, r *request) error {
	username := r.muxVar("username")
	user, err := core.GetUserByUsername(r.ctx, s.db, username, r.viewer)
	if err != nil {
		return err
	}

	if user.IsGhost() {
		// For deleted accounts, expose the username for this API endpoint only.
		user.UnsetToGhost()
		username := user.Username
		user.SetToGhost()
		user.Username = username
	}

	if err := user.LoadModdingList(r.ctx); err != nil {
		return err
	}

	return w.writeJSON(user)
}

// /api/users/{username} [DELETE]
func (s *Server) deleteUser(w *responseWriter, r *request) error {
	if !r.loggedIn {
		return errNotLoggedIn
	}

	reqBody := struct {
		// Password is the password of the logged in user.
		Password string `json:"password"`
	}{}
	if err := r.unmarshalJSONBody(&reqBody); err != nil {
		return err
	}

	// Username might be the username of the logged in user or the username of
	// some other user. If it's the logged in user, then it's them deleting
	// their account. If it's some other user, then it's an admin deleting a
	// user account.
	username := r.muxVar("username")

	if err := s.rateLimit(r, "del_account_1_"+r.viewer.String(), time.Second*5, 1); err != nil {
		return err
	}

	doer, err := core.GetUser(r.ctx, s.db, *r.viewer, nil)
	if err != nil {
		return err
	}

	if _, err := core.MatchLoginCredentials(r.ctx, s.db, doer.Username, reqBody.Password); err != nil {
		if err == core.ErrWrongPassword {
			return httperr.NewForbidden("wrong_password", "Wrong password.")
		}
		return err
	}

	var toDelete *core.User
	if strings.ToLower(username) == doer.UsernameLowerCase {
		toDelete = doer
	} else {
		if !doer.Admin {
			// Doer is not an admin but trying to delete an account that isn't
			// theirs.
			return httperr.NewForbidden("not_admin", "You are not an admin.")
		}
		toDelete, err = core.GetUserByUsername(r.ctx, s.db, username, nil)
		if err != nil {
			return err
		}
	}

	// The user *must* be logged out of all active sessions before the account
	// is deleted.
	if err := s.LogoutAllSessionsOfUser(toDelete); err != nil {
		return err
	}

	// Finally, delete the user.
	if err := toDelete.Delete(r.ctx); err != nil {
		return err
	}

	w.writeString(`{"success": true}`)
	return nil
}

// /api/_initial [GET]
func (s *Server) initial(w *responseWriter, r *request) error {
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
		VAPIDPublicKey: s.webPushVAPIDKeys.Public,
	}

	response.Mutes.CommunityMutes = []*core.Mute{}
	response.Mutes.UserMutes = []*core.Mute{}

	if r.loggedIn {
		if response.User, err = core.GetUser(r.ctx, s.db, *r.viewer, r.viewer); err != nil {
			if httperr.IsNotFound(err) {
				// Possible deleted user.
				// Reset session.
				// s.logoutUser(response.User, ses, w, r)
				// TODO: Things are weird here.
			}
			return err
		}
		if response.BannedFrom, err = response.User.GetBannedFromCommunities(r.ctx); err != nil {
			return err
		}
		if communityMutes, err := core.GetMutedCommunities(r.ctx, s.db, *r.viewer, true); err != nil {
			return err
		} else if communityMutes != nil {
			response.Mutes.CommunityMutes = communityMutes
		}
		if userMutes, err := core.GetMutedUsers(r.ctx, s.db, *r.viewer, true); err != nil {
			return err
		} else if userMutes != nil {
			response.Mutes.UserMutes = userMutes
		}
	}

	if response.ReportReasons, err = core.GetReportReasons(r.ctx, s.db); err != nil && err != sql.ErrNoRows {
		return err
	}

	commsSet := core.CommunitiesSetDefault
	if r.loggedIn {
		commsSet = core.CommunitiesSetSubscribed
	}

	if response.Communities, err = core.GetCommunities(r.ctx, s.db, core.CommunitiesSortDefault, commsSet, -1, r.viewer); err != nil && err != sql.ErrNoRows {
		return err
	}
	if response.NoUsers, err = core.CountAllUsers(r.ctx, s.db); err != nil {
		return err
	}

	return w.writeJSON(response)
}

// /api/_login [POST]
func (s *Server) login(w *responseWriter, r *request) error {
	if r.loggedIn {
		user, err := core.GetUser(r.ctx, s.db, *r.viewer, r.viewer)
		if err != nil {
			return err
		}

		action := r.urlQueryParamsValue("action")
		if action != "" {
			switch action {
			case "logout":
				if err = s.logoutUser(user, r.ses, w, r.req); err != nil {
					return err
				}
				w.WriteHeader(http.StatusOK)
				return nil
			default:
				return httperr.NewBadRequest("invalid_action", "Unsupported action.")
			}
		}
		return w.writeJSON(user)
	}

	values, err := r.unmarshalJSONBodyToStringsMap(true)
	if err != nil {
		return err
	}
	username := values["username"]
	// Important: Passwords values have always been space trimmed (using strings.TrimSpace).
	password := values["password"]

	// TODO: Require a captcha if user is suspicious looking.

	ip := httputil.GetIP(r.req)
	if err := s.rateLimit(r, "login_1_"+ip, time.Second, 10); err != nil {
		return err
	}
	if err := s.rateLimit(r, "login_2_"+ip+username, time.Hour, 20); err != nil {
		return err
	}

	user, err := core.MatchLoginCredentials(r.ctx, s.db, username, password)
	if err != nil {
		return err
	}

	if err = s.loginUser(user, r.ses, w, r.req); err != nil {
		return err
	}

	return w.writeJSON(user)
}

// /api/_signup [POST]
func (s *Server) signup(w *responseWriter, r *request) error {
	if r.loggedIn {
		return httperr.NewBadRequest("already_logged_in", "You are already logged in")
	}

	values, err := r.unmarshalJSONBodyToStringsMap(true)
	if err != nil {
		return err
	}

	username := values["username"]
	email := values["email"]
	password := values["password"]
	captchaToken := values["captchaToken"]

	// Verify captcha.
	if s.config.CaptchaSecret != "" {
		if ok, err := hcaptcha.VerifyReCaptcha(s.config.CaptchaSecret, captchaToken); err != nil {
			return httperr.NewForbidden("captcha_verify_fail_1", "Captha verification failed.")
		} else if !ok {
			return httperr.NewForbidden("captcha_verify_fail_2", "Captha verification failed.")
		}
	}

	ip := httputil.GetIP(r.req)
	if err := s.rateLimit(r, "signup_1_"+ip, time.Minute, 2); err != nil {
		return err
	}
	if err := s.rateLimit(r, "signup_2_"+ip, time.Hour*6, 10); err != nil {
		return err
	}

	user, err := core.RegisterUser(r.ctx, s.db, username, email, password)
	if err != nil {
		return err
	}

	// Try logging in user.
	s.loginUser(user, r.ses, w, r.req)

	w.WriteHeader(http.StatusCreated)
	return w.writeJSON(user)
}

// /api/_user [GET]
func (s *Server) getLoggedInUser(w *responseWriter, r *request) error {
	if !r.loggedIn {
		return errNotLoggedIn
	}

	user, err := core.GetUser(r.ctx, s.db, *r.viewer, r.viewer)
	if err != nil {
		return err
	}

	if err := user.LoadModdingList(r.ctx); err != nil {
		return err
	}

	return w.writeJSON(user)
}

// /api/notifications [POST]
func (s *Server) updateNotifications(w *responseWriter, r *request) error {
	if !r.loggedIn {
		return errNotLoggedIn
	}

	if err := s.rateLimit(r, "update_notifs_1_"+r.viewer.String(), time.Second*1, 5); err != nil {
		return err
	}

	user, err := core.GetUser(r.ctx, s.db, *r.viewer, nil)
	if err != nil {
		return err
	}

	query := r.urlQueryParams()
	switch query.Get("action") {
	case "resetNewCount":
		if err = user.ResetNewNotificationsCount(r.ctx); err != nil {
			return err
		}
	case "markAllAsSeen":
		if err = user.MarkAllNotificationsAsSeen(r.ctx, core.NotificationType(query.Get("type"))); err != nil {
			return err
		}
	case "deleteAll":
		if err = user.DeleteAllNotifications(r.ctx); err != nil {
			return err
		}
	default:
		return httperr.NewBadRequest("invalid_action", "Unsupported action.")
	}

	return w.writeString(`{"success":true}`)
}

// /api/notifications [GET]
func (s *Server) getNotifications(w *responseWriter, r *request) error {
	if !r.loggedIn {
		return errNotLoggedIn
	}

	user, err := core.GetUser(r.ctx, s.db, *r.viewer, nil)
	if err != nil {
		return err
	}

	res := struct {
		Count    int                  `json:"count"`
		NewCount int                  `json:"newCount"`
		Items    []*core.Notification `json:"items"`
		Next     string               `json:"next"`
	}{}
	if res.Count, err = core.NotificationsCount(r.ctx, s.db, user.ID); err != nil {
		return err
	}
	res.NewCount = user.NumNewNotifications

	query := r.urlQueryParams()
	if res.Items, res.Next, err = core.GetNotifications(r.ctx, s.db, user.ID, 10, query.Get("next")); err != nil {
		return err
	}

	return w.writeJSON(res)
}

// /api/notifications/{notificationID} [GET, PUT]
func (s *Server) getNotification(w *responseWriter, r *request) error {
	if !r.loggedIn {
		return errNotLoggedIn
	}

	notifID := r.muxVar("notificationID")
	notif, err := core.GetNotification(r.ctx, s.db, notifID)
	if err != nil {
		if err == sql.ErrNoRows {
			return httperr.NewNotFound("notif_not_found", "Notification not found.")
		}
		return err
	}

	if !notif.UserID.EqualsTo(*r.viewer) {
		return httperr.NewForbidden("not_owner", "")
	}

	query := r.urlQueryParams()
	if r.req.Method == "PUT" {
		action := query.Get("action")
		switch action {
		case "markAsSeen":
			if err = notif.Saw(r.ctx, query.Get("seen") != "false"); err != nil {
				return err
			}
			if query.Get("seenFrom") == "webpush" {
				notif.ResetUserNewNotificationsCount(r.ctx) // attempt
			}
		default:
			return httperr.NewBadRequest("invalid_action", "Unsupported action.")
		}
	}

	return w.writeJSON(notif)
}

// /api/notifications/{notificationID} [DELETE]
func (s *Server) deleteNotification(w *responseWriter, r *request) error {
	if !r.loggedIn {
		return errNotLoggedIn
	}

	notifID := r.muxVar("notificationID")
	notif, err := core.GetNotification(r.ctx, s.db, notifID)
	if err != nil {
		if err == sql.ErrNoRows {
			return httperr.NewNotFound("notif_not_found", "Notification not found.")
		}
		return err
	}

	if !notif.UserID.EqualsTo(*r.viewer) {
		return httperr.NewForbidden("not_owner", "")
	}

	if err = notif.Delete(r.ctx); err != nil {
		return err
	}

	return w.writeJSON(notif)
}

// /api/push_subscriptions [POST]
func (s *Server) pushSubscriptions(w *responseWriter, r *request) error {
	if !r.loggedIn {
		return errNotLoggedIn
	}

	var sub webpush.Subscription
	if err := r.unmarshalJSONBody(&sub); err != nil {
		return err
	}

	if err := core.SaveWebPushSubscription(r.ctx, s.db, r.ses.ID, *r.viewer, sub); err != nil {
		return err
	}

	return w.writeString(`{"success":true}`)
}

// /api/_settings [POST]
func (s *Server) updateUserSettings(w *responseWriter, r *request) error {
	if !r.loggedIn {
		return errNotLoggedIn
	}

	if err := s.rateLimit(r, "update_settings_1_"+r.viewer.String(), time.Second*1, 5); err != nil {
		return err
	}
	if err := s.rateLimit(r, "update_settings_2_"+r.viewer.String(), time.Hour, 100); err != nil {
		return err
	}

	user, err := core.GetUser(r.ctx, s.db, *r.viewer, r.viewer)
	if err != nil {
		return err
	}

	query := r.urlQueryParams()
	switch query.Get("action") {
	case "updateProfile":
		if err = r.unmarshalJSONBody(&user); err != nil {
			return err
		}

		if err = user.Update(r.ctx); err != nil {
			return err
		}
	case "changePassword":
		values, err := r.unmarshalJSONBodyToStringsMap(true)
		if err != nil {
			return err
		}
		password := values["password"]
		newPassword := values["newPassword"]
		repeatPassword := values["repeatPassword"]
		if newPassword != repeatPassword {
			return httperr.NewBadRequest("password_not_match", "Passwords do not match.")
		}
		if err = user.ChangePassword(r.ctx, password, newPassword); err != nil {
			return err
		}
	default:
		return httperr.NewBadRequest("invalid_action", "Unsupported action.")
	}

	return w.writeJSON(user)
}

// /api/users/{username}/pro_pic [POST, DELETE]
func (s *Server) handleUserProPic(w *responseWriter, r *request) error {
	if !r.loggedIn {
		return errNotLoggedIn
	}

	user, err := core.GetUserByUsername(r.ctx, s.db, r.muxVar("username"), r.viewer)
	if err != nil {
		return err
	}

	// Only the owner of the account and admins can proceed.
	if !(user.ID == *r.viewer || user.Admin) {
		return httperr.NewForbidden("not_owner", "")
	}

	if r.req.Method == "POST" {
		r.req.Body = http.MaxBytesReader(w, r.req.Body, int64(s.config.MaxImageSize)) // limit max upload size
		if err := r.req.ParseMultipartForm(int64(s.config.MaxImageSize)); err != nil {
			return httperr.NewBadRequest("file_size_exceeded", "Max file size exceeded.")
		}

		file, _, err := r.req.FormFile("image")
		if err != nil {
			return err
		}
		defer file.Close()

		data, err := io.ReadAll(file)
		if err != nil {
			return err
		}
		if err := user.UpdateProPic(r.ctx, data); err != nil {
			return err
		}
	} else if r.req.Method == "DELETE" {
		if err := user.DeleteProPic(r.ctx); err != nil {
			return err
		}
	}

	return w.writeJSON(user)
}

// /api/users/{username}/badges/{badgeId}[?byType=false] [DELETE]
func (s *Server) deleteBadge(w *responseWriter, r *request) error {
	if !r.loggedIn {
		return errNotLoggedIn
	}

	admin, err := core.GetUser(r.ctx, s.db, *r.viewer, nil)
	if err != nil {
		return err
	}

	if !admin.Admin {
		return httperr.NewForbidden("not_admin", "Not admin.")
	}

	muxVars := mux.Vars(r.req)
	badgeID, username := muxVars["badgeId"], muxVars["username"]
	user, err := core.GetUserByUsername(r.ctx, s.db, username, nil)
	if err != nil {
		return err
	}

	byType := strings.ToLower(r.urlQueryParamsValue("byType")) == "true"
	if byType {
		if err = user.RemoveBadgesByType(badgeID); err != nil {
			return err
		}
	} else {
		intID, err := strconv.Atoi(badgeID)
		if err != nil {
			return httperr.NewBadRequest("bad_badge_id", "Bad badge id.")
		}
		if err := user.RemoveBadge(intID); err != nil {
			return err
		}
	}

	return w.writeString(`{"success":true}`)
}

// /api/users/{username}/badges [POST]
func (s *Server) addBadge(w *responseWriter, r *request) error {
	if !r.loggedIn {
		return errNotLoggedIn
	}

	admin, err := core.GetUser(r.ctx, s.db, *r.viewer, nil)
	if err != nil {
		return err
	}

	if !admin.Admin {
		return httperr.NewForbidden("not_admin", "User not admin.")
	}

	username := r.muxVar("username")
	user, err := core.GetUserByUsername(r.ctx, s.db, username, nil)
	if err != nil {
		return err
	}

	reqBody := struct {
		BadgeType string `json:"type"`
	}{}

	if err = r.unmarshalJSONBody(&reqBody); err != nil {
		return err
	}

	if err := user.AddBadge(r.ctx, reqBody.BadgeType); err != nil {
		return err
	}

	return w.writeJSON(user.Badges)
}

// /api/users/{username}/lists [GET, POST]
func (s *Server) handleLists(w *responseWriter, r *request) error {
	var (
		username         = strings.ToLower(r.muxVar("username"))
		viewer           *core.User
		err              error
		usernameIsViewer = false
	)

	if r.loggedIn {
		viewer, err = core.GetUser(r.ctx, s.db, *r.viewer, r.viewer)
		if err != nil {
			return err
		}
		if viewer.UsernameLowerCase == username {
			usernameIsViewer = true
		}
	}

	if r.req.Method == "POST" {
		// Create a new list.

		// Check permissions first.
		if !r.loggedIn {
			return errNotLoggedIn
		}
		if usernameIsViewer {
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

	lists, err := core.GetUsersLists(r.ctx, s.db, *r.viewer)
	if err != nil {
		return err
	}
	if !usernameIsViewer {
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
		listID int
		err    error
	)

	if listID, err = strconv.Atoi(strings.ToLower(r.muxVar("listId"))); err != nil {
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
		listID int
		err    error
	)

	if listID, err = strconv.Atoi(strings.ToLower(r.muxVar("listId"))); err != nil {
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
			TargetType int    `json:"target_type"`
			TargetID   uid.ID `json:"target_id"`
		}{}
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
		listID int
		itemID int
		err    error
	)

	listID, err = strconv.Atoi(r.muxVar("listId"))
	if err != nil {
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
