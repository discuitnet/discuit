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
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
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
