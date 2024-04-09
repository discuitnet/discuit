package meilisearch

import (
	"context"
	"database/sql"
	"log"

	"github.com/discuitnet/discuit/config"
	"github.com/discuitnet/discuit/core"
	msql "github.com/discuitnet/discuit/internal/sql"
	"github.com/discuitnet/discuit/internal/uid"
	"github.com/discuitnet/discuit/internal/utils"
	"github.com/meilisearch/meilisearch-go"
)

type MeiliSearch struct {
	client *meilisearch.Client
}

type MeiliSearchCommunity struct {
	ID         uid.ID          `json:"id"`
	Name       string          `json:"name"`
	ParsedName string          `json:"parsed_name"`
	NSFW       bool            `json:"nsfw"`
	About      msql.NullString `json:"about"`
}

func NewSearchClient(host, key string) *MeiliSearch {
	return &MeiliSearch{
		client: meilisearch.NewClient(meilisearch.ClientConfig{
			Host:   host,
			APIKey: key,
		}),
	}
}

func (c *MeiliSearch) IndexAllCommunitiesInMeiliSearch(ctx context.Context, db *sql.DB) error {
	// Fetch all communities.
	communities, err := core.GetCommunitiesForSearch(ctx, db)
	if err != nil {
		return err
	}

	if len(communities) == 0 {
		log.Println("No communities to index")
		return nil
	}

	log.Printf("Indexing %d communities", len(communities))

	// Convert the communities to the format MeiliSearch expects.
	var communitiesToIndex []MeiliSearchCommunity
	for _, community := range communities {
		communitiesToIndex = append(communitiesToIndex, MeiliSearchCommunity{
			ID:         community.ID,
			Name:       community.Name,
			ParsedName: utils.BreakUpOnCapitals(community.Name),
			NSFW:       community.NSFW,
			About:      community.About,
		})
	}

	// An index is where the documents are stored.
	index := c.client.Index("communities")

	// Add documents to the index.
	_, err = index.AddDocuments(communitiesToIndex)
	if err != nil {
		return err
	}

	// Define your ranking rules
	rankingRules := []string{
		"typo",
		"words",
		"proximity",
		"attribute",
		"exactness",
	}

	// Update ranking rules
	_, err = index.UpdateRankingRules(&rankingRules)
	if err != nil {
		return err
	}

	return nil
}

func (c *MeiliSearch) SearchCommunities(ctx context.Context, query string) (*meilisearch.SearchResponse, error) {
	// An index is where the documents are stored.
	index := c.client.Index("communities")

	// Search for documents in the index.
	searchResponse, err := index.Search(query, &meilisearch.SearchRequest{
		Limit: 10,
	})
	if err != nil {
		return nil, err
	}

	return searchResponse, nil
}

func (c *MeiliSearch) ResetIndex(ctx context.Context, indexName string) error {
	index := c.client.Index(indexName)
	_, err := index.DeleteAllDocuments()
	if err != nil {
		return err
	}

	return nil
}

func (c *MeiliSearch) UpdateOrCreateDocument(ctx context.Context, indexName string, document interface{}) error {
	index := c.client.Index(indexName)
	_, err := index.UpdateDocuments([]interface{}{document})
	if err != nil {
		return err
	}

	return nil
}

func (c *MeiliSearch) DeleteDocument(ctx context.Context, indexName string, documentID string) error {
	index := c.client.Index(indexName)
	_, err := index.DeleteDocument(documentID)
	if err != nil {
		return err
	}

	return nil
}

func CommunityUpdateOrCreateDocumentIfEnabled(ctx context.Context, config *config.Config, comm *core.Community) {
	if !config.MeiliEnabled {
		return
	}

	client := NewSearchClient(config.MeiliHost, config.MeiliKey)
	err := client.UpdateOrCreateDocument(ctx, "communities", MeiliSearchCommunity{
		ID:         comm.ID,
		Name:       comm.Name,
		ParsedName: utils.BreakUpOnCapitals(comm.Name),
		NSFW:       comm.NSFW,
		About:      comm.About,
	})
	if err != nil {
		log.Printf("Error updating or creating document in MeiliSearch: %v", err)
	}
}
