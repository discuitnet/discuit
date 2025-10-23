package server

import (
	"compress/gzip"
	"context"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"html/template"
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
	"github.com/discuitnet/discuit/core/ipblocks"
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

var (
	errNotLoggedIn = &httperr.Error{
		HTTPStatus: http.StatusUnauthorized,
		Code:       "not_logged_in",
		Message:    "User is not logged in.",
	}

	errNotAdminNorMod = httperr.NewForbidden("not_admin_nor_mod", "User neither an admin nor a mod.")
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

	ipblocks *ipblocks.Blocker

	// react serve
	reactPath  string
	reactIndex string

	httpLogger        *log.Logger
	httpLoggerFile    *os.File
	http500Logger     *log.Logger
	http500LoggerFile *os.File

	webPushVAPIDKeys core.VAPIDKeys
}

func New(db *sql.DB, conf *config.Config) (*Server, error) {
	r := mux.NewRouter()

	redisStore, err := sessions.NewRedisStore("tcp", conf.RedisAddress, conf.SessionCookieName)
	if err != nil {
		return nil, err
	}
	redisStore.Secure = !conf.UseHTTPCookies

	s := &Server{
		db: db,
		redisPool: &redis.Pool{
			MaxIdle:     3,
			IdleTimeout: 240 * time.Second,
			Dial:        func() (redis.Conn, error) { return redis.Dial("tcp", conf.RedisAddress) },
		},
		router:       r,
		staticRouter: mux.NewRouter(),
		sessions:     redisStore,
		config:       conf,
		reactPath:    "./ui/dist/",
		reactIndex:   "index.html",
		ipblocks:     ipblocks.NewBlocker(db),
	}

	if keys, err := core.GetApplicationVAPIDKeys(context.Background(), db); err != nil {
		log.Printf("Error generating vapid keys: %v (you might want to run migrations)\n", err)
	} else if conf.WebPushSubscriberEmail != "" {
		s.webPushVAPIDKeys = *keys
		core.EnablePushNotifications(keys, conf.WebPushSubscriberEmail)
	}

	s.openLoggers()

	// API routes.
	r.Handle("/api/_initial", s.withHandler(s.initial)).Methods("GET")
	r.Handle("/api/_login", s.withHandler(s.login)).Methods("POST")
	r.Handle("/api/_signup", s.withHandler(s.signup)).Methods("POST")
	r.Handle("/api/_user", s.withHandler(s.getLoggedInUser)).Methods("GET")

	r.Handle("/api/users/{username}", s.withHandler(s.getUser)).Methods("GET")
	r.Handle("/api/users/{username}", s.withHandler(s.deleteUser)).Methods("DELETE")
	r.Handle("/api/users/{username}/feed", s.withHandler(s.getUsersFeed)).Methods("GET")
	r.Handle("/api/users/{username}/pro_pic", s.withHandler(s.handleUserProPic)).Methods("POST", "DELETE")
	r.Handle("/api/users/{username}/badges", s.withHandler(s.addBadge)).Methods("POST")
	r.Handle("/api/users/{username}/badges/{badgeId}", s.withHandler(s.deleteBadge)).Methods("DELETE")
	r.Handle("/api/hidden_posts", s.withHandler(s.handleHiddenPosts)).Methods("POST")
	r.Handle("/api/hidden_posts/{postId}", s.withHandler(s.unhidePost)).Methods("DELETE")

	r.Handle("/api/users/{username}/lists", s.withHandler(s.handleLists)).Methods("GET", "POST")
	r.Handle("/api/lists/_saved_to", s.withHandler(s.getSaveToLists)).Methods("GET")
	r.Handle("/api/users/{username}/lists/{listname}", s.withHandler(s.withListByName(s.handeList))).Methods("GET", "PUT", "DELETE")
	r.Handle("/api/lists/{listId}", s.withHandler(s.withListByID(s.handeList))).Methods("GET", "PUT", "DELETE")
	r.Handle("/api/users/{username}/lists/{listname}/items", s.withHandler(s.withListByName(s.handleListItems))).Methods("GET", "POST", "DELETE")
	r.Handle("/api/lists/{listId}/items", s.withHandler(s.withListByID(s.handleListItems))).Methods("GET", "POST", "DELETE")
	r.Handle("/api/lists/{listId}/items/{itemId}", s.withHandler(s.withListByID(s.deleteListItem))).Methods("DELETE")

	r.Handle("/api/mutes", s.withHandler(s.handleMutes)).Methods("GET", "POST", "DELETE")
	r.Handle("/api/mutes/users/{mutedUserID}", s.withHandler(s.deleteUserMute)).Methods("DELETE")
	r.Handle("/api/mutes/communities/{mutedCommunityID}", s.withHandler(s.deleteCommunityMute)).Methods("DELETE")
	r.Handle("/api/mutes/{muteID}", s.withHandler(s.deleteMute)).Methods("DELETE")

	r.Handle("/api/posts", s.withHandler(s.feed)).Methods("GET")
	r.Handle("/api/posts", s.withHandler(s.addPost)).Methods("POST")
	r.Handle("/api/posts/{postID}", s.withHandler(s.getPost)).Methods("GET")
	r.Handle("/api/posts/{postID}", s.withHandler(s.updatePost)).Methods("PUT")
	r.Handle("/api/posts/{postID}", s.withHandler(s.deletePost)).Methods("DELETE")
	r.Handle("/api/_postVote", s.withHandler(s.postVote)).Methods("POST")
	r.Handle("/api/_uploads", s.withHandler(s.imageUpload)).Methods("POST")
	r.Handle("/api/images/{imageID}", s.withHandler(s.updateImage)).Methods("PUT")

	r.Handle("/api/posts/{postID}/comments", s.withHandler(s.getPostComments)).Methods("GET")
	r.Handle("/api/posts/{postID}/comments", s.withHandler(s.addComment)).Methods("POST")
	r.Handle("/api/posts/{postID}/comments/{commentID}", s.withHandler(s.updateComment)).Methods("PUT")
	r.Handle("/api/posts/{postID}/comments/{commentID}", s.withHandler(s.deleteComment)).Methods("DELETE")
	r.Handle("/api/comments/{commentID}", s.withHandler(s.getComment)).Methods("GET")
	r.Handle("/api/_commentVote", s.withHandler(s.commentVote)).Methods("POST")

	r.Handle("/api/communities", s.withHandler(s.getCommunities)).Methods("GET")
	r.Handle("/api/communities", s.withHandler(s.createCommunity)).Methods("POST")
	r.Handle("/api/_joinCommunity", s.withHandler(s.joinCommunity)).Methods("POST")
	r.Handle("/api/communities/{communityID}", s.withHandler(s.getCommunity)).Methods("GET")
	r.Handle("/api/communities/{communityID}", s.withHandler(s.updateCommunity)).Methods("PUT")

	r.Handle("/api/communities/{communityID}/rules", s.withHandler(s.getCommunityRules)).Methods("GET")
	r.Handle("/api/communities/{communityID}/rules", s.withHandler(s.addCommunityRule)).Methods("POST")
	r.Handle("/api/communities/{communityID}/rules/{ruleID}", s.withHandler(s.getCommunityRule)).Methods("GET")
	r.Handle("/api/communities/{communityID}/rules/{ruleID}", s.withHandler(s.updateCommunityRule)).Methods("PUT")
	r.Handle("/api/communities/{communityID}/rules/{ruleID}", s.withHandler(s.deleteCommunityRule)).Methods("DELETE")

	r.Handle("/api/communities/{communityID}/mods", s.withHandler(s.getCommunityMods)).Methods("GET")
	r.Handle("/api/communities/{communityID}/mods", s.withHandler(s.addCommunityMod)).Methods("POST")
	r.Handle("/api/communities/{communityID}/mods/{mod}", s.withHandler(s.removeCommunityMod)).Methods("DELETE")

	r.Handle("/api/communities/{communityID}/reports", s.withHandler(s.getCommunityReports)).Methods("GET")
	r.Handle("/api/communities/{communityID}/reports/{reportID}", s.withHandler(s.deleteReport)).Methods("DELETE")

	r.Handle("/api/communities/{communityID}/banned", s.withHandler(s.handleCommunityBanned)).Methods("GET", "POST", "DELETE")

	r.Handle("/api/communities/{communityID}/pro_pic", s.withHandler(s.handleCommunityProPic)).Methods("POST", "DELETE")
	r.Handle("/api/communities/{communityID}/banner_image", s.withHandler(s.handleCommunityBannerImage)).Methods("POST", "DELETE")

	r.Handle("/api/notifications", s.withHandler(s.getNotifications)).Methods("GET")
	r.Handle("/api/notifications", s.withHandler(s.updateNotifications)).Methods("POST")
	r.Handle("/api/notifications/{notificationID}", s.withHandler(s.getNotification)).Methods("GET", "PUT")
	r.Handle("/api/notifications/{notificationID}", s.withHandler(s.deleteNotification)).Methods("DELETE")

	r.Handle("/api/push_subscriptions", s.withHandler(s.pushSubscriptions)).Methods("POST")

	r.Handle("/api/community_requests", s.withHandler(s.createCommunityRequest)).Methods("POST")
	r.Handle("/api/community_requests", s.withHandler(s.getCommunityRequests)).Methods("GET")
	r.Handle("/api/community_requests/{requestID}", s.withHandler(s.deleteCommunityRequest)).Methods("DELETE")

	r.Handle("/api/_report", s.withHandler(s.report)).Methods("POST")

	r.Handle("/api/_settings", s.withHandler(s.updateUserSettings)).Methods("POST")

	r.Handle("/api/_admin", s.withHandler(s.adminActions)).Methods("POST")
	r.Handle("/api/users", s.withHandler(s.getUsers)).Methods("GET")
	r.Handle("/api/comments", s.withHandler(s.getComments)).Methods("GET")

	r.Handle("/api/_link_info", s.withHandler(s.getLinkInfo)).Methods("GET")

	r.Handle("/api/analytics", s.withHandler(s.handleAnalytics)).Methods("POST")
	r.Handle("/api/analytics/bss", s.withHandler(s.getBasicSiteStats)).Methods("GET")
	r.Handle("/api/site_settings", s.withHandler(s.handleSiteSettings)).Methods("GET", "PUT")

	r.Handle("/api/ipblocks", s.withHandler(s.handleIPBlocks)).Methods("GET", "POST", "DELETE")
	r.Handle("/api/ipblocks/{blockID}", s.withHandler(s.handleSingleIPBlock)).Methods("GET", "DELETE")

	r.NotFoundHandler = http.HandlerFunc(s.apiNotFoundHandler)
	r.MethodNotAllowedHandler = http.HandlerFunc(s.apiMethodNotAllowedHandler)

	images.HMACKey = []byte(conf.HMACSecret)
	s.staticRouter.PathPrefix("/images/").Handler(&images.Server{
		SkipHashCheck: conf.IsDevelopment,
		DB:            db,
		EnableCORS:    true,
	})

	if conf.UIProxy != "" {
		s.staticRouter.PathPrefix("/").HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ses, err := s.sessions.Get(r)
			if err == nil {
				s.setInitialCookies(w, r, ses)
			}

			httputil.ProxyRequest(w, r, conf.UIProxy+r.URL.Path)
		})
	} else {
		s.staticRouter.PathPrefix("/").HandlerFunc(s.serveSPA)
	}

	if err := s.ipblocks.LoadDatabaseBlocks(context.Background()); err != nil {
		return nil, fmt.Errorf("error loading database blocks: %v", err)
	}

	go reloadTorIPBlocking(db, s.ipblocks)

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

// updateUserLastSeen updates the last seen time and the last seen IP address of
// the logged in user, if the user is logged in, in Redis and persists it to
// MariaDB.
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

func (s *Server) withHandler(h handler) http.Handler {
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
		skipCsrfCheck := s.config.CSRFOff || (s.config.AdminAPIKey != "" && s.config.AdminAPIKey == adminKey) || r.Method == "GET"
		if !skipCsrfCheck {
			csrftoken := r.Header.Get("X-Csrf-Token")
			valid, _ := utils.ValidMAC(ses.ID, csrftoken, s.config.HMACSecret)
			if !valid {
				s.writeErrorCustom(w, r, http.StatusUnauthorized, "", "")
				return
			}
		}

		if err = h(&responseWriter{w: w}, newRequest(r, ses)); err != nil {
			s.writeError(w, r, err)
			return
		}
	})
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

type logField struct {
	name string
	val  any
	off  bool // if off is true, don't print it
}

// let color be empty if you don't want color codes to appear in the log line.
func constructLogLine(fields []logField, color string) string {
	b := strings.Builder{}
	args := make([]any, 0, len(fields))
	oneWritten := false
	if color != "" {
		b.WriteString(color)
	}
	for _, field := range fields {
		if !field.off {
			if oneWritten {
				b.WriteString(" ")
			}
			b.WriteString(field.name)
			b.WriteString("=%v")
			args = append(args, field.val)
			oneWritten = true
		}
	}
	if color != "" {
		b.WriteString("\033[0m")
	}
	return fmt.Sprintf(b.String(), args...)
}

var ipBlockedResponse = []byte(`
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Discuit</title>
  </head>
  <body>
    <p>Suspicious activity detected. Blocked.</p>
  </body>
</html>
`)

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	beginT := time.Now()

	if match, err := s.ipblocks.Match(httputil.GetIP(r)); err != nil {
		log.Println(err)
	} else if match {
		log.Println("Blocking IP: ", httputil.GetIP(r))
		w.WriteHeader(http.StatusForbidden)
		w.Write(ipBlockedResponse)
		return
	}

	switch r.URL.Path {
	case "/robots.txt":
		http.ServeFile(w, r, "./robots.txt")
	case "/manifest.json":
		w.Header().Add("Cache-Control", "no-cache")
		http.ServeFile(w, r, "./ui/dist/manifest.json")
	default:
		if strings.HasPrefix(r.URL.Path, "/api/") {
			w.Header().Add("Content-Type", "application/json; charset=UTF-8")
			w.Header().Add("Cache-Control", "no-store")
			httputil.GzipHandler(s.router).ServeHTTP(w, r)
		} else {
			s.staticRouter.ServeHTTP(w, r)
		}
	}

	sid := "" // session id
	if c, err := r.Cookie(s.config.SessionCookieName); err == nil {
		sid = c.Value
	}

	took := time.Since(beginT)

	logFields := []logField{
		{name: "took", val: took},
		{name: "url", val: r.URL},
		{name: "ip", val: httputil.GetIP(r)},
		{name: "method", val: r.Method},
		{name: "sid", val: sid},
		{name: "user-agent", val: r.Header.Get("User-Agent")},
	}
	s.httpLogger.Println(constructLogLine(logFields, ""))
	if s.config.IsDevelopment && os.Getenv("NO_HTTP_LOG_LINE") != "true" {
		logFields[len(logFields)-1].off = true
		var color string
		if took > time.Millisecond*10 {
			color = "\033[0;33m"
		}
		log.Println(constructLogLine(logFields, color))
	}
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
		scheme := "http://"
		if s.config.CertFile != "" {
			scheme = "https://"
		}
		return scheme + filepath.Join(r.Host, path)
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
				var username string
				if user.IsGhost() {
					user.UnsetToGhost()
					username = user.Username
					user.SetToGhost()
				} else {
					username = user.Username
				}
				appendTitle("@"+username, " on "+s.config.SiteName)
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

	serveIndexFileNotFound := func(perr error) {
		log.Printf("Error serving index.html file: %v\n", perr)

		const tmplStr = `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>{{.Title}}</title>
			</head>
			<body>
				<p>{{.ErrorMessage}}</p>
			</body>
			</html>
		`

		tmpl, err := template.New("page").Parse(tmplStr)
		if err != nil {
			log.Fatalf("Error parsing index.html not found template: %v\n", err)
		}

		data := struct {
			Title        string
			ErrorMessage string
		}{
			Title:        s.config.SiteName,
			ErrorMessage: fmt.Sprintf("Error %s", perr.Error()),
		}

		w.Header().Add("Cache-Control", "no-store")

		if err := tmpl.Execute(w, data); err != nil {
			log.Printf("Error writing index.html not found template: %v\n", err)
		}

	}

	skipServiceWorkerCache := func(header http.Header) {
		header.Add("X-Service-Worker-Cache", "no-store")
	}

	serveIndexFile := func(fileNotFound bool) {
		file, err := os.Open(filepath.Join(s.reactPath, s.reactIndex))
		if err != nil {
			skipServiceWorkerCache(w.Header())
			serveIndexFileNotFound(fmt.Errorf("opening index.html file: %w", err))
			return
		}
		defer file.Close()

		doc, err := html.Parse(file)
		if err != nil {
			serveIndexFileNotFound(fmt.Errorf("parsing index.html file: %w", err))
			return
		}

		s.insertMetaTags(doc, r)

		w.Header().Add("Cache-Control", "no-store")
		if fileNotFound {
			skipServiceWorkerCache(w.Header())
		}

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
		serveIndexFile(false)
		return
	} else if path == "/service-worker.js" {
		w.Header().Add("Cache-Control", "private, max-age=0")
	}

	fpath := filepath.Join(s.reactPath, path)
	_, err = os.Stat(fpath)
	if os.IsNotExist(err) {
		serveIndexFile(true)
		return
	} else if err != nil {
		http.Error(w, "500: Internal server error", http.StatusInternalServerError)
		return
	}

	httputil.FileServer(http.Dir(s.reactPath)).ServeHTTP(w, r)
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

// userSessionsSetRedisKey returns the Redis key where the set of session IDs of the user
// are stored. This is so that when deleting or banning an account, all sessions
// of that user can be purged.
//
// Username should be all lowercase.
func userSessionsSetRedisKey(username string) string {
	return "sessions:" + username
}

// loginUser persists the authenticated user onto the session.
func (s *Server) loginUser(u *core.User, ses *sessions.Session, w http.ResponseWriter, r *http.Request) error {
	if u.Banned {
		return httperr.NewForbidden("account_suspended", "User account suspended.")
	}

	conn := s.redisPool.Get()
	defer conn.Close()

	if _, err := conn.Do("SADD", userSessionsSetRedisKey(u.UsernameLowerCase), ses.ID); err != nil {
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

	_, err := conn.Do("SREM", userSessionsSetRedisKey(u.UsernameLowerCase), ses.ID)
	return err
}

func (s *Server) LogoutAllSessionsOfUser(u *core.User) error {
	conn := s.redisPool.Get()
	defer conn.Close()

	sessionIDs, err := redis.Strings(conn.Do("SMEMBERS", userSessionsSetRedisKey(u.UsernameLowerCase)))
	if err != nil {
		return err
	}

	for _, id := range sessionIDs {
		if _, err := conn.Do("DEL", s.sessions.RedisKey(id)); err != nil {
			return err
		}
	}

	_, err = conn.Do("DEL", userSessionsSetRedisKey(u.UsernameLowerCase))
	return err
}

// strToID always returns either a nil-error or an error of type httperr.Error.
func strToID(s string) (id uid.ID, err error) {
	if id, err = uid.FromString(s); err != nil {
		err = httperr.NewBadRequest("invalid_id", "Invalid ID.")
	}
	return
}

// rateLimit returns an error if the rate limit is reached for the bucket or if
// some other error occurs in the process of checking it. If rateLimit returns
// a non-nil error, the handler should return immediately.
func (s *Server) rateLimit(r *request, bucketID string, interval time.Duration, maxTokens int) error {
	if s.config.DisableRateLimits {
		return nil // skip rate limits
	}

	if s.config.AdminAPIKey != "" {
		adminKey := r.urlQueryParamsValue("adminKey")
		if adminKey == s.config.AdminAPIKey {
			return nil // skip rate limits
		}
	}

	conn, err := s.redisPool.Dial()
	if err != nil {
		return err
	}
	defer conn.Close()

	if ok, err := ratelimits.Limit(conn, bucketID, interval, maxTokens); err != nil {
		return err
	} else if !ok {
		return &httperr.Error{
			HTTPStatus: http.StatusTooManyRequests,
			Code:       "",
			Message:    "",
		}
	}
	return nil
}

func (s *Server) rateLimitUpdateContent(r *request, userID uid.ID) error {
	if err := s.rateLimit(r, "update_stuff_1_"+userID.String(), time.Second*1, 1); err != nil {
		return err
	}
	return s.rateLimit(r, "update_stuff_2_"+userID.String(), time.Hour*24, 2000)
}

func (s *Server) rateLimitVoting(r *request, userID uid.ID) error {
	if err := s.rateLimit(r, "voting_1_"+userID.String(), time.Second, 4); err != nil {
		return err
	}
	return s.rateLimit(r, "voting_2_"+userID.String(), time.Hour*24, 2000)
}

// /api/_get_link_info [GET]
func (s *Server) getLinkInfo(w *responseWriter, r *request) error {
	if !r.loggedIn {
		return errNotLoggedIn
	}

	if err := s.rateLimit(r, "get_link_info_"+r.viewer.String(), time.Hour, 1000); err != nil {
		return err
	}

	url := r.urlQueryParamsValue("url")
	res, err := httputil.Get(url)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	title, err := httputil.ExtractOpenGraphTitle(res.Body)
	if err != nil {
		return err
	}

	out := struct {
		Title string `json:"title"`
	}{Title: title}

	return w.writeJSON(out)
}

func (s *Server) handleAnalytics(w *responseWriter, r *request) error {
	ip := httputil.GetIP(r.req)
	if err := s.rateLimit(r, "analytics_ip_1_"+ip, time.Second*1, 2); err != nil {
		return err
	}

	body := struct {
		Event string `json:"event"`
	}{}
	if err := r.unmarshalJSONBody(&body); err != nil {
		return err
	}

	var payload, uniqueKey string

	switch body.Event {
	case "pwa_use":
		uniqueKey = "pwa_use_" + r.ses.ID
		data := make(map[string]any)

		data["userId"] = r.viewer // may be nil
		data["sessionId"] = r.ses.ID
		data["userAgent"] = r.req.Header.Get("User-Agent")
		data["ip"] = ip

		dataBytes, err := json.Marshal(data)
		if err != nil {
			return err
		}

		payload = string(dataBytes)
	default:
		return httperr.NewBadRequest("bad_event", "Bad event.")
	}

	if err := core.CreateAnalyticsEvent(r.ctx, s.db, body.Event, uniqueKey, payload); err != nil {
		return err
	}

	return w.writeString(`{"success":true}`)
}
