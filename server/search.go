package server

import (
	"slices"

	"github.com/discuitnet/discuit/internal/httperr"
	"github.com/discuitnet/discuit/internal/search"
)

// /api/search [GET]
func (s *Server) search(w *responseWriter, r *request) error {
	if !s.config.SearchEnabled {
		return httperr.NewBadRequest("search_disabled", "Search is disabled.")
	}

	query := r.urlQueryParams()
	r.req.ParseForm()

	// query
	q := query.Get("q")

	// sort
	sort := r.req.Form["sort"]

	// index
	index := query.Get("index")
	if index == "" {
		return httperr.NewBadRequest("missing_index", "Missing index.")
	}

	if !slices.Contains(search.ValidIndexes, index) {
		return httperr.NewBadRequest("invalid_index", "Invalid index.")
	}

	results, err := s.searchEngine.Search(index, q, sort)
	if err != nil {
		return httperr.NewBadRequest("bad_request", err.Error())
	}

	return w.writeJSON(results)
}
