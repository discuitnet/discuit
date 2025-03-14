package httputil

import (
	"compress/gzip"
	"io"
	"net/http"
	"os"
	"path"
	"strconv"
	"strings"
)

// FileServer is like http.FileServer except if name.gz file is found, it's
// assumed to be gzipped, and is served instead without the .gz suffix (if all
// appropriate request headers are present).
//
// A Cache-Control header is added to all responses of this server, unless one
// is already added before, in which case it's left as is.
func FileServer(root http.FileSystem) http.Handler {
	return &fileHandler{root}
}

type fileHandler struct {
	root http.FileSystem
}

func (f *fileHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	upath := r.URL.Path
	if !strings.HasPrefix(upath, "/") {
		upath = "/" + upath
		r.URL.Path = upath
	}
	serveGzip(w, r, f.root, path.Clean(upath))
}

func serveGzip(w http.ResponseWriter, r *http.Request, fs http.FileSystem, name string) {
	accept := AcceptEncoding(r.Header, "gzip")

	var f http.File
	var err error
	if accept {
		f, err = fs.Open(name + ".gz")
		if err != nil { // fallback to uncompressed
			f, err = fs.Open(name)
			if err != nil {
				httpError(w, err)
				return
			}
			defer f.Close()
			accept = false
		} else {
			defer f.Close()
		}
	} else {
		f, err = fs.Open(name)
		if err != nil {
			httpError(w, err)
			return
		}
	}

	info, err := f.Stat()
	if err != nil {
		httpError(w, err)
		return
	}
	if info.IsDir() {
		http.Error(w, "404 file not found", http.StatusNotFound)
		return
	}
	if accept {
		w.Header().Add("Content-Encoding", "gzip")
		if len(r.Header["Range"]) == 0 {
			w.Header().Add("Content-Length", strconv.FormatInt(info.Size(), 10))
		}
	}

	if w.Header().Get("Cache-Control") == "" {
		w.Header().Add("Cache-Control", "public, max-age=3600, immutable")
	}
	http.ServeContent(w, r, name, info.ModTime(), f)
}

func httpError(w http.ResponseWriter, err error) {
	if os.IsNotExist(err) {
		http.Error(w, "404 file not found", http.StatusNotFound)
		return
	}
	if os.IsPermission(err) {
		http.Error(w, "403 forbidden", http.StatusForbidden)
		return
	}
	http.Error(w, "500 internal server error", http.StatusInternalServerError)
}

// AcceptEncoding returns true if h contains encoding in an Accept-Encoding HTTP
// header.
func AcceptEncoding(h http.Header, encoding string) bool {
	for _, val := range h.Values("Accept-Encoding") {
		if val != "" {
			for _, s := range strings.Split(val, ",") {
				if strings.TrimSpace(s) == encoding {
					return true
				}
			}
		}
	}
	return false
}

type gzipResponseWriter struct {
	io.Writer
	http.ResponseWriter
}

func (w gzipResponseWriter) Write(p []byte) (int, error) {
	return w.Writer.Write(p)
}

func GzipHandler(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !AcceptEncoding(r.Header, "gzip") {
			h.ServeHTTP(w, r)
			return
		}

		w.Header().Set("Content-Encoding", "gzip")
		gz := gzip.NewWriter(w)
		defer gz.Close()
		h.ServeHTTP(gzipResponseWriter{Writer: gz, ResponseWriter: w}, r)
	})
}
