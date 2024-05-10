package search

import (
	"database/sql"
	"errors"
	"fmt"
	"log"

	"github.com/discuitnet/discuit/config"
	"github.com/discuitnet/discuit/internal/meilisearch"
	"github.com/urfave/cli/v2"
)

var Command = &cli.Command{
	Name:  "search",
	Usage: "Search commands",
	Subcommands: []*cli.Command{
		{
			Name:  "index",
			Usage: "Index data in MeiliSearch",
			Action: func(ctx *cli.Context) error {
				conf := ctx.Context.Value("config").(*config.Config)
				db := ctx.Context.Value("db").(*sql.DB)
				searchClient := ctx.Context.Value("searchClient").(*meilisearch.MeiliSearch)
				index := ctx.Args().First()

				if !conf.MeiliEnabled {
					return errors.New("MeiliSearch is not enabled")
				}

				switch index {
				case "communities":
					if err := searchClient.IndexAllCommunitiesInMeiliSearch(ctx.Context, db); err != nil {
						return fmt.Errorf("failed to index all communities in MeiliSearch: %w", err)
					}
					log.Printf("All communities indexed in MeiliSearch\n")
				case "users":
					if err := searchClient.IndexAllUsersInMeiliSearch(ctx.Context, db); err != nil {
						return fmt.Errorf("failed to index all users in MeiliSearch: %w", err)
					}
					log.Printf("All users indexed in MeiliSearch\n")
				case "posts":
					if err := searchClient.IndexAllPostsInMeiliSearch(ctx.Context, db); err != nil {
						return fmt.Errorf("failed to index all posts in MeiliSearch: %w", err)
					}
					log.Printf("All posts indexed in MeiliSearch\n")
				case "all":
					if err := searchClient.IndexAllCommunitiesInMeiliSearch(ctx.Context, db); err != nil {
						return fmt.Errorf("failed to index all communities in MeiliSearch: %w", err)
					}
					log.Printf("All communities indexed in MeiliSearch\n")

					if err := searchClient.IndexAllUsersInMeiliSearch(ctx.Context, db); err != nil {
						return fmt.Errorf("failed to index all users in MeiliSearch: %w", err)
					}
					log.Printf("All users indexed in MeiliSearch\n")

					if err := searchClient.IndexAllPostsInMeiliSearch(ctx.Context, db); err != nil {
						return fmt.Errorf("failed to index all posts in MeiliSearch: %w", err)
					}
					log.Printf("All posts indexed in MeiliSearch\n")
				default:
					return errors.New("invalid index")
				}
				return nil
			},
		},
		{
			Name:  "reset",
			Usage: "Reset MeiliSearch index",
			Action: func(ctx *cli.Context) error {
				conf := ctx.Context.Value("config").(*config.Config)
				searchClient := ctx.Context.Value("searchClient").(*meilisearch.MeiliSearch)
				index := ctx.Args().First()

				if !conf.MeiliEnabled {
					return errors.New("MeiliSearch is not enabled")
				}

				if index == "all" {
					for _, idx := range meilisearch.ValidIndexes {
						if err := searchClient.ResetIndex(ctx.Context, idx); err != nil {
							return fmt.Errorf("failed to reset MeiliSearch index: %w", err)
						}
						log.Printf("MeiliSearch index %s reset\n", idx)
					}
				}
				if index == "" {
					return errors.New("index name is required")
				} else {
					if err := searchClient.ResetIndex(ctx.Context, index); err != nil {
						return fmt.Errorf("failed to reset MeiliSearch index: %w", err)
					}
				}

				log.Printf("MeiliSearch index %s reset\n", index)
				return nil
			},
		},
	},
}
