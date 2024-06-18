package images

import (
	"database/sql"
	"io"
	"log"
	"net/http"
)

// Server implements the http.Handler interface.
//
// Set HMACKey and FullImageURL before this server is started.
type Server struct {
	SkipHashCheck bool
	DB            *sql.DB
	CacheDisabled bool

	// If enabled, CORS headers will be set for all responses from this server,
	// so that images can be downloaded dynamically using Javascript APIs in the
	// web environment.
	EnableCORS bool
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if s.EnableCORS {
		w.Header().Add("Access-Control-Allow-Origin", "*")
		if r.Method == "OPTIONS" {
			// Handle preflighted requests.
			w.Header().Add("Access-Control-Allow-Methods", "GET")
			w.Header().Add("Access-Control-Max-Age", "86400") // a day
			return
		}
	}

	imgReq, err := fromURL(r.URL)
	if err != nil {
		s.writeError(w, http.StatusBadRequest, "")
		return
	}

	if !s.SkipHashCheck {
		if !imgReq.valid() {
			s.writeError(w, http.StatusBadRequest, "Bad signature")
			return
		}
	}

	image, err := getImage(r.Context(), s.DB, imgReq, !s.CacheDisabled)
	if err != nil {
		if err == ErrImageNotFound {
			s.writeError(w, http.StatusNotFound, "Image not found")
		} else {
			s.writeInternalServerError(w, err)
		}
		return
	}
	w.Header().Add("Cache-Control", "public, max-age=31536000, immutable")
	w.Write(image)
}

func (s *Server) writeError(w http.ResponseWriter, statusCode int, message string) {
	w.WriteHeader(statusCode)
	if message == "" {
		message = http.StatusText(statusCode)
	}
	io.WriteString(w, message)
}

// err is for logging purposes only.
func (s *Server) writeInternalServerError(w http.ResponseWriter, err error) {
	s.writeError(w, http.StatusInternalServerError, "")
	log.Println("images server 500 error: ", err)
}
