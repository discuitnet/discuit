package server

import (
	"database/sql"
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/discuitnet/discuit/core"
	"github.com/discuitnet/discuit/internal/httperr"
	"github.com/discuitnet/discuit/internal/sessions"
	msql "github.com/discuitnet/discuit/internal/sql"
	"github.com/discuitnet/discuit/internal/uid"
	"github.com/gorilla/mux"
)

// /api/community [POST]
func (s *Server) createCommunity(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	loggedIn, userID := isLoggedIn(ses)
	if !loggedIn {
		s.writeErrorNotLoggedIn(w, r)
		return
	}

	// TODO: Limits. Fine for now, as long as no admin account is compromised.

	values, err := s.bodyToMap(w, r, true)
	if err != nil {
		return
	}

	name := values["name"]
	about := values["about"]
	comm, err := core.CreateCommunity(r.Context(), s.db, *userID, s.config.ForumCreationReqPoints, s.config.MaxForumsPerUser, name, about)
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	data, _ := json.Marshal(comm)
	w.Write(data)
}

// /api/communities [GET] (?set=subscribed&sort=size)
func (s *Server) getCommunities(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	loggedIn, userID := isLoggedIn(ses)

	queries := r.URL.Query()
	q := queries.Get("q")

	set := queries.Get("set") // Either "all" or "default" or "subscribed".
	if set == "" {
		set = core.CommunitiesSetAll
	}

	sort := core.CommunitiesSortDefault
	__sort := queries.Get("sort")
	if __sort != "" {
		sort = core.CommunitiesSort(__sort)
	}

	limit := -1
	limit_str := queries.Get("limit")
	if limit_str != "" {
		var err error
		limit, err = strconv.Atoi(limit_str)
		if err != nil {
			s.writeErrorCustom(w, r, http.StatusBadRequest, "Invalid limit", "invalid_limit")
			return
		}
	}

	var comms []*core.Community
	var err error
	ctx := r.Context()

	if q != "" { // Search communities.
		comms, err = core.GetCommunitiesPrefix(ctx, s.db, q)
	} else {
		switch set {
		case core.CommunitiesSetAll, core.CommunitiesSetDefault:
			comms, err = core.GetCommunities(ctx, s.db, sort, set, limit, nil)
		case core.CommunitiesSetSubscribed:
			if !loggedIn {
				s.writeErrorNotLoggedIn(w, r)
				return
			}
			comms, err = core.GetCommunities(ctx, s.db, sort, set, limit, userID)
		}
	}
	if err != nil {
		if httperr.IsNotFound(err) {
			w.Write([]byte("[]"))
			return
		}
		s.writeError(w, r, err)
		return
	}

	if loggedIn {
		for _, comm := range comms {
			if err = comm.PopulateViewerFields(ctx, *userID); err != nil {
				s.writeError(w, r, err)
				return
			}
		}
	}

	if len(comms) == 0 {
		w.Write([]byte("[]"))
	}

	data, _ := json.Marshal(comms)
	w.Write(data)
}

// /api/communities/:communityID [GET]
func (s *Server) getCommunity(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	_, userID := isLoggedIn(ses)
	ctx := r.Context()

	var (
		communityID = mux.Vars(r)["communityID"] // Community ID or name.
		query       = r.URL.Query()
		comm        *core.Community
		byName      = strings.ToLower(query.Get("byName")) == "true"

		err error
	)

	if byName {
		comm, err = core.GetCommunityByName(ctx, s.db, communityID, userID)
	} else {
		var cid uid.ID
		cid, err = uid.FromString(communityID)
		if err != nil {
			s.writeErrorCustom(w, r, http.StatusBadRequest, "Invalid ID.", "")
			return
		}
		comm, err = core.GetCommunityByID(ctx, s.db, cid, userID)
	}
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	if err = comm.PopulateMods(ctx); err != nil {
		s.writeError(w, r, err)
		return
	}
	if err = comm.FetchRules(ctx); err != nil {
		s.writeError(w, r, err)
		return
	}
	if _, err = comm.Default(ctx); err != nil {
		s.writeError(w, r, err)
		return
	}

	data, _ := json.Marshal(comm)
	w.Write(data)
}

// /api/communities/:communityID [PUT]
func (s *Server) updateCommunity(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	loggedIn, userID := isLoggedIn(ses)
	if !loggedIn {
		s.writeErrorNotLoggedIn(w, r)
		return
	}

	var (
		ctx         = r.Context()
		communityID = mux.Vars(r)["communityID"] // Community ID or name.
		query       = r.URL.Query()
		byName      = strings.ToLower(query.Get("byName")) == "true"

		comm *core.Community
		err  error
	)

	if byName {
		comm, err = core.GetCommunityByName(ctx, s.db, communityID, userID)
	} else {
		var cid uid.ID
		cid, err = uid.FromString(communityID)
		if err != nil {
			s.writeErrorCustom(w, r, http.StatusBadRequest, "Invalid ID.", "")
			return
		}
		comm, err = core.GetCommunityByID(ctx, s.db, cid, userID)
	}
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	if err = comm.PopulateMods(ctx); err != nil {
		s.writeError(w, r, err)
		return
	}
	if err = comm.FetchRules(ctx); err != nil {
		s.writeError(w, r, err)
		return
	}

	data, err := io.ReadAll(r.Body)
	if err != nil {
		s.writeError(w, r, err)
		return
	}
	rcomm := core.Community{}
	if err = s.unmarshalJSON(w, r, data, &rcomm); err != nil {
		return
	}
	comm.NSFW = rcomm.NSFW
	comm.About = rcomm.About
	if err = comm.Update(ctx, *userID); err != nil {
		s.writeError(w, r, err)
		return
	}

	data, _ = json.Marshal(comm)
	w.Write(data)
}

// /api/_joinCommunity [POST]
func (s *Server) joinCommunity(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	loggedIn, userID := isLoggedIn(ses)
	if !loggedIn {
		s.writeErrorNotLoggedIn(w, r)
		return
	}

	// Limits.
	if err := s.rateLimit(w, r, "join_community_1_"+userID.String(), time.Second*1, 1); err != nil {
		return
	}
	if err := s.rateLimit(w, r, "join_community_2_"+userID.String(), time.Hour, 500); err != nil {
		return
	}

	req := struct {
		CommunityID uid.ID `json:"communityId"`
		Leave       bool   `json:"leave"`
	}{}
	data, err := io.ReadAll(r.Body)
	if err != nil {
		s.writeError(w, r, err)
		return
	}
	if err = s.unmarshalJSON(w, r, data, &req); err != nil {
		return
	}

	ctx := r.Context()
	user, err := core.GetUser(ctx, s.db, *userID, nil)
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	community, err := core.GetCommunityByID(ctx, s.db, req.CommunityID, userID)
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	if req.Leave {
		err = community.Leave(ctx, user.ID)
	} else {
		err = community.Join(ctx, user.ID)
	}
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	community.ViewerJoined = msql.NewNullBool(!req.Leave)
	community.ViewerMod = msql.NewNullBool(false)
	data, _ = json.Marshal(community)
	w.Write(data)
}

// /api/communities/{communityID}/mods [GET]
func (s *Server) getCommunityMods(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	cid, err := s.getID(w, r, mux.Vars(r)["communityID"])
	if err != nil {
		return
	}

	ctx := r.Context()
	comm, err := core.GetCommunityByID(ctx, s.db, cid, nil)
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	mods, err := core.GetCommunityMods(ctx, s.db, comm.ID)
	if err != nil {
		if httperr.IsNotFound(err) {
			w.Write([]byte("[]"))
			return
		}
		s.writeError(w, r, err)
		return
	}

	b, _ := json.Marshal(mods)
	w.Write(b)
}

// /api/communities/{communityID}/mods [POST]
func (s *Server) addCommunityMod(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	loggedIn, userID := isLoggedIn(ses)
	if !loggedIn {
		s.writeErrorNotLoggedIn(w, r)
		return
	}

	cid, err := s.getID(w, r, mux.Vars(r)["communityID"])
	if err != nil {
		return
	}

	ctx := r.Context()
	comm, err := core.GetCommunityByID(ctx, s.db, cid, userID)
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	m, err := s.bodyToMap(w, r, true)
	if err != nil {
		return
	}

	username, ok := m["username"]
	if !ok {
		s.writeErrorCustom(w, r, http.StatusBadRequest, "Empty username.", "")
		return
	}

	user, err := core.GetUserByUsername(ctx, s.db, username, nil)
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	if err = core.MakeUserMod(ctx, s.db, comm, *userID, user.ID, true); err != nil {
		s.writeError(w, r, err)
		return
	}

	mods, err := core.GetCommunityMods(ctx, s.db, comm.ID)
	if err != nil {
		if httperr.IsNotFound(err) {
			w.Write([]byte("[]"))
			return
		}
		s.writeError(w, r, err)
		return
	}

	b, _ := json.Marshal(mods)
	w.Write(b)

}

// /api/communities/{communityID}/mods/{mod} [DELETE]
func (s *Server) removeCommunityMod(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	loggedIn, userID := isLoggedIn(ses)
	if !loggedIn {
		s.writeErrorNotLoggedIn(w, r)
		return
	}

	vars := mux.Vars(r)
	cid, err := s.getID(w, r, vars["communityID"])
	if err != nil {
		return
	}

	ctx := r.Context()
	comm, err := core.GetCommunityByID(ctx, s.db, cid, userID)
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	username, ok := vars["mod"]
	if !ok {
		s.writeErrorCustom(w, r, http.StatusBadRequest, "No username", "")
		return
	}

	user, err := core.GetUserByUsername(ctx, s.db, username, nil)
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	if err = core.MakeUserMod(ctx, s.db, comm, *userID, user.ID, false); err != nil {
		s.writeError(w, r, err)
		return
	}

	b, _ := json.Marshal(user)
	w.Write(b)
}

// /api/communities/{communityID}/rules [GET]
func (s *Server) getCommunityRules(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	_, userID := isLoggedIn(ses)

	cid, err := s.getID(w, r, mux.Vars(r)["communityID"])
	if err != nil {
		return
	}

	ctx := r.Context()
	comm, err := core.GetCommunityByID(ctx, s.db, cid, userID)
	if err != nil {
		s.writeError(w, r, err)
		return
	}
	if err = comm.FetchRules(ctx); err != nil {
		s.writeError(w, r, err)
		return
	}

	if comm.Rules == nil {
		w.Write([]byte("[]"))
		return
	}
	b, _ := json.Marshal(comm.Rules)
	w.Write(b)
}

// /api/communities/{communityID}/rules [POST]
func (s *Server) addCommunityRule(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	loggedIn, userID := isLoggedIn(ses)
	if !loggedIn {
		s.writeErrorNotLoggedIn(w, r)
		return
	}

	cid, err := s.getID(w, r, mux.Vars(r)["communityID"])
	if err != nil {
		return
	}

	ctx := r.Context()
	comm, err := core.GetCommunityByID(ctx, s.db, cid, userID)
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	rule := core.CommunityRule{}
	b, err := io.ReadAll(r.Body)
	if err != nil {
		s.writeError(w, r, err)
		return
	}
	if err = s.unmarshalJSON(w, r, b, &rule); err != nil {
		return
	}

	if err = comm.AddRule(ctx, rule.Rule, rule.Description.String, *userID); err != nil {
		s.writeError(w, r, err)
		return
	}

	if err = comm.FetchRules(ctx); err != nil {
		s.writeError(w, r, err)
		return
	}

	if comm.Rules == nil {
		w.Write([]byte("[]"))
		return
	}
	b, _ = json.Marshal(comm.Rules)
	w.Write(b)
}

// /api/communities/{communityID}/rules/{ruleID} [GET]
func (s *Server) getCommunityRule(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	vars := mux.Vars(r)
	ruleID, err := strconv.Atoi(vars["ruleID"])
	if err != nil {
		s.writeErrorCustom(w, r, http.StatusNotFound, "Rule not found.", "")
		return
	}

	rule, err := core.GetCommunityRule(r.Context(), s.db, uint(ruleID))
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	b, _ := json.Marshal(rule)
	w.Write(b)

}

// /api/communities/{communityID}/rules/{ruleID} [PUT]
func (s *Server) updateCommunityRule(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	loggedIn, userID := isLoggedIn(ses)
	if !loggedIn {
		s.writeErrorNotLoggedIn(w, r)
		return
	}

	vars := mux.Vars(r)
	ruleID, err := strconv.Atoi(vars["ruleID"])
	if err != nil {
		s.writeErrorCustom(w, r, http.StatusNotFound, "Rule not found.", "")
		return
	}

	ctx := r.Context()
	rule, err := core.GetCommunityRule(ctx, s.db, uint(ruleID))
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	req := core.CommunityRule{}
	data, err := io.ReadAll(r.Body)
	if err != nil {
		s.writeError(w, r, err)
		return
	}
	if err = s.unmarshalJSON(w, r, data, &req); err != nil {
		return
	}

	rule.Rule = req.Rule
	rule.Description = req.Description
	rule.ZIndex = req.ZIndex

	if err = rule.Update(ctx, *userID); err != nil {
		s.writeError(w, r, err)
		return
	}

	b, _ := json.Marshal(rule)
	w.Write(b)
}

// /api/communities/{communityID}/rules/{ruleID} [DELETE]
func (s *Server) deleteCommunityRule(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	loggedIn, userID := isLoggedIn(ses)
	if !loggedIn {
		s.writeErrorNotLoggedIn(w, r)
		return
	}

	vars := mux.Vars(r)
	ruleID, err := strconv.Atoi(vars["ruleID"])
	if err != nil {
		s.writeErrorCustom(w, r, http.StatusNotFound, "Rule not found.", "")
		return
	}

	ctx := r.Context()
	rule, err := core.GetCommunityRule(ctx, s.db, uint(ruleID))
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	if err = rule.Delete(ctx, *userID); err != nil {
		s.writeError(w, r, err)
		return
	}

	b, _ := json.Marshal(rule)
	w.Write(b)
}

// /api/_report [POST]
func (s *Server) report(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	isLoggedIn, userID := isLoggedIn(ses)
	if !isLoggedIn {
		s.writeErrorNotLoggedIn(w, r)
		return
	}

	// Limits.
	if err := s.rateLimit(w, r, "reporting_1_"+userID.String(), time.Second*5, 1); err != nil {
		return
	}
	if err := s.rateLimit(w, r, "reporting_2_"+userID.String(), time.Hour*24, 50); err != nil {
		return
	}

	inc := struct {
		Type     core.ReportType `json:"type"`
		TargetID uid.ID          `json:"targetId"`
		Reason   int             `json:"reason"`
	}{}
	body, err := io.ReadAll(r.Body)
	if err != nil {
		s.writeError(w, r, err)
		return
	}
	if err = s.unmarshalJSON(w, r, body, &inc); err != nil {
		return
	}

	ctx := r.Context()

	var report *core.Report
	var rerr error
	if inc.Type == core.ReportTypePost {
		report, rerr = core.NewPostReport(ctx, s.db, inc.TargetID, inc.Reason, *userID)
	} else if inc.Type == core.ReportTypeComment {
		report, rerr = core.NewCommentReport(ctx, s.db, inc.TargetID, inc.Reason, *userID)
	} else {
		s.writeErrorCustom(w, r, http.StatusBadRequest, "Invalid report type.", "")
		return
	}
	if rerr != nil {
		s.writeError(w, r, rerr)
		return
	}

	b, err := json.Marshal(report)
	if err != nil {
		s.writeError(w, r, err)
		return
	}
	w.Write(b)
}

// /api/communities/{communityID}/reports [GET]
func (s *Server) getCommunityReports(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	isLoggedIn, userID := isLoggedIn(ses)
	if !isLoggedIn {
		s.writeErrorNotLoggedIn(w, r)
		return
	}

	cid, err := s.getID(w, r, mux.Vars(r)["communityID"])
	if err != nil {
		return
	}

	ctx := r.Context()
	comm, err := core.GetCommunityByID(ctx, s.db, cid, userID)
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	// Only mods and admins have access.
	if _, err := s.modOrAdmin(w, r, comm, *userID); err != nil {
		return
	}

	query := r.URL.Query()
	limit, err := s.getFeedLimit(w, r, query)
	if err != nil {
		return
	}
	page := 1
	if spage := query.Get("page"); spage != "" {
		if page, err = strconv.Atoi(spage); err != nil {
			s.writeErrorCustom(w, r, http.StatusBadRequest, "Invalid page.", "")
			return
		}
	}

	var t core.ReportType
	filter := query.Get("filter")
	switch filter {
	case "posts":
		t = core.ReportTypePost
	case "comments":
		t = core.ReportTypeComment
	case "all", "":
		t = core.ReportTypeAll
	default:
		s.writeErrorCustom(w, r, http.StatusBadRequest, "Unsupported filter.", "")
		return
	}

	response := struct {
		Details core.CommunityReportsDetails `json:"details"`
		Reports []*core.Report               `json:"reports"`
		Limit   int                          `json:"limit"`
		Page    int                          `json:"page"`
	}{Limit: limit, Page: page}

	response.Details, err = core.FetchReportsDetails(ctx, s.db, cid)
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	response.Reports, err = core.GetReports(ctx, s.db, cid, t, limit, page)
	if err != nil && err != sql.ErrNoRows {
		s.writeError(w, r, err)
		return
	}

	b, err := json.Marshal(response)
	if err != nil {
		s.writeError(w, r, err)
		return
	}
	w.Write(b)
}

// /api/communities/{communityID}/reports/{reportID} [DELETE]
func (s *Server) deleteReport(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	isLoggedIn, userID := isLoggedIn(ses)
	if !isLoggedIn {
		s.writeErrorNotLoggedIn(w, r)
		return
	}

	vars := mux.Vars(r)
	cid, err := s.getID(w, r, vars["communityID"])
	if err != nil {
		return
	}

	ctx := r.Context()
	comm, err := core.GetCommunityByID(ctx, s.db, cid, userID)
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	// Only mods and admins have access.
	if _, err := s.modOrAdmin(w, r, comm, *userID); err != nil {
		return
	}

	reportID, err := strconv.Atoi(vars["reportID"])
	if err != nil {
		s.writeErrorCustom(w, r, http.StatusBadRequest, "Invalid reportId.", "")
		return
	}
	report, err := core.GetReport(ctx, s.db, reportID)
	if err != nil {
		s.writeError(w, r, err)
		return
	}
	if err = report.FetchTarget(ctx); err != nil {
		s.writeError(w, r, err)
		return
	}

	if err = report.Delete(ctx, *userID); err != nil {
		s.writeError(w, r, err)
		return
	}

	b, _ := json.Marshal(report)
	w.Write(b)
}

// /api/communities/{communityID}/banned [GET, POST, DELETE]
func (s *Server) handleCommunityBanned(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	loggedIn, userID := isLoggedIn(ses)
	if !loggedIn {
		s.writeErrorNotLoggedIn(w, r)
		return
	}

	cid, err := s.getID(w, r, mux.Vars(r)["communityID"])
	if err != nil {
		return
	}

	ctx := r.Context()
	comm, err := core.GetCommunityByID(ctx, s.db, cid, userID)
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	// Only mods and admins have access.
	if _, err := s.modOrAdmin(w, r, comm, *userID); err != nil {
		return
	}

	if r.Method == "GET" {
		users, err := comm.GetBannedUsers(ctx)
		if err != nil {
			s.writeError(w, r, err)
			return
		}
		if users == nil {
			w.Write([]byte("[]"))
		} else {
			b, _ := json.Marshal(users)
			w.Write(b)
		}
		return
	}

	if r.Method == "POST" || r.Method == "DELETE" {
		m, err := s.bodyToMap(w, r, true)
		if err != nil {
			return
		}

		username, ok := m["username"]
		if !ok {
			s.writeErrorCustom(w, r, http.StatusBadRequest, "No username", "")
			return
		}

		user, err := core.GetUserByUsername(ctx, s.db, username, nil)
		if err != nil {
			s.writeError(w, r, err)
			return
		}
		if isMod, err := comm.UserMod(ctx, user.ID); err != nil {
			s.writeError(w, r, err)
			return
		} else if r.Method == "POST" && (isMod || user.Admin) {
			// Cannot ban mod or admin.
			s.writeErrorCustom(w, r, http.StatusForbidden, "", "")
			return
		}

		var expires *time.Time
		if expiresText, ok := m["expires"]; ok {
			expires = new(time.Time)
			if err = expires.UnmarshalText([]byte(expiresText)); err != nil {
				s.writeErrorCustom(w, r, http.StatusBadRequest, "Invalid expires", "")
				return
			}
		}

		if r.Method == "POST" {
			err = comm.BanUser(ctx, *userID, user.ID, expires)
		} else {
			// Unban user.
			err = comm.UnbanUser(ctx, *userID, user.ID)
		}
		if err != nil {
			if msql.IsErrDuplicateErr(err) {
				s.writeErrorCustom(w, r, http.StatusConflict, "", "")
			} else {
				s.writeError(w, r, err)
			}
			return
		}
		b, _ := json.Marshal(user)
		w.Write(b)
		return
	}
}

// /api/communities/{communityID}/pro_pic [POST, DELETE]
func (s *Server) handleCommunityProPic(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	loggedIn, userID := isLoggedIn(ses)
	if !loggedIn {
		s.writeErrorNotLoggedIn(w, r)
		return
	}

	cid, err := s.getID(w, r, mux.Vars(r)["communityID"])
	if err != nil {
		return
	}

	ctx := r.Context()
	comm, err := core.GetCommunityByID(ctx, s.db, cid, userID)
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	// Only mods and admins have access.
	if _, err := s.modOrAdmin(w, r, comm, *userID); err != nil {
		return
	}

	if r.Method == "POST" {
		r.Body = http.MaxBytesReader(w, r.Body, int64(s.config.MaxImageSize)) // limit max upload size
		if err := r.ParseMultipartForm(int64(s.config.MaxImageSize)); err != nil {
			s.writeErrorCustom(w, r, http.StatusBadRequest, "Max file size exceeded", "file_size_exceeded")
			return
		}

		file, _, err := r.FormFile("image")
		if err != nil {
			s.writeError(w, r, err)
			return
		}
		defer file.Close()

		buf, err := io.ReadAll(file)
		if err != nil {
			s.writeError(w, r, err)
			return
		}
		if err = comm.UpdateProPic(ctx, buf); err != nil {
			s.writeError(w, r, err)
			return
		}
	} else if r.Method == "DELETE" {
		if err = comm.DeleteProPic(ctx); err != nil {
			s.writeError(w, r, err)
			return
		}
	}

	data, _ := json.Marshal(comm)
	w.Write(data)
}

// /api/communities/{communityID}/banner_image [POST, DELETE]
func (s *Server) handleCommunityBannerImage(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	loggedIn, userID := isLoggedIn(ses)
	if !loggedIn {
		s.writeErrorNotLoggedIn(w, r)
		return
	}

	cid, err := s.getID(w, r, mux.Vars(r)["communityID"])
	if err != nil {
		return
	}

	ctx := r.Context()
	comm, err := core.GetCommunityByID(ctx, s.db, cid, userID)
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	// Only mods and admins have access.
	if _, err := s.modOrAdmin(w, r, comm, *userID); err != nil {
		return
	}

	if r.Method == "POST" {
		r.Body = http.MaxBytesReader(w, r.Body, int64(s.config.MaxImageSize)) // limit max upload size
		if err := r.ParseMultipartForm(int64(s.config.MaxImageSize)); err != nil {
			s.writeErrorCustom(w, r, http.StatusBadRequest, "Max file size exceeded", "file_size_exceeded")
			return
		}

		file, _, err := r.FormFile("image")
		if err != nil {
			s.writeError(w, r, err)
			return
		}
		defer file.Close()

		buf, err := io.ReadAll(file)
		if err != nil {
			s.writeError(w, r, err)
			return
		}
		if err = comm.UpdateBannerImage(ctx, buf); err != nil {
			s.writeError(w, r, err)
			return
		}
	} else if r.Method == "DELETE" {
		if err = comm.DeleteBannerImage(ctx); err != nil {
			s.writeError(w, r, err)
			return
		}
	}

	data, _ := json.Marshal(comm)
	w.Write(data)
}

// /api/community_requests [GET, POST]
func (s *Server) handleCommunityRequests(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	loggedIn, userID := isLoggedIn(ses)
	if !loggedIn {
		s.writeErrorNotLoggedIn(w, r)
		return
	}

	ctx := r.Context()
	user, err := core.GetUser(ctx, s.db, *userID, nil)
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	if r.Method == "GET" {
		if !user.Admin {
			s.writeErrorCustom(w, r, http.StatusForbidden, "", "")
			return
		}

		items, err := core.GetCommunityRequests(ctx, s.db)
		if err != nil {
			s.writeError(w, r, err)
			return
		}

		if len(items) == 0 {
			w.Write([]byte("[]"))
			return
		}

		data, _ := json.Marshal(items)
		w.Write(data)
	} else { // r.Method == "POST"

		// Limits.
		if err := s.rateLimit(w, r, "req_comm_1_"+userID.String(), time.Hour*12, 5); err != nil {
			return
		}

		body, err := s.bodyToMap(w, r, true)
		if err != nil {
			return
		}

		note := body["note"]
		if len(note) > 2048 {
			note = note[:2048]
		}

		if err := core.CreateCommunityRequest(ctx, s.db, user.Username, body["name"], note); err != nil {
			s.writeError(w, r, err)
			return
		}
		w.WriteHeader(http.StatusOK)
	}
}

// /api/community_requests/{requestID} [DELETE]
func (s *Server) deleteCommunityRequest(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	loggedIn, userID := isLoggedIn(ses)
	if !loggedIn {
		s.writeErrorNotLoggedIn(w, r)
		return
	}

	ctx := r.Context()
	user, err := core.GetUser(ctx, s.db, *userID, nil)
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	if !user.Admin {
		s.writeErrorCustom(w, r, http.StatusForbidden, "", "")
		return
	}

	id_str := mux.Vars(r)["requestID"]

	id := 0

	id, err = strconv.Atoi(id_str)
	if err != nil {
		s.writeErrorCustom(w, r, http.StatusBadRequest, "", "invalid_id")
		return
	}

	if err := core.DeleteCommunityRequest(ctx, s.db, id); err != nil {
		s.writeError(w, r, err)
		return
	}

	w.WriteHeader(http.StatusOK)
}
