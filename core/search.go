package core

import (
	"context"
	"database/sql"
	"log"

	msql "github.com/discuitnet/discuit/internal/sql"
	"github.com/discuitnet/discuit/internal/uid"
	"github.com/meilisearch/meilisearch-go"
)

type MeiliSearch struct {
	client *meilisearch.Client
}

type MeiliSearchCommunity struct {
	ID    uid.ID          `json:"id"`
	Name  string          `json:"name"`
	NSFW  bool            `json:"nsfw"`
	About msql.NullString `json:"about"`
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
	communities, err := getCommunitiesForSearch(ctx, db)
	if err != nil {
		return err
	}

	log.Printf("Indexing %d communities", len(communities))

	// Convert the communities to the format MeiliSearch expects.
	var communitiesToIndex []MeiliSearchCommunity
	for _, community := range communities {
		communitiesToIndex = append(communitiesToIndex, MeiliSearchCommunity{
			ID:    community.ID,
			Name:  community.Name,
			NSFW:  community.NSFW,
			About: community.About,
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

func (c *MeiliSearch) ResetIndex(ctx context.Context, indexName string) error {
	index := c.client.Index(indexName)
	_, err := index.DeleteAllDocuments()
	if err != nil {
		return err
	}

	return nil
}
