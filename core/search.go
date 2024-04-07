package core

import (
	"context"
	"database/sql"
	"fmt"
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

type MeiliSearchPost struct {
	ID    uid.ID          `json:"id"`
	Title string          `json:"title"`
	Body  msql.NullString `json:"body"`
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

	if len(communities) == 0 {
		log.Println("No communities to index")
		return nil
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

func (c *MeiliSearch) IndexAllPostsInMeiliSearch(ctx context.Context, db *sql.DB) error {
	// Fetch all posts.
	posts, err := getPostsForSearch(ctx, db)
	if err != nil {
		return err
	}

	if len(posts) == 0 {
		log.Println("No posts to index")
		return nil
	}

	log.Printf("Indexing %d posts", len(posts))

	fmt.Println(posts)

	// An index is where the documents are stored.
	index := c.client.Index("posts")

	// Add documents to the index.
	_, err = index.AddDocuments(posts)
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

func (c *MeiliSearch) SearchPosts(ctx context.Context, query string) (*meilisearch.SearchResponse, error) {
	// An index is where the documents are stored.
	index := c.client.Index("posts")

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
