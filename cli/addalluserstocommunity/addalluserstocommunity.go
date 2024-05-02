package addalluserstocommunity

import (
	"database/sql"
	"fmt"
	"log"

	"github.com/discuitnet/discuit/core"
	"github.com/urfave/cli/v2"
)

var Command = &cli.Command{
	Name:  "add-all-users-to-community",
	Usage: "Add all users to community",
	Action: func(ctx *cli.Context) error {
		db := ctx.Context.Value("db").(*sql.DB)
		communityName := ctx.Args().First()
		if err := core.AddAllUsersToCommunity(ctx.Context, db, communityName); err != nil {
			return fmt.Errorf("failed to add all users to %s: %w", communityName, err)
		}
		log.Printf("All users added to %s\n", communityName)
		return nil
	},
}
