package server

import (
	"context"
	"database/sql"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/SherClockHolmes/webpush-go"
	"github.com/discuitnet/discuit/core"
	"github.com/discuitnet/discuit/core/sitesettings"
	"github.com/discuitnet/discuit/internal/hcaptcha"
	"github.com/discuitnet/discuit/internal/httperr"
	"github.com/discuitnet/discuit/internal/httputil"
	msql "github.com/discuitnet/discuit/internal/sql"
	"github.com/discuitnet/discuit/internal/uid"
	"github.com/discuitnet/discuit/internal/utils"
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

	if err := user.LoadModeratingCommunitiesList(r.ctx, s.db); err != nil {
		return err
	}

	if r.urlQueryParamsValue("adminsView") == "true" {
		if _, err = getLoggedInAdmin(s.db, r); err != nil {
			return err
		}
		data, err := user.MarshalJSONForAdminViewer(r.ctx, s.db)
		if err != nil {
			return err
		}
		_, err = w.Write(data)
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
	if err := toDelete.Delete(r.ctx, s.db); err != nil {
		return err
	}

	w.writeString(`{"success": true}`)
	return nil
}

// /api/_initial [GET]
func (s *Server) initial(w *responseWriter, r *request) error {
	var err error
	response := struct {
		SignupsDisabled bool                `json:"signupsDisabled"`
		ReportReasons   []core.ReportReason `json:"reportReasons"`
		User            *core.User          `json:"user"`
		Lists           []*core.List        `json:"lists"`
		Communities     []*core.Community   `json:"communities"`
		NoUsers         int                 `json:"noUsers"`
		BannedFrom      []uid.ID            `json:"bannedFrom"`
		VAPIDPublicKey  string              `json:"vapidPublicKey"`
		Mutes           struct {
			CommunityMutes []*core.Mute `json:"communityMutes"`
			UserMutes      []*core.Mute `json:"userMutes"`
		} `json:"mutes"`
		ImagePostSubmitReqPoints int `json:"imagePostSubmitReqPoints"`
		LinkPostSubmitReqPoints  int `json:"linkPostSubmitReqPoints"`
	}{
		Lists:                    []*core.List{},
		VAPIDPublicKey:           s.webPushVAPIDKeys.Public,
		ImagePostSubmitReqPoints: s.config.MediaUploadRequiredPoints,
		LinkPostSubmitReqPoints:  s.config.MediaUploadRequiredPoints,
	}

	response.Mutes.CommunityMutes = []*core.Mute{}
	response.Mutes.UserMutes = []*core.Mute{}

	siteSettings, err := sitesettings.GetSiteSettings(r.ctx, s.db)
	if err != nil {
		return err
	}
	response.SignupsDisabled = siteSettings.SignupsDisabled

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
		if response.BannedFrom, err = response.User.GetBannedFromCommunities(r.ctx, s.db); err != nil {
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
		if lists, err := core.GetUsersLists(r.ctx, s.db, *r.viewer, "", ""); err != nil {
			return err
		} else if lists != nil {
			response.Lists = lists
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

	// Verify that signups are not disabled.
	if settings, err := sitesettings.GetSiteSettings(r.ctx, s.db); err != nil {
		return err
	} else if settings.SignupsDisabled {
		return httperr.NewForbidden("signups-disabled", "Creating new accounts is disabled.")
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

	user, err := core.RegisterUser(r.ctx, s.db, username, email, password, httputil.GetIP(r.req))
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

	if err := user.LoadModeratingCommunitiesList(r.ctx, s.db); err != nil {
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
		if err = user.ResetNewNotificationsCount(r.ctx, s.db); err != nil {
			return err
		}
	case "markAllAsSeen":
		if err = user.MarkAllNotificationsAsSeen(r.ctx, s.db, core.NotificationType(query.Get("type"))); err != nil {
			return err
		}
	case "deleteAll":
		if err = user.DeleteAllNotifications(r.ctx, s.db); err != nil {
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
	if res.Items, res.Next, err = core.GetNotifications(r.ctx, s.db, user.ID, 10, query.Get("next"), query.Get("render") == "true", core.TextFormat(query.Get("format"))); err != nil {
		return err
	}

	return w.writeJSON(res)
}

// /api/notifications/{notificationID} [GET, PUT]
func (s *Server) getNotification(w *responseWriter, r *request) error {
	if !r.loggedIn {
		return errNotLoggedIn
	}

	query := r.urlQueryParams()

	notifID := r.muxVar("notificationID")
	notif, err := core.GetNotification(r.ctx, s.db, notifID, query.Get("render") == "true", core.TextFormat(query.Get("format")))
	if err != nil {
		if err == sql.ErrNoRows {
			return httperr.NewNotFound("notif_not_found", "Notification not found.")
		}
		return err
	}

	if !notif.UserID.EqualsTo(*r.viewer) {
		return httperr.NewForbidden("not_owner", "")
	}

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

	query := r.urlQueryParams()

	notifID := r.muxVar("notificationID")
	notif, err := core.GetNotification(r.ctx, s.db, notifID, query.Get("render") == "true", core.TextFormat(query.Get("format")))
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

		if err = user.Update(r.ctx, s.db); err != nil {
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
		if err = user.ChangePassword(r.ctx, s.db, password, newPassword); err != nil {
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

	// Only the owner of the account can proceed.
	if user.ID != *r.viewer {
		return httperr.NewForbidden("not_owner", "")
	}

	switch r.req.Method {
	case "POST":
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
		if err := user.UpdateProPic(r.ctx, s.db, data); err != nil {
			return err
		}
	case "DELETE":
		if err := user.DeleteProPic(r.ctx, s.db); err != nil {
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
		if err = user.RemoveBadgesByType(s.db, badgeID); err != nil {
			return err
		}
	} else {
		intID, err := strconv.Atoi(badgeID)
		if err != nil {
			return httperr.NewBadRequest("bad_badge_id", "Bad badge id.")
		}
		if err := user.RemoveBadge(s.db, intID); err != nil {
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

	if err := user.AddBadge(r.ctx, s.db, reqBody.BadgeType); err != nil {
		return err
	}

	return w.writeJSON(user.Badges)
}

func (s *Server) handleHiddenPosts(w *responseWriter, r *request) error {
	if !r.loggedIn {
		return errNotLoggedIn
	}

	user, err := core.GetUser(r.ctx, s.db, *r.viewer, nil)
	if err != nil {
		return err
	}

	// The body of the incoming request must be of the JSON form:
	body := struct {
		PostID uid.ID `json:"postId"`
	}{}

	if err := r.unmarshalJSONBody(&body); err != nil {
		return err
	}

	if err := user.HidePost(r.ctx, s.db, body.PostID); err != nil {
		return err
	}

	return w.writeString(`{"success":true}`)
}

func (s *Server) unhidePost(w *responseWriter, r *request) error {
	if !r.loggedIn {
		return errNotLoggedIn
	}

	user, err := core.GetUser(r.ctx, s.db, *r.viewer, nil)
	if err != nil {
		return err
	}

	postID, err := uid.FromString(r.muxVar("postId"))
	if err != nil {
		return httperr.NewBadRequest("invalid-post-id", "Invalid post id.")
	}

	if err := user.UnhidePost(r.ctx, s.db, postID); err != nil {
		return err
	}

	return w.writeString(`{"success":true}`)
}

// flow: user lands on the link provided by email
// page provides new-password and verify-new-password fields
// username, reset-link, passwords are posted to this API endpoint
// verification/writing to db

// need to separate all the DB work into core library?

// null out reset_link and reset_expires_at for a single user when the process flows into an expired link
func blankExpiredReset(ctx context.Context, db *sql.DB, user *core.User) error {
	if _, err := db.ExecContext(ctx, "UPDATE users SET reset_link = null, reset_expires_at = null WHERE id = ?", user.ID); err != nil {
		// !!! is it better to silently log instead of propagating error information to possible attacker?
		log.Printf("Could not null password reset fields for user %s", user.Username)
		return err
	}
	return nil
}

// /api/users/{username}/reset_password [GET]
// !!! requests should be logged
func (s *Server) getResetPasswordLink(w *responseWriter, r *request) error {
	// !!! check somewhere that the current session is not requesting a password reset for the user?
	username := r.muxVar("username")
	user, err := core.GetUserByUsername(r.ctx, s.db, username, nil)
	if err != nil {
		return err
	}
	// TODO: front-end tests email validity using /^[^\s@]+@[^\s@]+\.[^\s@]+$/, but back-end doesn't test
	// so it's possible to use the site API to store an invalid email address
	//fmt.Println("failed: del", user.Deleted, "ban", user.Banned, "email", !user.Email.Valid, "reset", user.ResetLink.Valid, "expiry", time.Now().Before(user.ResetExpiresAt.Time))
	currentTime := time.Now()
	if user.Deleted || user.Banned || !user.Email.Valid || user.ResetLink.Valid || (user.ResetExpiresAt.Valid && currentTime.Before(user.ResetExpiresAt.Time)) {
		return httperr.NewBadRequest("cannot_reset_password", "User is banned, deleted, has no registered email, or already has password reset in progress")
	}

	requestIP := httputil.GetIP(r.req)
	/*
		if err := s.rateLimit(r, "password_reset_request_"+requestIP, time.Hour*24, 100); err != nil {
			return err
		}
		if err := s.rateLimit(r, "password_reset_request_"+username, time.Minute*10, 1); err != nil {
			return err
		}*/

	if _, err := s.db.ExecContext(r.ctx, "INSERT INTO password_requests (ip, username) VALUES (?, ?)", requestIP, user.Username); err != nil {
		return err
	}
	resetLink := utils.GenerateStringID(24)
	if _, err := s.db.ExecContext(r.ctx, "UPDATE users SET reset_link = ?, reset_expires_at = ? WHERE id = ?", resetLink, currentTime.Add(time.Minute*10), user.ID); err != nil {
		return err
	}
	//// write sendEmail function... which could possibly return an asynch error, but then that's not reportable... unless user stays on the page?
	// maybe do max three retries depending on error from email service?
	type ObfuscatedEmail struct {
		ObfuscatedEmail *string `json:"obfuscatedEmail"`
	}
	var obfuscatedEmail ObfuscatedEmail
	obfuscatedEmail.ObfuscatedEmail, err = user.GetObfuscatedEmail()
	if err != nil {
		return err
		//log.Printf("Could not obfuscate email for user", username)
	}
	fmt.Println("pretend email sent to", obfuscatedEmail)
	/*
		if err = sendEmail(user.Email.String, resetLink); err != nil {
			return err
		}*/

	return w.writeJSON(obfuscatedEmail)
}

// !!! this should be POST: take new, verified password, validate against requirements, then write to DB
// /api/password_reset/{username}/{resetLink} [POST]
// pass in password reset details to this endpoint to write new password to DB
// !!! this should be rate-limited and logged...
func (s *Server) handleResetPassword(w *responseWriter, r *request) error {
	values, err := r.unmarshalJSONBodyToStringsMap(true)
	if err != nil {
		return err
	}
	newPassword := values["newPassword"]
	repeatPassword := values["repeatPassword"]

	if newPassword != repeatPassword {
		return httperr.NewBadRequest("password_not_match", "Passwords do not match.")
	}
	//query := r.urlQueryParams()
	muxVars := mux.Vars(r.req)
	username, resetLink := muxVars["username"], muxVars["resetLink"]

	// !!! validate resetLink against database value: is link associated with username, is it expired (and if expired, clear it--or clear it elsewhere?)
	user, err := core.GetUserByUsername(r.ctx, s.db, username, r.viewer)
	if err != nil {
		return err
	}
	// (expired) or (visiting invalid reset link--assume it is an attack and reset the existing link)
	if (user.ResetExpiresAt.Valid && user.ResetExpiresAt.Time.Before(time.Now())) ||
		(!user.ResetLink.Valid || user.ResetLink.String != resetLink) {
		if err := blankExpiredReset(r.ctx, s.db, user); err != nil {
			return err
		}
		return httperr.NewBadRequest("invalid_reset_link", "Password reset link not valid; please request a new link")
	}

	if err = user.ResetPassword(r.ctx, s.db, newPassword); err != nil {
		return err
	}

	// manually expire the link on a successful reset
	if err := blankExpiredReset(r.ctx, s.db, user); err != nil {
		return err
	}
	return w.writeString(`{"success": true}`)
}

func (s *Server) CancelExpiredResetLinks(ctx context.Context) (int, error) {
	numCancelled := 0
	err := msql.Transact(ctx, s.db, func(tx *sql.Tx) error {
		rows, err := tx.QueryContext(ctx, "SELECT id FROM users WHERE reset_link IS NOT NULL AND reset_expires_at <= current_timestamp()")
		if err != nil {
			return err
		}
		defer rows.Close()

		users := []*uid.ID{}
		for rows.Next() {
			var id = &uid.ID{}
			if err := rows.Scan(&id); err != nil {
				return err
			}
			users = append(users, id)
		}
		numCancelled = len(users)
		if numCancelled == 0 {
			return nil
		}

		var ids []any
		for _, id := range users {
			ids = append(ids, id)
		}
		query := "UPDATE users SET reset_link = null, reset_expires_at = null WHERE id IN %s"
		if _, err := tx.ExecContext(ctx, fmt.Sprintf(query, msql.InClauseQuestionMarks(numCancelled)), ids...); err != nil {
			return err
		}
		return nil
	})
	return numCancelled, err
}
