package main

import (
	"log"
	"os"

	discuitCLI "github.com/discuitnet/discuit/cli"
	"github.com/discuitnet/discuit/cli/addalluserstocommunity"
	"github.com/discuitnet/discuit/cli/admin"
	"github.com/discuitnet/discuit/cli/fixhotness"
	"github.com/discuitnet/discuit/cli/forcepasschange"
	"github.com/discuitnet/discuit/cli/hardreset"
	"github.com/discuitnet/discuit/cli/migrate"
	"github.com/discuitnet/discuit/cli/mod"
	"github.com/discuitnet/discuit/cli/newbadge"
	"github.com/discuitnet/discuit/cli/populatepost"
	"github.com/discuitnet/discuit/cli/serve"
	"github.com/urfave/cli/v2"

	_ "github.com/golang-migrate/migrate/v4/database/mysql"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

func main() {
	app := &cli.App{
		Name:                 "discuit",
		Usage:                "A free and open-source community discussion platform.",
		Description:          "A free and open-source community discussion platform.",
		EnableBashCompletion: true,
		Suggest:              true,
		Before:               discuitCLI.Before,
		Commands: []*cli.Command{
			migrate.Command,
			serve.Command,
			admin.Command,
			mod.Command,
			hardreset.Command,
			populatepost.Command,
			forcepasschange.Command,
			fixhotness.Command,
			addalluserstocommunity.Command,
			newbadge.Command,
		},
		DefaultCommand: "serve",
		After:          discuitCLI.After,
	}

	if err := app.Run(os.Args); err != nil {
		log.Fatal(err)
	}
}
