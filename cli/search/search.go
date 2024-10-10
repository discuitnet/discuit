package search

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"

	"github.com/discuitnet/discuit/config"
	"github.com/discuitnet/discuit/internal/search"
	"github.com/urfave/cli/v2"
)

var Command = &cli.Command{
	Name:  "search",
	Usage: "Manage search indexes",
	Before: func(ctx *cli.Context) error {
		if !validateConfig(ctx) {
			return errors.New("search engine is not enabled")
		}
		return nil
	},
	Subcommands: []*cli.Command{
		{
			Name:   "index",
			Usage:  "Index data (communities, users, posts, all)",
			Action: indexAction,
		},
		{
			Name:   "reset",
			Usage:  "Reset search index (communities, users, posts, all)",
			Action: resetAction,
		},
	},
}

func indexAction(ctx *cli.Context) error {
	db := ctx.Context.Value("db").(*sql.DB)
	searchEngine := ctx.Context.Value("searchEngine").(search.SearchEngine)
	index := ctx.Args().First()

	switch index {
	case "communities", "users", "posts", "all":
		return handleIndex(ctx.Context, db, searchEngine, index)
	default:
		return errors.New("invalid index specified")
	}
}

func resetAction(ctx *cli.Context) error {
	searchEngine := ctx.Context.Value("searchEngine").(search.SearchEngine)
	index := ctx.Args().First()

	if index == "" {
		return errors.New("index name is required")
	}

	if index == "all" {
		return resetAllIndexes(ctx.Context, searchEngine)
	}

	return resetSingleIndex(ctx.Context, searchEngine, index)
}

func validateConfig(ctx *cli.Context) bool {
	conf := ctx.Context.Value("config").(*config.Config)
	return conf.SearchEnabled
}

func handleIndex(ctx context.Context, db *sql.DB, searchEngine search.SearchEngine, index string) error {
	// Extracted shared logic for indexing
	entities := map[string]func(context.Context, *sql.DB) error{
		"communities": searchEngine.IndexAllCommunities,
		"users":       searchEngine.IndexAllUsers,
		"posts":       searchEngine.IndexAllPosts,
	}

	if index == "all" {
		for key, action := range entities {
			if err := action(ctx, db); err != nil {
				return fmt.Errorf("failed to index all %s: %w", key, err)
			}
			log.Printf("All %s indexed\n", key)
		}
		return nil
	}

	if err := entities[index](ctx, db); err != nil {
		return fmt.Errorf("failed to index all %s: %w", index, err)
	}
	log.Printf("All %s indexed\n", index)
	return nil
}

func resetAllIndexes(ctx context.Context, searchEngine search.SearchEngine) error {
	for _, idx := range search.ValidIndexes {
		if err := searchEngine.ResetIndex(ctx, idx); err != nil {
			return fmt.Errorf("failed to reset MeiliSearch index %s: %w", idx, err)
		}
		log.Printf("MeiliSearch index %s reset\n", idx)
	}
	return nil
}

func resetSingleIndex(ctx context.Context, searchEngine search.SearchEngine, index string) error {
	if err := searchEngine.ResetIndex(ctx, index); err != nil {
		return fmt.Errorf("failed to reset MeiliSearch index %s: %w", index, err)
	}
	log.Printf("MeiliSearch index %s reset\n", index)
	return nil
}
