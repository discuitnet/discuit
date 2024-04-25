package server

import (
	"github.com/discuitnet/discuit/internal/httperr"
	"github.com/discuitnet/discuit/internal/meilisearch"
)

// /api/search [GET]
func (s *Server) search(w *responseWriter, r *request) error {
	if !s.config.MeiliEnabled {
		return httperr.NewBadRequest("meili_disabled", "MeiliSearch is disabled.")
	}

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

	searchClient := meilisearch.NewSearchClient(s.config.MeiliHost, s.config.MeiliKey)

	switch index {
	case "communities":
		results, err := searchClient.Search("communities", q)
		if err != nil {
			return err
		}

		return w.writeJSON(results)
	case "users":
		results, err := searchClient.Search("users", q)
		if err != nil {
			return err
		}

		return w.writeJSON(results)
	case "posts":
		results, err := searchClient.Search("posts", q)
		if err != nil {
			return err
		}

		return w.writeJSON(results)
	default:
		return httperr.NewBadRequest("invalid_index", "Invalid index.")
	}
}
