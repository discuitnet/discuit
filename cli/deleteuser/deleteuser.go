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
	},
	Action: func(ctx *cli.Context) error {
		db := ctx.Context.Value("db").(*sql.DB)
		conf := ctx.Context.Value("config").(*config.Config)
		username := ctx.String("user")

		site, err := server.New(db, conf, nil)
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
		if err := site.LogoutAllSessionsOfUser(user); err != nil {
			log.Fatal(err)
		}
		if err := user.Delete(context.Background()); err != nil {
			log.Fatal(err)
		}
		log.Printf("%s successfully deleted\n", user.Username)
		return nil
	},
}
