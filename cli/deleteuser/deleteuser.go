package deleteuser

import (
	"context"
	"database/sql"
	"log"

	"github.com/discuitnet/discuit/config"
	"github.com/discuitnet/discuit/core"
	"github.com/discuitnet/discuit/server"
	"github.com/urfave/cli/v2"

	discuitCLI "github.com/discuitnet/discuit/cli"
)

var Command = &cli.Command{
	Name:  "delete-user",
	Usage: "Delete a user",
	Flags: []cli.Flag{
		&cli.StringFlag{
			Name:     "user",
			Usage:    "Username",
			Required: true,
		},
		&cli.BoolFlag{
			Name:  "purge",
			Usage: "Delete all posts and comments of the user as well",
		},
	},
	Action: func(ctx *cli.Context) error {
		db := ctx.Context.Value("db").(*sql.DB)
		conf := ctx.Context.Value("config").(*config.Config)
		username := ctx.String("user")
		purge := ctx.Bool("purge")

		site, err := server.New(db, conf)
		if err != nil {
			log.Fatal("Error creating server: ", err)
		}
		defer site.Close()

		if ok := discuitCLI.YesConfirmCommand(); !ok {
			log.Fatal("Cannot continue without a YES.")
		}
		user, err := core.GetUserByUsername(context.Background(), db, username, nil)
		if err != nil {
			log.Fatal(err)
		}
		if user.IsGhost() {
			user.UnsetToGhost()
		}
		if err := site.LogoutAllSessionsOfUser(user); err != nil {
			log.Fatal(err)
		}
		if purge {
			nobody, err := core.GetUserByUsername(context.Background(), db, core.NobodyUserUsername, nil)
			if err != nil {
				log.Fatal(err)
			}
			if err := user.DeleteContent(context.Background(), db, 0, nobody.ID); err != nil {
				log.Fatal(err)
			}
			log.Println("User content all purged")
		}
		if err := user.Delete(context.Background(), db); err != nil {
			if err == core.ErrUserDeleted {
				log.Printf("%s has been deleted previously\n", user.Username)
				return nil
			}
			log.Fatal(err)
		}
		log.Printf("%s successfully deleted\n", user.Username)
		return nil
	},
}
