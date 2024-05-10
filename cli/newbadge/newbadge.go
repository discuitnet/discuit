package newbadge

import (
	"database/sql"
	"fmt"

	"github.com/discuitnet/discuit/core"
	"github.com/urfave/cli/v2"
)

var Command = &cli.Command{
	Name:  "new-badge",
	Usage: "New user badge",
	Action: func(ctx *cli.Context) error {
		db := ctx.Context.Value("db").(*sql.DB)
		newBadge := ctx.Args().First()
		if err := core.NewBadgeType(db, newBadge); err != nil {
			return fmt.Errorf("failed to create a new badge: %w", err)
		}
		return nil
	},
}
