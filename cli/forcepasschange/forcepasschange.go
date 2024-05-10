package forcepasschange

import (
	"database/sql"
	"errors"
	"fmt"
	"log"

	discuitCLI "github.com/discuitnet/discuit/cli"
	"github.com/discuitnet/discuit/core"
	"github.com/urfave/cli/v2"
)

var Command = &cli.Command{
	Name:  "force-pass-change",
	Usage: "Change user password",
	Flags: []cli.Flag{
		&cli.StringFlag{
			Name:     "user",
			Usage:    "Username",
			Required: true,
		},
		&cli.StringFlag{
			Name:     "password",
			Usage:    "Password",
			Required: true,
		},
	},
	Action: func(ctx *cli.Context) error {
		db := ctx.Context.Value("db").(*sql.DB)
		username := ctx.String("user")
		password := ctx.String("password")

		if ok := discuitCLI.ConfirmCommand("Are you sure?"); !ok {
			return errors.New("admin's not sure about the password change")
		}
		user, err := core.GetUserByUsername(ctx.Context, db, username, nil)
		if err != nil {
			return err
		}
		if user.Deleted {
			return fmt.Errorf("cannot change deleted user's password")
		}
		pass, err := core.HashPassword([]byte(password))
		if err != nil {
			return err
		}
		if _, err = db.Exec("UPDATE users SET password = ? WHERE id = ?", pass, user.ID); err != nil {
			return err
		}
		log.Println("Password changed successfully")
		return nil
	},
}
