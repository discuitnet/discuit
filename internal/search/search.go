package search

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/discuitnet/discuit/config"
	"github.com/discuitnet/discuit/core"
)

var ValidIndexes = []string{"communities", "users", "posts"}

type SearchResults struct {
	Hits               []interface{} `json:"hits"`
	EstimatedTotalHits int64         `json:"estimatedTotalHits,omitempty"`
	Offset             int64         `json:"offset,omitempty"`
	Limit              int64         `json:"limit,omitempty"`
	ProcessingTimeMs   int64         `json:"processingTimeMs"`
	TotalHits          int64         `json:"totalHits,omitempty"`
	HitsPerPage        int64         `json:"hitsPerPage,omitempty"`
	Page               int64         `json:"page,omitempty"`
	TotalPages         int64         `json:"totalPages,omitempty"`
}

type SearchEngine interface {
	Search(index string, query string, sort []string) (*SearchResults, error)

	IndexAllCommunities(ctx context.Context, db *sql.DB) error
	IndexAllUsers(ctx context.Context, db *sql.DB) error
	IndexAllPosts(ctx context.Context, db *sql.DB) error

	ResetIndex(ctx context.Context, index string) error

	UpdateOrCreateDocument(ctx context.Context, indexName string, document interface{}) error
	DeleteDocument(ctx context.Context, indexName string, documentID string) error

	CommunityUpdateOrCreateDocumentIfEnabled(ctx context.Context, config *config.Config, comm *core.Community)
	CommunityDeleteDocumentIfEnabled(ctx context.Context, config *config.Config, commID string)

	UserUpdateOrCreateDocumentIfEnabled(ctx context.Context, config *config.Config, user *core.User)
	UserDeleteDocumentIfEnabled(ctx context.Context, config *config.Config, userID string)

	PostUpdateOrCreateDocumentIfEnabled(ctx context.Context, config *config.Config, post *core.Post)
	PostDeleteDocumentIfEnabled(ctx context.Context, config *config.Config, postID string)
}

const (
	EngineMeiliSearch = "meilisearch"
)

func InitializeSearchEngine(conf *config.Config) (SearchEngine, error) {
	switch conf.SearchEngine {
	case EngineMeiliSearch:
		return initializeMeiliSearch(conf)
	default:
		return nil, fmt.Errorf("unsupported search engine: %s", conf.SearchEngine)
	}
}

func initializeMeiliSearch(conf *config.Config) (SearchEngine, error) {
	if conf.MeiliHost == "" {
		return nil, errors.New("MeiliSearch configuration is incomplete")
	}

	return NewMeiliSearch(conf.MeiliHost, conf.MeiliKey), nil
}
