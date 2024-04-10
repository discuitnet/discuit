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
	NumMembers int             `json:"no_members"`
}

type MeiliSearchUser struct {
	ID                uid.ID          `json:"id"`
	Username          string          `json:"username"`
	UsernameLowerCase string          `json:"username_lowercase"`
	ParsedUsername    string          `json:"parsed_username"`
	About             msql.NullString `json:"about_me"`
}

type MeiliSearchPost struct {
	ID   uid.ID        `json:"id"`
	Type core.PostType `json:"type"`

	// ID as it appears in the URL.
	PublicID string `json:"public_id"`

	AuthorID       uid.ID `json:"user_id"`
	AuthorUsername string `json:"username"`

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
			NumMembers: community.NumMembers,
		})
	}

	// An index is where the documents are stored.
	index := c.client.Index("communities")

	// Add documents to the index.
	_, err = index.AddDocuments(communitiesToIndex, "id")
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

func (c *MeiliSearch) IndexAllUsersInMeiliSearch(ctx context.Context, db *sql.DB) error {
	// Fetch all users.
	users, err := core.GetUsersForSearch(ctx, db)
	if err != nil {
		return err
	}

	if len(users) == 0 {
		log.Println("No users to index")
		return nil
	}

	log.Printf("Indexing %d users", len(users))

	// Convert the users to the format MeiliSearch expects.
	var usersToIndex []MeiliSearchUser
	for _, user := range users {
		// Exclude the ghost user.
		if user.Username == "ghost" {
			continue
		}

		usersToIndex = append(usersToIndex, MeiliSearchUser{
			ID:                user.ID,
			Username:          user.Username,
			UsernameLowerCase: user.UsernameLowerCase,
			ParsedUsername:    utils.BreakUpOnCapitals(user.Username),
			About:             user.About,
		})
	}

	// An index is where the documents are stored.
	index := c.client.Index("users")

	// Add documents to the index.
	_, err = index.AddDocuments(usersToIndex, "id")
	if err != nil {
		return err
	}

	return nil
}

func (c *MeiliSearch) IndexAllPostsInMeiliSearch(ctx context.Context, db *sql.DB) error {
	// Fetch all posts.
	posts, err := core.GetPostsForSearch(ctx, db)
	if err != nil {
		return err
	}

	if len(posts) == 0 {
		log.Println("No posts to index")
		return nil
	}

	log.Printf("Indexing %d posts", len(posts))

	// Convert the posts to the format MeiliSearch expects.
	var postsToIndex []MeiliSearchPost
	for _, post := range posts {
		postsToIndex = append(postsToIndex, MeiliSearchPost{
			ID:   post.ID,
			Type: post.Type,

			PublicID: post.PublicID,

			AuthorID:       post.AuthorID,
			AuthorUsername: post.AuthorUsername,

			Title: post.Title,
			Body:  post.Body,
		})
	}

	// An index is where the documents are stored.
	index := c.client.Index("posts")

	// Add documents to the index.
	_, err = index.AddDocuments(postsToIndex, "id")
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

func (c *MeiliSearch) SearchUsers(ctx context.Context, query string) (*meilisearch.SearchResponse, error) {
	// An index is where the documents are stored.
	index := c.client.Index("users")

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

func (c *MeiliSearch) GarbageCollect(ctx context.Context) error {
	// TODO: Ensure that we are not holding on to documents that have been deleted in the database.
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
		NumMembers: comm.NumMembers,
	})
	if err != nil {
		log.Printf("Error updating or creating document in MeiliSearch: %v", err)
	}
}

func UserUpdateOrCreateDocumentIfEnabled(ctx context.Context, config *config.Config, user *core.User) {
	if !config.MeiliEnabled {
		return
	}

	client := NewSearchClient(config.MeiliHost, config.MeiliKey)
	err := client.UpdateOrCreateDocument(ctx, "users", MeiliSearchUser{
		ID:                user.ID,
		Username:          user.Username,
		UsernameLowerCase: user.UsernameLowerCase,
		ParsedUsername:    utils.BreakUpOnCapitals(user.Username),
		About:             user.About,
	})
	if err != nil {
		log.Printf("Error updating or creating document in MeiliSearch: %v", err)
	}
}

func PostUpdateOrCreateDocumentIfEnabled(ctx context.Context, config *config.Config, post *core.Post) {
	if !config.MeiliEnabled {
		return
	}

	client := NewSearchClient(config.MeiliHost, config.MeiliKey)
	err := client.UpdateOrCreateDocument(ctx, "posts", MeiliSearchPost{
		ID:   post.ID,
		Type: post.Type,

		PublicID: post.PublicID,

		AuthorID:       post.AuthorID,
		AuthorUsername: post.AuthorUsername,

		Title: post.Title,
		Body:  post.Body,
	})
	if err != nil {
		log.Printf("Error updating or creating document in MeiliSearch: %v", err)
	}
}

func CommunityDeleteDocumentIfEnabled(ctx context.Context, config *config.Config, commID string) {
	if !config.MeiliEnabled {
		return
	}

	client := NewSearchClient(config.MeiliHost, config.MeiliKey)
	err := client.DeleteDocument(ctx, "communities", commID)
	if err != nil {
		log.Printf("Error deleting document in MeiliSearch: %v", err)
	}
}

func UserDeleteDocumentIfEnabled(ctx context.Context, config *config.Config, userID string) {
	if !config.MeiliEnabled {
		return
	}

	client := NewSearchClient(config.MeiliHost, config.MeiliKey)
	err := client.DeleteDocument(ctx, "users", userID)
	if err != nil {
		log.Printf("Error deleting document in MeiliSearch: %v", err)
	}
}

func PostDeleteDocumentIfEnabled(ctx context.Context, config *config.Config, postID string) {
	if !config.MeiliEnabled {
		return
	}

	client := NewSearchClient(config.MeiliHost, config.MeiliKey)
	err := client.DeleteDocument(ctx, "posts", postID)
	if err != nil {
		log.Printf("Error deleting document in MeiliSearch: %v", err)
	}
}