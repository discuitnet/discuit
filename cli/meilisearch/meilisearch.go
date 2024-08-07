package meilisearch

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"

	"github.com/discuitnet/discuit/config"
	"github.com/discuitnet/discuit/internal/meilisearch"
	"github.com/urfave/cli/v2"
)

var Command = &cli.Command{
	Name:  "meilisearch",
	Usage: "Manage MeiliSearch indexing",
	Before: func(ctx *cli.Context) error {
		if !validateConfig(ctx) {
			return errors.New("MeiliSearch is not enabled")
		}
		return nil
	},
	Subcommands: []*cli.Command{
		{
			Name:   "index",
			Usage:  "Index data in MeiliSearch (communities, users, posts, all)",
			Action: indexAction,
		},
		{
			Name:   "reset",
			Usage:  "Reset MeiliSearch index (communities, users, posts, all)",
			Action: resetAction,
		},
	},
}

func indexAction(ctx *cli.Context) error {
	db := ctx.Context.Value("db").(*sql.DB)
	searchClient := ctx.Context.Value("searchClient").(*meilisearch.MeiliSearch)
	index := ctx.Args().First()

	switch index {
	case "communities", "users", "posts", "all":
		return handleIndex(ctx.Context, db, searchClient, index)
	default:
		return errors.New("invalid index specified")
	}
}

func resetAction(ctx *cli.Context) error {
	searchClient := ctx.Context.Value("searchClient").(*meilisearch.MeiliSearch)
	index := ctx.Args().First()

	if index == "" {
		return errors.New("index name is required")
	}

	if index == "all" {
		return resetAllIndexes(ctx.Context, searchClient)
	}

	return resetSingleIndex(ctx.Context, searchClient, index)
}

func validateConfig(ctx *cli.Context) bool {
	conf := ctx.Context.Value("config").(*config.Config)
	return conf.MeiliEnabled
}

func handleIndex(ctx context.Context, db *sql.DB, searchClient *meilisearch.MeiliSearch, index string) error {
	// Extracted shared logic for indexing
	entities := map[string]func(context.Context, *sql.DB) error{
		"communities": searchClient.IndexAllCommunitiesInMeiliSearch,
		"users":       searchClient.IndexAllUsersInMeiliSearch,
		"posts":       searchClient.IndexAllPostsInMeiliSearch,
	}

	if index == "all" {
		for key, action := range entities {
			if err := action(ctx, db); err != nil {
				return fmt.Errorf("failed to index all %s in MeiliSearch: %w", key, err)
			}
			log.Printf("All %s indexed in MeiliSearch\n", key)
		}
		return nil
	}

	if err := entities[index](ctx, db); err != nil {
		return fmt.Errorf("failed to index all %s in MeiliSearch: %w", index, err)
	}
	log.Printf("All %s indexed in MeiliSearch\n", index)
	return nil
}

func resetAllIndexes(ctx context.Context, searchClient *meilisearch.MeiliSearch) error {
	for _, idx := range meilisearch.ValidIndexes {
		if err := searchClient.ResetIndex(ctx, idx); err != nil {
			return fmt.Errorf("failed to reset MeiliSearch index %s: %w", idx, err)
		}
		log.Printf("MeiliSearch index %s reset\n", idx)
	}
	return nil
}

func resetSingleIndex(ctx context.Context, searchClient *meilisearch.MeiliSearch, index string) error {
	if err := searchClient.ResetIndex(ctx, index); err != nil {
		return fmt.Errorf("failed to reset MeiliSearch index %s: %w", index, err)
	}
	log.Printf("MeiliSearch index %s reset\n", index)
	return nil
}
