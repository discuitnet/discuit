package main

import (
	"bufio"
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/discuitnet/discuit/config"
	"github.com/discuitnet/discuit/core"
	"github.com/discuitnet/discuit/internal/images"
	"github.com/discuitnet/discuit/internal/uid"
	"github.com/discuitnet/discuit/internal/utils"
	"github.com/discuitnet/discuit/server"
	"github.com/go-sql-driver/mysql"
	"github.com/gomodule/redigo/redis"
	"github.com/urfave/cli/v2"

	gomigrate "github.com/golang-migrate/migrate/v4"
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
		Before: func(c *cli.Context) error {
			// Load config file.
			conf, err := config.Parse("./config.yaml")
			if err != nil {
				log.Fatal("Error parsing config file: ", err)
			}

			// Connect to MariaDB.
			db := openDatabase(conf.DBAddr, conf.DBUser, conf.DBPassword, conf.DBName)

			// Store Config and DB in context.
			c.Context = context.WithValue(c.Context, "config", conf)
			c.Context = context.WithValue(c.Context, "db", db)

			return nil
		},
		Commands: []*cli.Command{
			{
				Name: "migrate",
				Subcommands: []*cli.Command{
					{
						Name: "new",
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
						Action: migrate,
					},
				},
			},
			{
				Name:  "serve",
				Usage: "Start web server",
				Flags: []cli.Flag{
					&cli.StringFlag{
						Name: "image-path",
						Action: func(ctx *cli.Context, printImagePath string) error {
							id, err := uid.FromString(printImagePath)
							if err != nil {
								return fmt.Errorf("%s is not a valid image id: %w", printImagePath, err)
							}
							fmt.Printf("Image path: %s\n", images.ImagePath(id))
							return nil
						},
					},
					&cli.StringFlag{
						Name:  "delete-user",
						Usage: "Delete a user",
					},
				},
				Action: serve,
			},
			{
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
			},
			{
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
			},
			{
				Name:  "hard-reset",
				Usage: "Hard reset",
				Action: func(ctx *cli.Context) error {
					conf := ctx.Context.Value("config").(*config.Config)
					db := ctx.Context.Value("db").(*sql.DB)

					if err := db.Close(); err != nil {
						return err
					}
					if err := hardReset(conf); err != nil {
						return err
					}
					return nil
				},
			},
			{
				Name:  "populate-post",
				Usage: "Populate post with random comments",
				Flags: []cli.Flag{
					&cli.Int64Flag{
						Name:     "num-comments",
						Usage:    "No of comments",
						Value:    100,
						Required: true,
					},
					&cli.StringFlag{
						Name:     "user",
						Usage:    "Username",
						Required: true,
					},
				},
				Action: func(ctx *cli.Context) error {
					db := ctx.Context.Value("db").(*sql.DB)
					post := ctx.Args().First()
					username := ctx.String("user")
					numComments := ctx.Int("num-comments")
					populatePost(db, post, username, numComments, false) // log.Fatals on failure
					return nil
				},
			},
			{
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
					username := ctx.Args().First()
					password := ctx.String("password")

					if ok := cliConfirmCommand("Are you sure?"); !ok {
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
			},
			{
				Name:  "fix-hotness",
				Usage: "Fix hotness of all posts",
				Action: func(ctx *cli.Context) error {
					db := ctx.Context.Value("db").(*sql.DB)
					if err := core.UpdateAllPostsHotness(ctx.Context, db); err != nil {
						return err
					}
					return nil
				},
			},
			{
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
			},
			{
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
			},
		},
		DefaultCommand: "serve",
		After: func(c *cli.Context) error {
			db := c.Context.Value("db").(*sql.DB)
			defer db.Close()
			return nil
		},
	}

	if err := app.Run(os.Args); err != nil {
		log.Fatal(err)
	}
}

// migrationLogger implements the migrate.Logger interface.
type migrationsLogger struct {
	verbose bool
}

func (ml *migrationsLogger) Printf(format string, v ...any) {
	log.Printf(format, v...)
}

func (ml *migrationsLogger) Verbose() bool {
	return ml.verbose
}

// If steps is 0, all migrations are run. Otherwise, steps migrations are run up
// or down depending on steps > 0 or not.
func migrate(ctx *cli.Context) error {
	// c *config.Config, log bool, steps int
	c := ctx.Context.Value("config").(*config.Config)
	log := true
	steps := ctx.Int("steps")

	fmt.Println("Running migrations")
	m, err := gomigrate.New("file://migrations/", "mysql://"+mysqlDSN(c.DBAddr, c.DBUser, c.DBPassword, c.DBName))
	if err != nil {
		return err
	}
	if log {
		m.Log = &migrationsLogger{verbose: false}
	}

	if steps == 0 {
		err = m.Up()
	} else {
		err = m.Steps(steps)
	}
	if err != nil && err != gomigrate.ErrNoChange {
		return err
	}

	_, err = m.Close()
	return err
}

// serve starts the web server.
func serve(ctx *cli.Context) error {
	db := ctx.Context.Value("db").(*sql.DB)
	conf := ctx.Context.Value("config").(*config.Config)

	if err := createGhostUser(db); err != nil {
		os.Exit(-1)
	}

	// Set images folder.
	p := "images"
	if conf.ImagesFolderPath != "" {
		p = conf.ImagesFolderPath
	}
	p, err := filepath.Abs(p)
	if err != nil {
		log.Fatalf("Error attempting to set the images folder location (%s): %v", p, err)
	}
	log.Printf("Images folder: %s\n", p)
	images.SetImagesRootFolder(p)

	// Create default badges.
	if err := core.NewBadgeType(db, "supporter"); err != nil {
		log.Fatalf("Error creating 'supporter' user badge: %v\n", err)
	}

	site, err := server.New(db, conf)
	if err != nil {
		log.Fatal("Error creating server: ", err)
	}
	defer site.Close()

	if ctx.String("delete-user") != "" {
		if ok := cliYesConfirmCommand(); !ok {
			log.Fatal("Cannot continue without a YES.")
		}
		user, err := core.GetUserByUsername(context.Background(), db, ctx.String("delete-user"), nil)
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
	}

	go func() {
		// This go-routine runs a set of periodic functions every hour.
		time.Sleep(time.Second * 5) // Just so the first console output isn't from this goroutine.
		for {
			if err := core.PurgePostsFromTempTables(context.TODO(), db); err != nil {
				log.Printf("Temp posts purging failed: %v\n", err)
			}
			if n, err := core.RemoveTempImages(context.TODO(), db); err != nil {
				log.Printf("Failed to remove temp images: %v\n", err)
			} else {
				log.Printf("Removed %d temp images\n", n)
			}
			time.Sleep(time.Hour)
		}
	}()

	var https bool = conf.CertFile != ""

	server := &http.Server{
		Addr: conf.Addr,
		Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// If the domain name contains www. redirect to one without.
			host := r.Host
			if strings.HasPrefix(host, "www.") {
				url := *r.URL
				url.Host = host[4:]
				if https {
					url.Scheme = "https"
				} else {
					url.Scheme = "http"
				}
				http.Redirect(w, r, url.String(), http.StatusMovedPermanently)
				return
			}
			site.ServeHTTP(w, r)
		}),
	}

	log.Println("Starting server on " + conf.Addr)

	if https {
		// Running HTTPS server.
		//
		// A server to redirect traffic from HTTP to HTTPS. Started only if the
		// main server is on port 443.
		if conf.Addr[strings.Index(conf.Addr, ":"):] == ":443" {
			redirectServer := &http.Server{
				Addr: ":80",
				Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					url := *r.URL
					url.Scheme = "https"
					url.Host = r.Host
					http.Redirect(w, r, url.String(), http.StatusMovedPermanently)
				}),
			}
			go func() {
				if err = redirectServer.ListenAndServe(); err != nil {
					log.Fatal("Error starting redirect server: ", err)
				}
			}()
		}
		if err := server.ListenAndServeTLS(conf.CertFile, conf.KeyFile); err != nil {
			log.Fatal("Error starting server (TLS): ", err)
		}
	} else {
		// Running HTTP server.
		if err := server.ListenAndServe(); err != nil {
			log.Fatal("Error starting server: ", err)
		}
	}
	return nil
}

// mysqlDSN returns a DSN that could be used to connect to a MySQL database. You
// may want to append mysql:// to the beginning of the returned string.
func mysqlDSN(addr, user, password, dbName string) string {
	cfg := mysql.NewConfig()
	cfg.Net = "tcp"
	cfg.Addr = addr
	cfg.User = user
	cfg.Passwd = password
	cfg.DBName = dbName
	cfg.ParseTime = true
	return cfg.FormatDSN()
}

// openDatabase returns a connection to mysql.
func openDatabase(addr, user, password, dbName string) *sql.DB {
	if dbName == "" {
		log.Fatal("No database selected")
	}

	db, err := sql.Open("mysql", mysqlDSN(addr, user, password, dbName))
	if err != nil {
		log.Fatal(err)
	}

	if err = db.Ping(); err != nil {
		log.Fatal(err)
	}
	return db
}

// populatePost adds n comments to post with public ID id.
func populatePost(db *sql.DB, id, username string, n int, onlyTopLevel bool) {
	ctx := context.Background()
	post, err := core.GetPost(ctx, db, nil, id, nil, true)
	if err != nil {
		log.Fatal(err)
	}

	user, err := core.GetUserByUsername(ctx, db, username, nil)
	if err != nil {
		log.Fatal(err)
	}

	selectComment := func() *core.Comment {
		var id uid.ID
		row := db.QueryRow("select id from comments where deleted_at is null and post_id = ? order by RAND() limit 1", post.ID)
		if err := row.Scan(&id); err != nil {
			return nil
		}
		c, err := core.GetComment(ctx, db, id, nil)
		if err != nil {
			log.Fatal(err)
		}
		log.Println("Parent chosen")
		return c
	}

	for i := 0; i < n; i++ {
		var parent *uid.ID = new(uid.ID)
		if !onlyTopLevel && i%2 == 0 {
			c := selectComment()
			if c != nil {
				*parent = c.ID
			}
		}
		text := utils.GenerateText()
		nc, err := post.AddComment(ctx, user.ID, core.UserGroupNormal, parent, text)
		if err != nil {
			log.Fatal(err)
		}
		if _, err = db.Exec("update comments set points = ? where id = ?", rand.Int()%100, nc.ID); err != nil {
			log.Fatal(err)
		}
	}
}

// cliConfirmcommand shows a [y/N] confirm prompt and returns true if the user
// enters y.
func cliConfirmCommand(message string) bool {
	r := bufio.NewReader(os.Stdin)
	fmt.Printf("%s [y/N]: ", message)
	if s, err := r.ReadString('\n'); err != nil {
		return false
	} else if strings.ToLower(strings.TrimSpace(s)) != "y" {
		return false
	}
	return true
}

// cliYesConfirmCommand shows type YES to continue prompt and returns true if the
// user types YES in capital letters.
func cliYesConfirmCommand() bool {
	r := bufio.NewReader(os.Stdin)
	fmt.Print("Type YES to continue: ")
	if s, err := r.ReadString('\n'); err != nil {
		return false
	} else if strings.TrimSpace(s) != "YES" {
		return false
	}
	return true
}

// hardReset deletes and recreates the database and Redis.
func hardReset(c *config.Config) error {
	mysql, err := sql.Open("mysql", c.DBUser+":"+c.DBPassword+"@/?parseTime=true")
	if err != nil {
		return err
	}

	if ok := cliYesConfirmCommand(); !ok {
		return errors.New("cannot continue without YES")
	}

	if _, err = mysql.Exec("drop database if exists " + c.DBName); err != nil {
		return err
	}

	if _, err = mysql.Exec("create database " + c.DBName + " default character set utf8mb4"); err != nil {
		return err
	}

	log.Println("Database (" + c.DBName + ") created")

	if err = mysql.Close(); err != nil {
		return err
	}

	// if err = migrate(c, true, 0); err != nil {
	// 	return err
	// }

	conn, err := redis.Dial("tcp", c.RedisAddress)
	if err != nil {
		return err
	}
	defer conn.Close()

	if _, err = conn.Do("flushall"); err != nil {
		return err
	}

	log.Println("Redis flushed")
	log.Println("Reset complete")
	return nil
}

var (
	errMigrationsTableNotFound = errors.New("migrations table not found")
)

// migrationsVersion returns the last migration number (the value in the
// schema_migrations table). If the migrations table is not found, then
// errMigrationsTableNotFound is returned. If the migrations table is found but
// empty, then sql.ErrNoRows is returned.
func migrationsVersion(db *sql.DB) (int, error) {
	if exists, err := mariadbTableExists(db, "schema_migrations"); err != nil {
		return -1, err
	} else if !exists {
		return -1, errMigrationsTableNotFound
	}
	version := -1
	if err := db.QueryRow("SELECT version FROM schema_migrations").Scan(&version); err != nil {
		return -1, err
	}
	return version, nil
}

func mariadbTableExists(db *sql.DB, name string) (bool, error) {
	var gotname string
	if err := db.QueryRow(fmt.Sprintf("SHOW TABLES LIKE '%v'", name)).Scan(&gotname); err != nil {
		if err == sql.ErrNoRows {
			return false, nil
		}
		return false, err
	}
	if gotname == name {
		return true, nil
	}
	return false, fmt.Errorf("gotname (%v) is not the same as name (%v)", gotname, name)
}

// createGhostUser creates the ghost user only if migrations have been run. If
// migrations have not yet been run, the function exists silently without
// returning an error
func createGhostUser(db *sql.DB) error {
	if _, err := migrationsVersion(db); err != nil {
		if err == errMigrationsTableNotFound || err == sql.ErrNoRows {
			log.Println("Skipping creating ghost user, as migrations are not yet run.")
			return nil
		}
		log.Printf("Error creating the ghost user: %v\n", err)
		return err
	}

	created, err := core.CreateGhostUser(db)
	if err != nil {
		log.Printf("Error creating the ghost user: %v\n", err)
		return err
	}
	if created {
		log.Println("Ghost user succesfully created.")
	}
	return nil
}
