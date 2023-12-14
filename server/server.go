package server

import (
	"compress/gzip"
	"context"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"runtime/debug"
	"strconv"
	"strings"
	"time"

	"github.com/discuitnet/discuit/config"
	"github.com/discuitnet/discuit/core"
	"github.com/discuitnet/discuit/internal/httperr"
	"github.com/discuitnet/discuit/internal/httputil"
	"github.com/discuitnet/discuit/internal/images"
	"github.com/discuitnet/discuit/internal/ratelimits"
	"github.com/discuitnet/discuit/internal/sessions"
	"github.com/discuitnet/discuit/internal/uid"
	"github.com/discuitnet/discuit/internal/utils"
	"github.com/gomodule/redigo/redis"
	"github.com/gorilla/mux"
	"golang.org/x/net/html"
	"golang.org/x/net/html/atom"
)

type Server struct {
	config *config.Config

	db        *sql.DB
	redisPool *redis.Pool

	// for /api routes
	router *mux.Router

	// for all other routes
	staticRouter *mux.Router

	sessions *sessions.RedisStore

	// react serve
	spaPath  string
	spaIndex string

	httpLogger        *log.Logger
	httpLoggerFile    *os.File
	http500Logger     *log.Logger
	http500LoggerFile *os.File

	vapidKeys core.VAPIDKeys
}

// New returns a new http server.
func New(db *sql.DB, conf *config.Config) (*Server, error) {
	r := mux.NewRouter()

	rstore, err := sessions.NewRedisStore("tcp", conf.RedisAddress, conf.SessionCookieName)
	if err != nil {
		return nil, err
	}

	s := &Server{
		db: db,
		redisPool: &redis.Pool{
			MaxIdle:     3,
			IdleTimeout: 240 * time.Second,
			Dial:        func() (redis.Conn, error) { return redis.Dial("tcp", conf.RedisAddress) },
		},
		router:       r,
		staticRouter: mux.NewRouter(),
		sessions:     rstore,
		config:       conf,
		spaPath:      "./ui/dist/",
		spaIndex:     "index.html",
	}

	if keys, err := core.GetApplicationVAPIDKeys(context.Background(), db); err != nil {
		log.Printf("Error generating vapid keys: %v (you might want to run migrations)\n", err)
	} else {
		s.vapidKeys = *keys
		core.EnablePushNotifications(keys, "discuit@previnder.com")
	}

	s.openLoggers()

	// API routes.
	r.Handle("/api/_initial", s.withSession(s.initial)).Methods("GET")
	r.Handle("/api/_login", s.withSession(s.login)).Methods("POST")
	r.Handle("/api/_signup", s.withSession(s.signup)).Methods("POST")
	r.Handle("/api/_user", s.withSession(s.getLoggedInUser)).Methods("GET")

	r.Handle("/api/users/{username}", s.withSession(s.getUser)).Methods("GET")
	r.Handle("/api/users/{username}/feed", s.withSession(s.getUsersFeed)).Methods("GET")
	r.Handle("/api/users/{username}/pro_pic", s.withSession(s.handleUserProPic)).Methods("POST", "DELETE")

	r.Handle("/api/mutes", s.withSession(s.handleMutes)).Methods("GET", "POST", "DELETE")
	r.Handle("/api/mutes/users/{mutedUserID}", s.withSession(s.deleteUserMute)).Methods("DELETE")
	r.Handle("/api/mutes/communities/{mutedCommunityID}", s.withSession(s.deleteCommunityMute)).Methods("DELETE")
	r.Handle("/api/mutes/{muteID}", s.withSession(s.deleteMute)).Methods("DELETE")

	r.Handle("/api/posts", s.withSession(s.feed)).Methods("GET")
	r.Handle("/api/posts", s.withSession(s.addPost)).Methods("POST")
	r.Handle("/api/posts/{postID}", s.withSession(s.getPost)).Methods("GET")
	r.Handle("/api/posts/{postID}", s.withSession(s.updatePost)).Methods("PUT")
	r.Handle("/api/posts/{postID}", s.withSession(s.deletePost)).Methods("DELETE")
	r.Handle("/api/_postVote", s.withSession(s.postVote)).Methods("POST")
	r.Handle("/api/_uploads", s.withSession(s.imageUpload)).Methods("POST")

	r.Handle("/api/posts/{postID}/comments", s.withSession(s.getComments)).Methods("GET")
	r.Handle("/api/posts/{postID}/comments", s.withSession(s.addComment)).Methods("POST")
	r.Handle("/api/posts/{postID}/comments/{commentID}", s.withSession(s.updateComment)).Methods("PUT")
	r.Handle("/api/posts/{postID}/comments/{commentID}", s.withSession(s.deleteComment)).Methods("DELETE")
	r.Handle("/api/comments/{commentID}", s.withSession(s.getComment)).Methods("GET")
	r.Handle("/api/_commentVote", s.withSession(s.commentVote)).Methods("POST")

	r.Handle("/api/communities", s.withSession(s.getCommunities)).Methods("GET")
	r.Handle("/api/communities", s.withSession(s.createCommunity)).Methods("POST")
	r.Handle("/api/_joinCommunity", s.withSession(s.joinCommunity)).Methods("POST")
	r.Handle("/api/communities/{communityID}", s.withSession(s.getCommunity)).Methods("GET")
	r.Handle("/api/communities/{communityID}", s.withSession(s.updateCommunity)).Methods("PUT")

	r.Handle("/api/communities/{communityID}/rules", s.withSession(s.getCommunityRules)).Methods("GET")
	r.Handle("/api/communities/{communityID}/rules", s.withSession(s.addCommunityRule)).Methods("POST")
	r.Handle("/api/communities/{communityID}/rules/{ruleID}", s.withSession(s.getCommunityRule)).Methods("GET")
	r.Handle("/api/communities/{communityID}/rules/{ruleID}", s.withSession(s.updateCommunityRule)).Methods("PUT")
	r.Handle("/api/communities/{communityID}/rules/{ruleID}", s.withSession(s.deleteCommunityRule)).Methods("DELETE")

	r.Handle("/api/communities/{communityID}/mods", s.withSession(s.getCommunityMods)).Methods("GET")
	r.Handle("/api/communities/{communityID}/mods", s.withSession(s.addCommunityMod)).Methods("POST")
	r.Handle("/api/communities/{communityID}/mods/{mod}", s.withSession(s.removeCommunityMod)).Methods("DELETE")

	r.Handle("/api/communities/{communityID}/reports", s.withSession(s.getCommunityReports)).Methods("GET")
	r.Handle("/api/communities/{communityID}/reports/{reportID}", s.withSession(s.deleteReport)).Methods("DELETE")

	r.Handle("/api/communities/{communityID}/banned", s.withSession(s.handleCommunityBanned)).Methods("GET", "POST", "DELETE")

	r.Handle("/api/communities/{communityID}/pro_pic", s.withSession(s.handleCommunityProPic)).Methods("POST", "DELETE")
	r.Handle("/api/communities/{communityID}/banner_image", s.withSession(s.handleCommunityBannerImage)).Methods("POST", "DELETE")

	r.Handle("/api/notifications", s.withSession(s.getNotifications)).Methods("GET")
	r.Handle("/api/notifications", s.withSession(s.updateNotifications)).Methods("POST")
	r.Handle("/api/notifications/{notificationID}", s.withSession(s.getNotification)).Methods("GET", "PUT")
	r.Handle("/api/notifications/{notificationID}", s.withSession(s.deleteNotification)).Methods("DELETE")

	r.Handle("/api/push_subscriptions", s.withSession(s.pushSubscriptions)).Methods("POST")

	r.Handle("/api/community_requests", s.withSession(s.handleCommunityRequests)).Methods("GET", "POST")
	r.Handle("/api/community_requests/{requestID}", s.withSession(s.deleteCommunityRequest)).Methods("DELTE")

	r.Handle("/api/_report", s.withSession(s.report)).Methods("POST")

	r.Handle("/api/_settings", s.withSession(s.updateUserSettings)).Methods("POST")
	r.Handle("/api/_settings", s.withSession(s.deleteUser)).Methods("DELETE")

	r.Handle("/api/_admin", s.withSession(s.adminActions)).Methods("POST")

	r.Handle("/api/_link_info", s.withSession(s.getLinkInfo)).Methods("GET")

	r.Handle("/api/analytics", s.withSession(s.handleAnalytics)).Methods("POST")

	r.NotFoundHandler = http.HandlerFunc(s.apiNotFoundHandler)
	r.MethodNotAllowedHandler = http.HandlerFunc(s.apiMethodNotAllowedHandler)

	images.HMACKey = []byte(conf.HMACSecret)
	s.staticRouter.PathPrefix("/images/").Handler(&images.Server{
		SkipHashCheck: conf.IsDevelopment,
		DB:            db,
	})

	s.staticRouter.PathPrefix("/").HandlerFunc(s.serveSPA)
	return s, nil
}

func (s *Server) openLoggers() {
	var out, out500 io.Writer = os.Stdout, os.Stdout
	if !s.config.NoLogToFile {
		// Create logs dir if not exists.
		dir, err := os.Open("./logs")
		if err != nil {
			if os.IsNotExist(err) {
				if err = os.Mkdir("./logs", 0755); err != nil {
					log.Fatal(err)
				}
			} else {
				log.Fatal(err)
			}
		}
		dir.Close()

		s.httpLoggerFile, err = os.OpenFile("./logs/http.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
		if err != nil {
			log.Fatal("cannot open logfile for writing: ", err)
		}
		out = s.httpLoggerFile

		s.http500LoggerFile, err = os.OpenFile("./logs/http500.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
		if err != nil {
			log.Fatal("cannot open logfile for writing: ", err)
		}
		out500 = s.http500LoggerFile
	}
	s.httpLogger = log.New(out, "", log.Ldate|log.Ltime|log.Lmicroseconds|log.LUTC)

	s.http500Logger = log.New(out500, "", 0)
}

func (s *Server) closeLoggers() {
	s.httpLogger.SetOutput(os.Stdout)
	s.http500Logger.SetOutput(os.Stdout)
	s.httpLoggerFile.Close()
	s.http500LoggerFile.Close()
}

// Close closes the server.
func (s *Server) Close() error {
	s.closeLoggers()
	return s.sessions.Close()
}

// updateUserLastSeen updates last_seen value in Redis and persists it (and also
// the remote IP address of the user) to MariaDB.
func updateUserLastSeen(ctx context.Context, w http.ResponseWriter, r *http.Request, db *sql.DB, ses *sessions.Session) error {
	loggedIn, uid := isLoggedIn(ses)
	if !loggedIn {
		return nil
	}

	update := func() error {
		ses.Values["last_seen"] = time.Now().Unix()
		if err := ses.Save(w, r); err != nil {
			return err
		}
		return core.UserSeen(ctx, db, *uid, httputil.GetIP(r))
	}

	ts, ok := ses.Values["last_seen"]
	if !ok {
		return update()
	}
	if _, ok = ts.(float64); !ok {
		return update()
	}

	lastSeen := time.Unix(int64(ts.(float64)), 0)
	if time.Since(lastSeen) > time.Minute*5 {
		return update()
	}
	return nil
}

// Used only for api handlers.
func (s *Server) withSession(f func(http.ResponseWriter, *http.Request, *sessions.Session)) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ses, err := s.sessions.Get(r)
		if err != nil {
			s.writeError(w, r, err)
			return
		}

		s.setInitialCookies(w, r, ses)

		if err := updateUserLastSeen(r.Context(), w, r, s.db, ses); err != nil { // could be changed by a csrf attack request
			log.Printf("Error updating last seen value: %v\n", err)
		}

		adminKey := r.URL.Query().Get("adminKey")
		skipCsrfCheck := s.config.CSRFOff || adminKey == s.config.AdminApiKey || r.Method == "GET"
		if !skipCsrfCheck {
			csrftoken := r.Header.Get("X-Csrf-Token")
			valid, _ := utils.ValidMAC(ses.ID, csrftoken, s.config.HMACSecret)
			if !valid {
				s.writeErrorCustom(w, r, http.StatusUnauthorized, "", "")
				return
			}
		}

		f(w, r, ses)
	})
}

// bodyToMap returns HTTP body (JSON) as a map[string]string or an error on
// failure. In case of failure a 401 response with an api error message is sent.
//
// Strings in the returned map are space-trimmed.
func (s *Server) bodyToMap(w http.ResponseWriter, r *http.Request, trim bool) (m map[string]string, err error) {
	m = make(map[string]string)
	b, err := io.ReadAll(r.Body)
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	err = json.Unmarshal(b, &m)
	if err != nil {
		s.writeErrorCustom(w, r, http.StatusBadRequest, "Invalid JSON", "invalid_json")
	}

	if trim {
		for key := range m {
			m[key] = strings.TrimSpace(m[key])
		}
	}
	return
}

// setCsrfCookie sets the CSRF cookie if the cookie is not present or if the
// cookie is invalid. It also includes the CSRF token in a "Csrf-Token" HTTP
// header (this header is sent on every response).
//
// It is safe to change HMACSecret in config.Config.
func (s *Server) setCsrfCookie(ses *sessions.Session, w http.ResponseWriter, r *http.Request) {
	// Set Csrf cookie if not preset or invalid.
	setCookie := false
	cookie, err := r.Cookie("csrftoken")
	if err != nil {
		if err == http.ErrNoCookie {
			setCookie = true
		} else {
			return
		}
	} else {
		valid, err := utils.ValidMAC(ses.ID, cookie.Value, s.config.HMACSecret)
		if err != nil {
			return
		}
		setCookie = !valid
		w.Header().Add("Csrf-Token", cookie.Value)
	}

	if setCookie {
		token := utils.NewHMAC(ses.ID, s.config.HMACSecret)
		http.SetCookie(w, &http.Cookie{
			Name:  "csrftoken",
			Value: token,
			Path:  "/",
		})
		w.Header().Add("Csrf-Token", token)
	}
}

func (s *Server) setInitialCookies(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	if !ses.CookieSet {
		ses.Save(w, r)
	}
	s.setCsrfCookie(ses, w, r)
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	beginT := time.Now()

	if r.URL.Path == "/robots.txt" {
		http.ServeFile(w, r, "./robots.txt")
	} else if r.URL.Path == "/manifest.json" {
		w.Header().Add("Cache-Control", "no-cache")
		http.ServeFile(w, r, "./ui/dist/manifest.json")
	} else {
		if strings.HasPrefix(r.URL.Path, "/api/") {
			w.Header().Add("Content-Type", "application/json; charset=UTF-8")
			w.Header().Add("Cache-Control", "no-store")
			httputil.GzipHandler(s.router).ServeHTTP(w, r)
		} else {
			s.staticRouter.ServeHTTP(w, r)
		}
	}

	sid := ""
	if c, err := r.Cookie(s.config.SessionCookieName); err == nil {
		sid = c.Value
	}

	took := time.Since(beginT)
	s.httpLogger.Printf("took=%v url=%v ip=%v method=%v sid=%v user-agent=\"%v\"\n",
		took, r.URL, httputil.GetIP(r), r.Method, sid, r.Header.Get("User-Agent"))
}

func (s *Server) apiNotFoundHandler(w http.ResponseWriter, r *http.Request) {
	s.writeErrorCustom(w, r, http.StatusNotFound, "API endpoint not found", "")
}

func (s *Server) apiMethodNotAllowedHandler(w http.ResponseWriter, r *http.Request) {
	s.writeErrorCustom(w, r, http.StatusBadRequest, "HTTP method not allowed", "")
}

func (s *Server) logInternalServerError(r *http.Request, err error) {
	log.Println("500 Internal server error: ", err)

	stack := debug.Stack()
	stack64 := base64.StdEncoding.EncodeToString(stack)
	line := struct {
		Error         string      `json:"error"`
		Method        string      `json:"method"`
		URL           string      `json:"url"`
		Proto         string      `json:"proto"`
		Header        http.Header `json:"header"`
		ContentLength int64       `json:"contentLength"`
		RemoteAddr    string      `json:"remoteAddr"`
		RequestURI    string      `json:"requestURI"`
		Stack         string      `json:"stack"`
	}{
		Error:         err.Error(),
		Stack:         stack64,
		Method:        r.Method,
		URL:           r.URL.String(),
		Proto:         r.Proto,
		Header:        r.Header,
		ContentLength: r.ContentLength,
		RemoteAddr:    r.RemoteAddr,
		RequestURI:    r.RequestURI,
	}

	js, _ := json.Marshal(line)
	s.http500Logger.Printf("[%v] %v\n", time.Now().UTC().Format(time.RFC3339), string(js))
}

func (s *Server) writeError(w http.ResponseWriter, r *http.Request, err error) {
	statusCode := http.StatusInternalServerError
	var res []byte

	if httpErr, ok := err.(*httperr.Error); ok {
		if httpErr.Message == "" {
			httpErr.Message = http.StatusText(httpErr.HTTPStatus) + "."
		}
		statusCode = httpErr.HTTPStatus
		res, _ = json.Marshal(httpErr)
	} else {
		res, _ = json.Marshal(httperr.Error{
			HTTPStatus: statusCode,
			Message:    http.StatusText(statusCode),
		})
	}

	if statusCode == http.StatusInternalServerError {
		s.logInternalServerError(r, err)
	}
	w.WriteHeader(statusCode)
	w.Write(res)
}

func (s *Server) writeErrorCustom(w http.ResponseWriter, r *http.Request, statusCode int, message, code string) {
	s.writeError(w, r, &httperr.Error{
		HTTPStatus: statusCode,
		Code:       code,
		Message:    message,
	})
}

func (s *Server) writeErrorNotLoggedIn(w http.ResponseWriter, r *http.Request) {
	s.writeErrorCustom(w, r, http.StatusUnauthorized, "", "not_logged_in")
}

// Omitting code will set to "too_many_requests".
func (s *Server) writeErrorTooManyRequests(w http.ResponseWriter, r *http.Request, code string) {
	if code == "" {
		code = "too_many_requests"
	}
	s.writeErrorCustom(w, r, http.StatusTooManyRequests, "Too many requests", code)
}

// findNodeElement returns the first encountered NodeElement with a tag of
// name.
func findNodeElement(n *html.Node, name string) *html.Node {
	if n.Type == html.ElementNode && n.Data == name {
		return n
	}
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		if body := findNodeElement(c, name); body != nil {
			return body
		}
	}
	return nil
}

func setTitle(doc *html.Node, title, siteName string) {
	title = title + " - " + siteName
	head := findNodeElement(doc, "head")
	var before *html.Node
	for n := head.FirstChild; n != nil; n = n.NextSibling {
		if n.Type == html.ElementNode && n.Data == "title" {
			before = n.NextSibling
			n.Parent.RemoveChild(n)
			break
		}
	}

	node := &html.Node{
		Type:     html.ElementNode,
		DataAtom: atom.Title,
		Data:     "title",
	}
	node.AppendChild(&html.Node{
		Type: html.TextNode,
		Data: title,
	})
	head.InsertBefore(node, before)
}

// appendMetaTag appends a meta tag with attr attributes before the last
// existing identical meta tag in head or, if none found, to the end of head.
// It also deletes similar meta tags already in head (if they have attribute
// keys of name or property).
func appendMetaTag(doc *html.Node, attr []html.Attribute) {
	head := findNodeElement(doc, "head")

	var before *html.Node
	removeMetaTag := func(key, val string) {
		for n := head.FirstChild; n != nil; n = n.NextSibling {
			if n.Type == html.ElementNode && n.Data == "meta" {
				for _, item := range n.Attr {
					if item.Key == key && item.Val == val {
						before = n.NextSibling
						n.Parent.RemoveChild(n)
						return
					}
				}
			}
		}
	}

	for _, item := range attr {
		if item.Key == "name" || item.Key == "property" {
			removeMetaTag(item.Key, item.Val)
			break
		}
	}

	if before == nil {
		for n := head.FirstChild; n != nil; n = n.NextSibling {
			if n.Type == html.ElementNode && n.Data == "meta" {
				before = n.NextSibling
			}
		}
	}

	node := &html.Node{
		Type:     html.ElementNode,
		DataAtom: atom.Meta,
		Data:     "meta",
		Attr:     attr,
	}

	head.InsertBefore(node, before)
}

// fixOgImageTag substitues relative og:image url for an absolute one. It does
// the same for twitter:image meta tag.
func fixOgImageTag(doc *html.Node, toAbsolute func(string) string) {
	head := findNodeElement(doc, "head")
	fix := func(key, val string) {
		var ogImage *html.Node
	out:
		for n := head.FirstChild; n != nil; n = n.NextSibling {
			if n.Type == html.ElementNode && n.Data == "meta" {
				for _, item := range n.Attr {
					if item.Key == key && item.Val == val {
						ogImage = n
						break out
					}
				}
			}
		}

		if ogImage == nil {
			return
		}

		var relative string
		for _, item := range ogImage.Attr {
			if item.Key == "content" {
				relative = item.Val
			}
		}

		absolute := relative
		if relative[0] == '/' {
			absolute = toAbsolute(relative)
		}
		appendMetaTag(doc, []html.Attribute{
			{Key: key, Val: val},
			{Key: "content", Val: absolute},
		})
	}

	fix("property", "og:image")
	fix("name", "twitter:image")
}

func (s *Server) insertMetaTags(doc *html.Node, r *http.Request) {
	ctx := r.Context()
	absoluteURL := func(path string) string {
		return "https://" + filepath.Join(r.Host, path)
	}

	path := strings.TrimRight(r.URL.Path, "/")
	list := strings.Split(path, "/")[1:]

	appendTitle := func(title, ogSuffix string) {
		setTitle(doc, title, s.config.SiteName)
		ogTitle := title + ogSuffix
		appendMetaTag(doc, []html.Attribute{
			{Key: "property", Val: "og:title"},
			{Key: "content", Val: ogTitle},
		})
		appendMetaTag(doc, []html.Attribute{
			{Key: "name", Val: "twitter:title"},
			{Key: "content", Val: ogTitle},
		})
	}

	appendDescription := func(desc string) {
		appendMetaTag(doc, []html.Attribute{
			{Key: "name", Val: "description"},
			{Key: "content", Val: desc},
		})
		appendMetaTag(doc, []html.Attribute{
			{Key: "property", Val: "og:description"},
			{Key: "content", Val: desc},
		})
		appendMetaTag(doc, []html.Attribute{
			{Key: "name", Val: "twitter:description"},
			{Key: "content", Val: desc},
		})
	}

	appendOGImage := func(url string) {
		appendMetaTag(doc, []html.Attribute{
			{Key: "property", Val: "og:image"},
			{Key: "content", Val: url},
		})
		appendMetaTag(doc, []html.Attribute{
			{Key: "name", Val: "twitter:image"},
			{Key: "content", Val: url},
		})
	}

	description := s.config.SiteDescription
	appendDescription(description)
	// The default og:type tag is in index.html file.
	appendMetaTag(doc, []html.Attribute{
		{Key: "property", Val: "og:url"},
		{Key: "content", Val: "https://" + filepath.Join(r.Host, r.URL.String())},
	})
	// The default og:title tag is in index.html file.
	// The default og:image tag is in index.html file.
	fixOgImageTag(doc, absoluteURL)
	// The default og:site_name tag is in index.html file.

	if path == "/about" {
		text := "About " + s.config.SiteName
		appendTitle(text, "")
		appendDescription(text)
	} else if path == "/terms" {
		text := "Terms and conditions of " + s.config.SiteName
		appendTitle(text, "")
		appendDescription(text)
	} else if path == "/privacy-policy" {
		text := "Privacy policy of " + s.config.SiteName
		appendTitle(text, "")
		appendDescription(text)
	} else if path == "/guidelines" {
		text := "Guidelines on using " + s.config.SiteName
		appendTitle(text, "")
		appendDescription(text)
	} else if len(list) == 1 {
		if strings.HasPrefix(list[0], "@") {
			// user profile page
			username := list[0] // with @
			user, err := core.GetUserByUsername(ctx, s.db, username[1:], nil)
			if err == nil {
				appendTitle("@"+user.Username, " on "+s.config.SiteName)
				appendDescription(username + "'s profile.")
			}
		} else {
			// community page
			community, err := core.GetCommunityByName(ctx, s.db, list[0], nil)
			if err == nil {
				appendTitle(community.Name, " - "+s.config.SiteName)
				appendDescription(community.About.String)
				appendMetaTag(doc, []html.Attribute{
					{Key: "name", Val: "description"},
					{Key: "content", Val: community.About.String},
				})
				image := ""
				if community.BannerImage != nil {
					image = absoluteURL(*community.BannerImage.URL)
				} else if community.ProPic != nil {
					image = absoluteURL(*community.ProPic.URL)
				}
				if image != "" {
					appendOGImage(image)
				}
			}
		}
	} else if len(list) == 3 && list[1] == "post" {
		// post page
		post, err := core.GetPost(ctx, s.db, nil, list[2], nil, true)
		if err == nil {
			appendTitle(post.Title, "")
			sep := " • "
			upVotes := strconv.Itoa(post.Upvotes) + " upvote"
			if post.Upvotes > 1 || post.Upvotes == 0 {
				upVotes += "s"
			}
			noComments := strconv.Itoa(post.NumComments) + " comment"
			if post.NumComments > 1 || post.NumComments == 0 {
				noComments += "s"
			}
			ogDescription := upVotes + sep + noComments
			appendDescription(ogDescription)
			appendMetaTag(doc, []html.Attribute{
				{Key: "name", Val: "description"},
				{Key: "content", Val: upVotes + sep + noComments + sep + post.Title},
			})
			image := ""
			if post.Type == core.PostTypeImage {
				if post.Image != nil {
					image = absoluteURL(*post.Image.URL)
				}
			} else if post.Type == core.PostTypeLink {
				if post.Link != nil && post.Link.Image != nil {
					image = absoluteURL(*post.Link.Image.URL)
				}
			}
			if image != "" {
				appendOGImage(image)
			}
		}
	}
}

// Serves React static files and serves index.html for all routes that doesn't
// match a file.
func (s *Server) serveSPA(w http.ResponseWriter, r *http.Request) {
	// Move incoming requests with a trailing slash to a url without it.
	if r.URL.Path != "/" && strings.HasSuffix(r.URL.Path, "/") {
		var u url.URL = *r.URL
		u.Path = strings.TrimSuffix(u.Path, "/")
		http.Redirect(w, r, u.String(), http.StatusMovedPermanently)
		return
	}

	ses, err := s.sessions.Get(r)
	if err == nil {
		s.setInitialCookies(w, r, ses)
	}

	path, err := filepath.Abs(r.URL.Path)
	if err != nil {
		http.Error(w, "", http.StatusBadRequest)
		return
	}

	serveIndexFile := func() {
		file, err := os.Open(filepath.Join(s.spaPath, s.spaIndex))
		if err != nil {
			log.Fatal(err)
		}
		defer file.Close()

		doc, err := html.Parse(file)
		if err != nil {
			log.Fatal(err)
		}

		s.insertMetaTags(doc, r)
		w.Header().Add("Cache-Control", "no-store")

		var writer io.Writer = w
		if httputil.AcceptEncoding(r.Header, "gzip") {
			gz := gzip.NewWriter(w)
			defer gz.Close()
			writer = gz
			w.Header().Add("Content-Encoding", "gzip")
			w.Header().Add("Content-Type", "text/html; charset=UTF-8")
		}
		html.Render(writer, doc)
	}

	if path == "/" {
		serveIndexFile()
		return
	}

	fpath := filepath.Join(s.spaPath, path)
	_, err = os.Stat(fpath)
	if os.IsNotExist(err) {
		serveIndexFile()
		return
	} else if err != nil {
		http.Error(w, "500: Internal server error", http.StatusInternalServerError)
		return
	}

	httputil.FileServer(http.Dir(s.spaPath)).ServeHTTP(w, r)
}

// isLoggedIn returns whether user is logged in and the user's ID if so. ID is
// nil if user is not logged in.
func isLoggedIn(ses *sessions.Session) (bool, *uid.ID) {
	sesUID, ok := ses.Values["uid"]
	if !ok {
		return false, nil
	}
	hex, ok := sesUID.(string)
	if !ok {
		return false, nil
	}
	userID, err := uid.FromString(hex)
	if err != nil {
		return false, nil
	}
	return true, &userID
}

// username should be all lowercase.
func sessionsSetKey(username string) string {
	return "sessions:" + username
}

// loginUser persists the authenticated user onto the session.
func (s *Server) loginUser(u *core.User, ses *sessions.Session, w http.ResponseWriter, r *http.Request) error {
	if u.Banned {
		return httperr.NewForbidden("account_suspended", "User account suspended.")
	}

	conn := s.redisPool.Get()
	defer conn.Close()

	if _, err := conn.Do("SADD", sessionsSetKey(u.UsernameLowerCase), ses.ID); err != nil {
		return err
	}

	ses.Values["uid"] = u.ID.String()
	return ses.Save(w, r)
}

func (s *Server) logoutUser(u *core.User, ses *sessions.Session, w http.ResponseWriter, r *http.Request) error {
	if err := core.DeleteWebPushSubscription(r.Context(), s.db, ses.ID); err != nil {
		return err
	}

	ses.Clear()
	if err := ses.Save(w, r); err != nil {
		return err
	}

	conn := s.redisPool.Get()
	defer conn.Close()

	_, err := conn.Do("SREM", sessionsSetKey(u.UsernameLowerCase), ses.ID)
	return err
}

func (s *Server) logoutAllSessionsOfUser(u *core.User) error {
	conn := s.redisPool.Get()
	defer conn.Close()

	sessionIDs, err := redis.Strings(conn.Do("SMEMBERS", sessionsSetKey(u.UsernameLowerCase)))
	if err != nil {
		return err
	}

	for _, id := range sessionIDs {
		if _, err := conn.Do("DEL", s.sessions.RedisKey(id)); err != nil {
			return err
		}
	}

	_, err = conn.Do("DEL", sessionsSetKey(u.UsernameLowerCase))
	return err
}

// getID writes an error to w if textID is invalid.
func (s *Server) getID(w http.ResponseWriter, r *http.Request, textID string) (id uid.ID, err error) {
	if id, err = uid.FromString(textID); err != nil {
		s.writeErrorCustom(w, r, http.StatusBadRequest, "Invalid ID", "")
	}
	return
}

// modOrAdmin return a nil error if user is either an admin or a moderator (if
// no other error occurs). Returned UserGroup is the user's group in that case.
// If the user is both an admin and a moderator core.UserGroupMods is returned.
//
// If error is non-nil appropriate HTTP responses are sent.
func (s *Server) modOrAdmin(w http.ResponseWriter, r *http.Request, comm *core.Community, user uid.ID) (core.UserGroup, error) {
	g := core.UserGroupNaN

	if comm.ViewerMod.Bool {
		g = core.UserGroupMods
	} else {
		user, err := core.GetUser(r.Context(), s.db, user, nil)
		if err != nil {
			s.writeError(w, r, err)
			return g, err
		}
		if user.Admin {
			g = core.UserGroupAdmins
		} else {
			s.writeError(w, r, err)
			return g, errors.New("user is nether an admin or a mod")
		}
	}

	return g, nil
}

func (s *Server) unmarshalJSON(w http.ResponseWriter, r *http.Request, data []byte, v interface{}) error {
	err := json.Unmarshal(data, v)
	if err != nil {
		s.writeErrorCustom(w, r, http.StatusBadRequest, "Invalid JSON", "")
	}
	return err
}

// If error is non-nil, abort.
func (s *Server) rateLimit(w http.ResponseWriter, r *http.Request, bucketID string, interval time.Duration, maxTokens int) error {
	if s.config.DisableRateLimits {
		return nil
	}

	if s.config.AdminApiKey != "" {
		adminKey := r.URL.Query().Get("adminKey")
		if adminKey == s.config.AdminApiKey {
			return nil
		}
	}

	conn, err := s.redisPool.Dial()
	if err != nil {
		s.writeError(w, r, err)
		return err
	}
	defer conn.Close()

	if ok, err := ratelimits.Limit(conn, bucketID, interval, maxTokens); err != nil {
		s.writeError(w, r, err)
		return err
	} else if !ok {
		s.writeErrorTooManyRequests(w, r, "")
		return errors.New("HTTP 429")
	}
	return nil
}

// If error is non-nil abort.
func (s *Server) rateLimitUpdateContent(w http.ResponseWriter, r *http.Request, userID uid.ID) error {
	if err := s.rateLimit(w, r, "update_stuff_1_"+userID.String(), time.Second*2, 1); err != nil {
		return err
	}
	return s.rateLimit(w, r, "update_stuff_2_"+userID.String(), time.Hour*24, 2000)
}

func (s *Server) rateLimitVoting(w http.ResponseWriter, r *http.Request, userID uid.ID) error {
	if err := s.rateLimit(w, r, "voting_1_"+userID.String(), time.Second, 4); err != nil {
		return err
	}
	return s.rateLimit(w, r, "voting_2_"+userID.String(), time.Hour*24, 2000)
}

// /api/_get_link_info [GET]
func (s *Server) getLinkInfo(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	loggedIn, userID := isLoggedIn(ses)
	if !loggedIn {
		s.writeErrorNotLoggedIn(w, r)
		return
	}

	if err := s.rateLimit(w, r, "get_link_info_"+userID.String(), time.Hour, 1000); err != nil {
		return
	}

	url := r.URL.Query().Get("url")

	res, err := httputil.Get(url)
	if err != nil {
		s.writeError(w, r, err)
		return
	}
	defer res.Body.Close()

	title, err := httputil.ExtractOpenGraphTitle(res.Body)
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	out := struct {
		Title string `json:"title"`
	}{Title: title}

	data, _ := json.Marshal(out)
	w.Write(data)
}

func (s *Server) handleAnalytics(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	_, userID := isLoggedIn(ses)

	ip := httputil.GetIP(r)
	if err := s.rateLimit(w, r, "analytics_ip_1_"+ip, time.Second*1, 2); err != nil {
		return
	}

	m, err := s.bodyToMap(w, r, true)
	if err != nil {
		return
	}

	var payload, uniqueKey string

	switch m["event"] {
	case "pwa_use":
		uniqueKey = "pwa_use_" + ses.ID
		data := make(map[string]any)

		data["userId"] = userID // may be nil
		data["sessionId"] = ses.ID
		data["userAgent"] = r.Header.Get("User-Agent")
		data["ip"] = ip

		dataBytes, err := json.Marshal(data)
		if err != nil {
			s.writeError(w, r, err)
			return
		}

		payload = string(dataBytes)

	default:
		s.writeErrorCustom(w, r, http.StatusBadRequest, "", "bad_event")
		return
	}

	if err := core.CreateAnalyticsEvent(r.Context(), s.db, m["event"], uniqueKey, payload); err != nil {
		s.writeError(w, r, err)
		return
	}

	w.Write([]byte(`{"success":true}`))
}
