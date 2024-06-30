package admin

import (
	"database/sql"
	"fmt"
	"log"

	"github.com/discuitnet/discuit/core"
	"github.com/urfave/cli/v2"
)

var Command = &cli.Command{
	Name:  "admin",
	Usage: "Admin commands",
	Subcommands: []*cli.Command{
		{
			Name:  "make",
			Usage: "Make user an admin",
			Action: func(ctx *cli.Context) error {
				db := ctx.Context.Value("db").(*sql.DB)
				username := ctx.Args().First()
				user, err := core.MakeAdmin(ctx.Context, db, username, true)
				if err != nil {
					return fmt.Errorf("failed to make %s an admin: %w", username, err)
				}
				log.Printf("User %s is now an admin\n", user.Username)
				return nil
			},
		},
		{
			Name:  "remove",
			Usage: "Remove user as admin",
			Action: func(ctx *cli.Context) error {
				db := ctx.Context.Value("db").(*sql.DB)
				username := ctx.Args().First()
				user, err := core.MakeAdmin(ctx.Context, db, username, false)
				if err != nil {
					return fmt.Errorf("failed to remove %s as an admin: %w", username, err)
				}
				log.Printf("User %s is no longer an admin", user.Username)
				return nil
			},
		},
	},
}
