package cli

import (
	"bufio"
	"errors"
	"fmt"
	"log"
	"os"
	"sort"
	"strconv"
	"strings"

	"github.com/discuitnet/discuit/internal/images"
	"github.com/discuitnet/discuit/internal/uid"
	"github.com/discuitnet/discuit/program"
	"github.com/urfave/cli/v2"
	"gopkg.in/yaml.v2"

	_ "github.com/golang-migrate/migrate/v4/database/mysql"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

func RunCLI() {
	app := &cli.App{
		Name:                 "discuit",
		Usage:                "A free and open-source community discussion platform.",
		Description:          "A free and open-source community discussion platform.",
		EnableBashCompletion: true,
		Suggest:              true,
		Commands: []*cli.Command{
			CommandMigrate,
			CommandServe,
			CommandAdmin,
			CommandMod,
			CommandHardReset,
			CommandForcePassChange,
			CommandFixHotness,
			CommandAddAllUsersToCommunity,
			CommandDeleteUnusedCommunities,
			CommandNewBadge,
			CommandDeleteUser,
			CommandInjectConfig,
			CommandImagePath,
		},
	}

	if err := app.Run(os.Args); err != nil {
		log.Fatal(err)
	}
}

// ConfirmCommand shows a [y/N] confirm prompt and returns true if the user
// enters y.
func ConfirmCommand(message string) bool {
	r := bufio.NewReader(os.Stdin)
	fmt.Printf("%s [y/N]: ", message)
	if s, err := r.ReadString('\n'); err != nil {
		return false
	} else if strings.ToLower(strings.TrimSpace(s)) != "y" {
		return false
	}
	return true
}

// YesConfirmCommand shows type YES to continue prompt and returns true if the
// user types YES in capital letters.
func YesConfirmCommand() bool {
	r := bufio.NewReader(os.Stdin)
	fmt.Print("Type YES to continue: ")
	if s, err := r.ReadString('\n'); err != nil {
		return false
	} else if strings.TrimSpace(s) != "YES" {
		return false
	}
	return true
}

var CommandServe = &cli.Command{
	Name:  "serve",
	Usage: "Start web server",
	Action: func(ctx *cli.Context) error {
		pg, err := program.NewProgram(true)
		if err != nil {
			return err
		}
		defer pg.Close()
		return pg.Serve()
	},
}

var CommandNewBadge = &cli.Command{
	Name:  "new-badge",
	Usage: "New user badge",
	Action: func(ctx *cli.Context) error {
		pg, err := program.NewProgram(true)
		if err != nil {
			return err
		}
		defer pg.Close()
		return pg.NewBadgeType(ctx.Args().First())
	},
}

var CommandMod = &cli.Command{
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
				&cli.StringFlag{
					Name:     "user",
					Usage:    "Username",
					Required: true,
				},
			},
			Action: func(ctx *cli.Context) error {
				return makeUserMod(ctx, true)
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
				&cli.StringFlag{
					Name:     "user",
					Usage:    "Username",
					Required: true,
				},
			},
			Action: func(ctx *cli.Context) error {
				return makeUserMod(ctx, false)
			},
		},
	},
}

func makeUserMod(ctx *cli.Context, isMod bool) error {
	pg, err := program.NewProgram(true)
	if err != nil {
		return err
	}
	defer pg.Close()

	community := ctx.String("community")
	user := ctx.String("user")
	if err := pg.MakeUserMod(community, user, isMod); err != nil {
		return err
	}

	if isMod {
		log.Printf("%s is now a moderator of %s\n", user, community)
	} else {
		log.Printf("%s is no longer a moderator of %s\n", user, community)
	}
	return nil
}

var CommandInjectConfig = &cli.Command{
	Name:  "inject-config",
	Usage: "Outputs yaml with injected config",
	Action: func(ctx *cli.Context) error {
		pg, err := program.NewProgram(false)
		if err != nil {
			return err
		}
		defer pg.Close()

		yamlData, err := yaml.Marshal(pg.Config())
		if err != nil {
			return fmt.Errorf("failed to marshal yaml: %w", err)
		}

		fmt.Println(string(yamlData))
		return nil
	},
}

var CommandHardReset = &cli.Command{
	Name:  "hard-reset",
	Usage: "Hard reset",
	Action: func(ctx *cli.Context) error {
		pg, err := program.NewProgram(true)
		if err != nil {
			return err
		}
		defer pg.Close()

		if ok := YesConfirmCommand(); !ok {
			return errors.New("cannot continue without YES")
		}

		return pg.HardReset()
	},
}

var CommandForcePassChange = &cli.Command{
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
		pg, err := program.NewProgram(true)
		if err != nil {
			return err
		}
		defer pg.Close()

		if ok := ConfirmCommand("Are you sure?"); !ok {
			return errors.New("admin's not sure about the password change")
		}

		return pg.ChangeUserPassword(ctx.String("user"), ctx.String("password"))
	},
}

var CommandFixHotness = &cli.Command{
	Name:  "fix-hotness",
	Usage: "Fix hotness of all posts",
	Action: func(ctx *cli.Context) error {
		pg, err := program.NewProgram(true)
		if err != nil {
			return err
		}
		defer pg.Close()
		return pg.FixPostHotScores()
	},
}

var CommandDeleteUser = &cli.Command{
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
		pg, err := program.NewProgram(true)
		if err != nil {
			return err
		}
		defer pg.Close()

		if ok := YesConfirmCommand(); !ok {
			log.Fatal("Cannot continue without a YES.")
		}

		return pg.DeleteUser(ctx.String("user"), ctx.Bool("purge"))
	},
}

const defaultDays = 30

var CommandDeleteUnusedCommunities = &cli.Command{
	Name:  "delete-unused-communities",
	Usage: "Delete all communities with 0 posts older than (by default) " + strconv.Itoa(defaultDays) + " days",
	Flags: []cli.Flag{
		&cli.IntFlag{
			Name:  "days",
			Usage: "Only deletes communities older than this many days",
			Value: defaultDays,
		},
		&cli.BoolFlag{
			Name:  "dry-run",
			Usage: "Run the command without actually deleting any communities",
			Value: false,
		},
	},
	Action: func(ctx *cli.Context) error {
		days := uint(ctx.Int("days"))
		dryRun := ctx.Bool("dry-run")

		pg, err := program.NewProgram(true)
		if err != nil {
			return err
		}
		defer pg.Close()

		dryText := ""
		if dryRun {
			dryText = " (dry run)"
		}
		log.Printf("Deleting unused communities older than %d days...%s\n", days, dryText)

		return pg.DeleteUnusedCommunities(days, dryRun)
	},
}

var CommandAdmin = &cli.Command{
	Name:  "admin",
	Usage: "Admin commands",
	Subcommands: []*cli.Command{
		{
			Name:  "make",
			Usage: "Make user an admin",
			Action: func(ctx *cli.Context) error {
				return makeUserAdmin(ctx, true)
			},
		},
		{
			Name:  "remove",
			Usage: "Remove user as admin",
			Action: func(ctx *cli.Context) error {
				return makeUserAdmin(ctx, false)
			},
		},
	},
}

func makeUserAdmin(ctx *cli.Context, isAdmin bool) error {
	pg, err := program.NewProgram(true)
	if err != nil {
		return err
	}
	defer pg.Close()
	return pg.MakeUserAdmin(ctx.Args().First(), isAdmin)
}

var CommandAddAllUsersToCommunity = &cli.Command{
	Name:  "add-all-users-to-community",
	Usage: "Add all users to community",
	Action: func(ctx *cli.Context) error {
		pg, err := program.NewProgram(true)
		if err != nil {
			return err
		}
		defer pg.Close()
		return pg.AddAllUsersToCommunity(ctx.Args().First())
	},
}

var CommandMigrate = &cli.Command{
	Name:  "migrate",
	Usage: "Run database migrations",
	Subcommands: []*cli.Command{
		{
			Name:  "new",
			Usage: "Create a new pair of migrations files",
			Action: func(ctx *cli.Context) error {
				folder, err := os.Open("./migrations/")
				if err != nil {
					return err
				}
				files, err := folder.Readdirnames(0)
				if err != nil {
					return err
				}
				sort.Strings(files)

				last := files[len(files)-1]
				n := strings.Index(last, "_")
				if n < 0 {
					return errors.New("no underscore found in last filename")
				}
				lastVersion, err := strconv.Atoi(last[0:n])
				if err != nil {
					return err
				}

				scanner := bufio.NewScanner(os.Stdin)
				fmt.Print("New migration name: ")
				scanner.Scan()
				name := strings.TrimSpace(scanner.Text())
				if name == "" {
					return errors.New("migration name cannot be empty")
				}
				newVersion := strconv.Itoa(lastVersion + 1)
				for i := len(newVersion); i < 4; i++ {
					newVersion = "0" + newVersion
				}
				name = newVersion + "_" + strings.ToLower(strings.ReplaceAll(name, " ", "_"))
				newFiles := []string{name + ".down.sql", name + ".up.sql"}
				for _, name := range newFiles {
					file, err := os.Create("./migrations/" + name)
					if err != nil {
						return err
					}
					if err := file.Close(); err != nil {
						return err
					}
				}
				fmt.Print("Created migration!")
				return nil
			},
		},
		{
			Name:  "run",
			Usage: "Run database migrations",
			Flags: []cli.Flag{
				&cli.Int64Flag{
					Name:  "steps",
					Usage: "Migrations steps to run (0 runs all migrations, and value can be negative)",
				},
			},
			Action: func(ctx *cli.Context) error {
				pg, err := program.NewProgram(true)
				if err != nil {
					return err
				}
				defer pg.Close()
				return pg.Migrate(true, ctx.Int("steps"))
			},
		},
		{
			Name:  "status",
			Usage: "Get the current migration status",
			Action: func(ctx *cli.Context) error {
				pg, err := program.NewProgram(true)
				if err != nil {
					return err
				}
				status, err := pg.MigrationsStatus()
				if err != nil {
					return err
				}
				fmt.Printf("version: %d, dirty: %d\n", status.Version, status.Dirty)
				return nil
			},
		},
	},
}

var CommandImagePath = &cli.Command{
	Name:  "image-path",
	Usage: "Show where an image is stored on disk",
	Flags: []cli.Flag{
		&cli.StringFlag{
			Name: "image-path",
		},
	},
	Action: func(ctx *cli.Context) error {
		imageIDStr := ctx.Args().First()
		id, err := uid.FromString(imageIDStr)
		if err != nil {
			return fmt.Errorf("%s is not a valid image id: %w", imageIDStr, err)
		}
		fmt.Printf("Image path: %s\n", images.ImagePath(id))
		return nil
	},
}
