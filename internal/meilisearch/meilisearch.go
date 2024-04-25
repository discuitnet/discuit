package meilisearch

import (
	"context"
	"database/sql"
	"encoding/json"
	"log"
	"time"

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
	CreatedAt  time.Time       `json:"created_at"`
}

type MeiliSearchUser struct {
	ID                uid.ID          `json:"id"`
	Username          string          `json:"username"`
	UsernameLowerCase string          `json:"username_lowercase"`
	ParsedUsername    string          `json:"parsed_username"`
	About             msql.NullString `json:"about_me"`
	CreatedAt         time.Time       `json:"created_at"`
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

	CommunityID   uid.ID `json:"community_id"`
	CommunityName string `json:"community_name"`

	CreatedAt time.Time `json:"created_at"`
}

func NewSearchClient(host, key string) *MeiliSearch {
	return &MeiliSearch{
		client: meilisearch.NewClient(meilisearch.ClientConfig{
			Host:   host,
			APIKey: key,
		}),
	}
}

func (c *MeiliSearch) index(indexName string, documents []map[string]interface{}) error {
	index := c.client.Index(indexName)
	var objects []map[string]interface{}
	batchSize := 50 * 1024 * 1024 // 50MiB

	totalSize, err := utils.CalculateBatchSize(documents)
	if err != nil {
		return err
	}

	log.Printf("Preparing to index %d documents to %s", len(documents), indexName)

	if float64(totalSize)/1024/1024 < 1 {
		log.Printf("Total size of documents to index: %.2f KiB", float64(totalSize)/1024)
	} else {
		log.Printf("Total size of documents to index: %.2f MiB", float64(totalSize)/1024/1024)
	}

	// Calculate bases on the average size of the objects
	// This is to avoid the 97MiB limit of MeiliSearch
	averageObjSize := totalSize / len(documents)
	expectedNumOfObjectsPerBatch := batchSize / averageObjSize
	log.Printf("Average object size: %.2f KiB", float64(averageObjSize)/1024)
	log.Printf("Expected number of objects per batch: %d", expectedNumOfObjectsPerBatch)

	objects = make([]map[string]interface{}, 0, expectedNumOfObjectsPerBatch)
	currentBatchSize := 0

	for _, doc := range documents {
		var obj map[string]interface{}
		encodedObj, err := json.Marshal(doc)
		if err != nil {
			return err
		}
		if err := json.Unmarshal(encodedObj, &obj); err != nil {
			return err
		}
		objSize := len(encodedObj)

		if currentBatchSize+objSize > batchSize {
			// Batch is full, send it
			if err := sendBatch(index, objects); err != nil {
				return err
			}
			objects = make([]map[string]interface{}, 0, expectedNumOfObjectsPerBatch)
			currentBatchSize = 0
		}

		// Add object to batch
		objects = append(objects, obj)
		currentBatchSize += objSize
	}

	// Send any remaining objects
	if len(objects) > 0 {
		if err := sendBatch(index, objects); err != nil {
			return err
		}
	}

	return nil
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
			CreatedAt:  community.CreatedAt,
		})
	}

	// Convert to interface slice.
	var interfaceSlice []interface{} = make([]interface{}, len(communitiesToIndex))
	for i, v := range communitiesToIndex {
		interfaceSlice[i] = v
	}

	// Convert to map slice.
	documents, err := utils.ConvertToMapSlice(interfaceSlice)
	if err != nil {
		return err
	}

	index := c.client.Index("communities")
	index.UpdateFilterableAttributes(&[]string{"nsfw", "no_members", "created_at"})
	rankingRules := []string{
		"typo",
		"words",
		"proximity",
		"attribute",
		"exactness",
	}
	_, err = index.UpdateRankingRules(&rankingRules)
	if err != nil {
		return err
	}

	// An index is where the documents are stored.
	c.index("communities", documents)

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
			CreatedAt:         user.CreatedAt,
		})
	}

	// Convert to interface slice.
	var interfaceSlice []interface{} = make([]interface{}, len(usersToIndex))
	for i, v := range usersToIndex {
		interfaceSlice[i] = v
	}

	// Convert to map slice.
	documents, err := utils.ConvertToMapSlice(interfaceSlice)
	if err != nil {
		return err
	}

	// Update filterable attributes.
	index := c.client.Index("users")
	index.UpdateFilterableAttributes(&[]string{"created_at"})

	// An index is where the documents are stored.
	c.index("users", documents)

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

			CommunityID:   post.CommunityID,
			CommunityName: post.CommunityName,

			CreatedAt: post.CreatedAt,
		})
	}

	// TODO: After testing, see if possible to also chunk out the database queries into batches.

	// Convert to interface slice.
	var interfaceSlice []interface{} = make([]interface{}, len(postsToIndex))
	for i, v := range postsToIndex {
		interfaceSlice[i] = v
	}

	// Convert to map slice.
	documents, err := utils.ConvertToMapSlice(interfaceSlice)
	if err != nil {
		return err
	}

	// Update filterable attributes.
	index := c.client.Index("posts")
	index.UpdateFilterableAttributes(&[]string{"type", "user_id", "username", "created_at", "community_id", "community_name"})

	// An index is where the documents are stored.
	c.index("posts", documents)

	return nil
}

func (c *MeiliSearch) Search(index string, query string) (*meilisearch.SearchResponse, error) {
	searchResponse, err := c.client.Index(index).Search(query, &meilisearch.SearchRequest{
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
		CreatedAt:  comm.CreatedAt,
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
		CreatedAt:         user.CreatedAt,
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

		CommunityID:   post.CommunityID,
		CommunityName: post.CommunityName,

		CreatedAt: post.CreatedAt,
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

func sendBatch(indexObj *meilisearch.Index, objects []map[string]interface{}) error {
	data, err := json.Marshal(objects)
	if err != nil {
		return err
	}
	if _, err := indexObj.UpdateDocuments(data); err != nil {
		return err
	}
	return nil
}
