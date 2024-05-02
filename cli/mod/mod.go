package mod

import (
	"database/sql"
	"log"

	"github.com/discuitnet/discuit/core"
	"github.com/urfave/cli/v2"
)

var Command = &cli.Command{
	Name:  "mod",
	Usage: "Moderator commands",
	Subcommands: []*cli.Command{
		{
			Name:  "make",
			Usage: "Make user a moderator",
			Flags: []cli.Flag{
				&cli.StringFlag{
					Name:     "community",
					Usage:    "Community name",
					Required: true,
				},
			},
			Action: func(ctx *cli.Context) error {
				db := ctx.Context.Value("db").(*sql.DB)
				communityName := ctx.String("community")
				username := ctx.Args().First()
				community, err := core.GetCommunityByName(ctx.Context, db, communityName, nil)
				if err != nil {
					return err
				}
				user, err := core.GetUserByUsername(ctx.Context, db, username, nil)
				if err != nil {
					return err
				}
				if err = core.MakeUserModCLI(db, community, user.ID, true); err != nil {
					return err
				}
				log.Printf("%s is now a moderator of %s\n", user.Username, community.Name)
				return nil
			},
		},
		{
			Name:  "remove",
			Usage: "Remove user as moderator",
			Flags: []cli.Flag{
				&cli.StringFlag{
					Name:     "community",
					Usage:    "Community name",
					Required: true,
				},
			},
			Action: func(ctx *cli.Context) error {
				db := ctx.Context.Value("db").(*sql.DB)
				communityName := ctx.String("community")
				username := ctx.Args().First()
				community, err := core.GetCommunityByName(ctx.Context, db, communityName, nil)
				if err != nil {
					return err
				}
				user, err := core.GetUserByUsername(ctx.Context, db, username, nil)
				if err != nil {
					return err
				}
				if err = core.MakeUserModCLI(db, community, user.ID, false); err != nil {
					return err
				}
				log.Printf("%s is no longer a moderator of %s\n", user.Username, community.Name)
				return nil
			},
		},
	},
}
