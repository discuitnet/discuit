package server

import (
	"github.com/discuitnet/discuit/core"
	"github.com/discuitnet/discuit/internal/httperr"
)

// /api/search [GET]
func (s *Server) search(w *responseWriter, r *request) error {
	query := r.urlQuery()

	// query
	q := query.Get("q")
	if q == "" {
		return httperr.NewBadRequest("missing_query", "Missing query.")
	}

	// index
	index := query.Get("index")
	if index == "" {
		return httperr.NewBadRequest("missing_index", "Missing index.")
	}

	searchClient := core.NewSearchClient(s.config.MeiliHost, s.config.MeiliKey)

	switch index {
	case "communities":
		results, err := searchClient.SearchCommunities(r.ctx, q)
		if err != nil {
			return err
		}

		return w.writeJSON(results.Hits) // Now, only pass the payload
	case "posts":
		results, err := searchClient.SearchPosts(r.ctx, q)
		if err != nil {
			return err
		}

		return w.writeJSON(results.Hits) // Now, only pass the payload
	default:
		return httperr.NewBadRequest("invalid_index", "Invalid index.")
	}
}
