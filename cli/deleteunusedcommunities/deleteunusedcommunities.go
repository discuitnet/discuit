package deleteunusedcommunities

import (
	"database/sql"
	"fmt"
	"log"

	"github.com/discuitnet/discuit/core"
	"github.com/urfave/cli/v2"
)

const defaultDays = "30"

var Command = &cli.Command{
	Name:  "delete-unused-communities",
	Usage: "Delete all communities with 0 posts older than (by default) " + defaultDays + " days",
	Flags: []cli.Flag{
		&cli.IntFlag{
			Name:        "days",
			Usage:       "Only deletes communities older than this many days",
			DefaultText: defaultDays,
		},
	},
	Action: func(ctx *cli.Context) error {
		db := ctx.Context.Value("db").(*sql.DB)
		days := uint(ctx.Int("days"))
		if err := core.DeleteUnusedCommunities(ctx.Context, db, days); err != nil {
			return fmt.Errorf("failed delete empty communities older than %d days: %w", days, err)
		} else {
			log.Println("Deleted the communities successfully")
		}
		return nil
	},
}
