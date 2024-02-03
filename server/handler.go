package server

import (
	"context"
	"encoding/json"
	"net/http"
	"net/url"

	"github.com/discuitnet/discuit/internal/httperr"
	"github.com/discuitnet/discuit/internal/sessions"
	"github.com/discuitnet/discuit/internal/uid"
	"github.com/gorilla/mux"
)

// responseWriter implements, and augments, http.ResponseWriter.
type responseWriter struct {
	w           http.ResponseWriter
	wrote       bool
	wroteHeader bool
}

func (rw *responseWriter) Header() http.Header {
	return rw.w.Header()
}

func (rw *responseWriter) Write(b []byte) (int, error) {
	rw.wrote = true
	rw.wroteHeader = true
	return rw.w.Write(b)
}

func (rw *responseWriter) WriteHeader(statusCode int) {
	rw.wroteHeader = true
	rw.w.WriteHeader(statusCode)
}

func (rw *responseWriter) writeJSON(v any) error {
	return json.NewEncoder(rw).Encode(v)
}

func (rw *responseWriter) writeString(s string) error {
	_, err := rw.Write([]byte(s))
	return err
}

// A request represents an HTTP request specific to Server.
type request struct {
	req *http.Request
	ctx context.Context
	ses *sessions.Session

	loggedIn bool
	viewer   *uid.ID // logged in user
}

func newRequest(r *http.Request, ses *sessions.Session) *request {
	newR := &request{
		req: r,
		ctx: r.Context(),
		ses: ses,
	}
	if sesUID, ok := ses.Values["uid"]; ok {
		if hex, ok := sesUID.(string); ok {
			if id, err := uid.FromString(hex); err == nil {
				newR.viewer = &id
				newR.loggedIn = true
			}
		}
	}
	return newR
}

func (r *request) muxVar(name string) string {
	return mux.Vars(r.req)[name]
}

// unmarshalJSONBody returns a bad request httperr.Error on failure to unmarshal
// the request body to v.
func (r *request) unmarshalJSONBody(v any) error {
	err := json.NewDecoder(r.req.Body).Decode(v)
	if err != nil {
		//lint:ignore S1020 this is an error with the linter
		if _, ok := err.(*json.SyntaxError); ok {
			return httperr.NewBadRequest("invalid_json", "Invalid JSON body.")
		}
	}
	return err
}

func (r *request) urlQuery() url.Values {
	return r.req.URL.Query()
}

func (r *request) urlQueryValue(name string) string {
	return r.urlQuery().Get(name)
}

// The error returned from handler is used to handle http error cases (non-1xx
// and non-2xx http responses) in conjunction with httperr.Error. The caller of
// handler should check the error and write the appropriate error message, with
// the appropriate HTTP headers, to responseWriter.
type handler func(*responseWriter, *request) error

type anymap map[string]any
