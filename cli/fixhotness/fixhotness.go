package fixhotness

import (
	"database/sql"

	"github.com/discuitnet/discuit/core"
	"github.com/urfave/cli/v2"
)

var Command = &cli.Command{
	Name:  "fix-hotness",
	Usage: "Fix hotness of all posts",
	Action: func(ctx *cli.Context) error {
		db := ctx.Context.Value("db").(*sql.DB)
		if err := core.UpdateAllPostsHotness(ctx.Context, db); err != nil {
			return err
		}
		return nil
	},
}
