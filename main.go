package main

import (
	"bufio"
	"context"
	"database/sql"
	"errors"
	"flag"
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

	gomigrate "github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/mysql"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

func main() {
	// Load config file.
	conf, err := config.Parse("./config.yaml")
	if err != nil {
		log.Fatal("Error parsing config file: ", err)
	}

	// Connect to MariaDB.
	db := openDatabase(conf.DBAddr, conf.DBUser, conf.DBPassword, conf.DBName)
	defer db.Close()

	if err := core.CreateGhostUser(db); err != nil {
		log.Fatal("Error creating the ghost user: ", err)
	}

	// Parse flags.
	runServer, err := parseFlags(db, conf)
	if err != nil {
		log.Fatal("Error parsing flags: ", err)
	}

	if !runServer {
		log.Println("No function specified.")
		return
	}

	// Set images folder.
	p := "images"
	if conf.ImagesFolderPath != "" {
		p = conf.ImagesFolderPath
	}
	if p, err = filepath.Abs(p); err != nil {
		log.Fatalf("Error attempting to set the images folder location (%s): %v", p, err)
	}
	images.SetImagesRootFolder(p)

	// Create default badges.
	if err = core.NewBadgeType(db, "supporter"); err != nil {
		log.Fatalf("Error creating 'supporter' user badge: %v\n", err)
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

	site, err := server.New(db, conf)
	if err != nil {
		log.Fatal("Error creating server: ", err)
	}
	defer site.Close()

	server := &http.Server{
		Addr: conf.Addr,
		Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// If the domain name contains www. redirect to one without.
			host := r.Host
			if strings.HasPrefix(host, "www.") {
				url := *r.URL
				url.Host = host[4:]
				http.Redirect(w, r, url.String(), http.StatusMovedPermanently)
				return
			}
			site.ServeHTTP(w, r)
		}),
	}

	log.Println("Starting server on " + conf.Addr)

	if conf.CertFile != "" {
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
func migrate(c *config.Config, log bool, steps int) error {
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

// parseFlags returns whether to run the server and any error encountered.
func parseFlags(db *sql.DB, c *config.Config) (bool, error) {
	runMigrations := flag.Bool("migrate", false, "Run DB migrations")
	steps := flag.Int("steps", 0, "Migrations steps to run (0 runs all migrations)")
	runServer := flag.Bool("serve", false, "Start web server")
	makeAdmin := flag.String("make-admin", "", "Make user an admin")
	removeAdmin := flag.String("remove-admin", "", "Remove user as admin")
	makeMod := flag.String("make-mod", "", "Make user a moderator")        // Uses -community flag
	removeMod := flag.String("remove-mod", "", "Remove user as moderator") // Uses -community flag
	community := flag.String("community", "", "Community name")            // Helper flag
	username := flag.String("user", "", "Username")                        // Helper flag
	noComments := flag.Int("no-comments", 100, "No of comments")           // Helper flag for -populate-post
	doHardReset := flag.Bool("hard-reset", false, "Hard reset")
	runForcePassChange := flag.String("force-pass-change", "", "Change user password") // Uses -user flag
	password := flag.String("password", "", "Password")                                // Helper flag for -force-pass-change

	showImagePath := flag.String("image-path", "", "Show where an image is stored on disk.")

	runPopulatePost := flag.String("populate-post", "", "Populate post with random comments") // Populate post with random comments

	runFixHotness := flag.Bool("fix-hotness", false, "Fix hotness of all posts")
	addAllUsersToCommunity := flag.String("add-all-users-to-community", "", "Add all users to community") // Uses -community flag

	newBadge := flag.String("new-badge", "", "New user badge")

	flag.Parse()
	serve := *runServer

	ctx := context.Background()

	if *runFixHotness {
		if err := core.UpdateAllPostsHotness(ctx, db); err != nil {
			log.Fatal(err)
		}
		return false, nil
	}

	if *doHardReset {
		if err := db.Close(); err != nil {
			return false, err
		}
		if err := hardReset(c); err != nil {
			log.Println("Failed hard reset: ", err)
			return false, err
		}
		return false, nil
	}

	if *runMigrations {
		if err := migrate(c, true, *steps); err != nil {
			return false, err
		}
		log.Println("Migrations ran successfully.")
	}

	// New-migration command:
	if func() bool {
		for _, arg := range os.Args[1:] {
			if arg == "new-migration" {
				return true
			}
		}
		return false
	}() {
		folder, err := os.Open("./migrations/")
		if err != nil {
			return false, err
		}
		files, err := folder.Readdirnames(0)
		if err != nil {
			return false, err
		}
		sort.Strings(files)

		last := files[len(files)-1]
		n := strings.Index(last, "_")
		if n < 0 {
			return false, errors.New("no underscore found in last filename")
		}
		lastVersion, err := strconv.Atoi(last[0:n])
		if err != nil {
			return false, err
		}

		scanner := bufio.NewScanner(os.Stdin)
		fmt.Print("New migration name: ")
		scanner.Scan()
		name := strings.TrimSpace(scanner.Text())
		if name == "" {
			return false, errors.New("migration name cannot be empty")
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
				return false, err
			}
			if err := file.Close(); err != nil {
				return false, err
			}
		}
		return false, nil
	}

	if *makeAdmin != "" {
		user, err := core.MakeAdmin(ctx, db, *makeAdmin, true)
		if err != nil {
			log.Println("Failed making user admin: ", err)
			return false, err
		}
		log.Println("User " + user.Username + " is now an admin")
		return false, nil
	}

	if *removeAdmin != "" {
		user, err := core.MakeAdmin(ctx, db, *removeAdmin, false)
		if err != nil {
			log.Println("Failed removing admin: ", err)
			return false, err
		}
		log.Println("User " + user.Username + " is no longer an admin")
		return false, nil
	}

	if *makeMod != "" || *removeMod != "" {
		c, err := core.GetCommunityByName(ctx, db, *community, nil)
		if err != nil {
			return false, err
		}
		if *makeMod != "" {
			user, err := core.GetUserByUsername(ctx, db, *makeMod, nil)
			if err != nil {
				return false, err
			}
			if err = core.MakeUserModCLI(db, c, user.ID, true); err != nil {
				return false, err
			}
			log.Println(user.Username + " is now a moderator of " + c.Name)
		}
		if *removeMod != "" {
			user, err := core.GetUserByUsername(ctx, db, *removeMod, nil)
			if err != nil {
				return false, err
			}
			if err = core.MakeUserModCLI(db, c, user.ID, false); err != nil {
				return false, err
			}
			log.Println(user.Username + " is no longer a moderator of " + c.Name)
		}
		return false, nil
	}

	if *runPopulatePost != "" {
		populatePost(db, *runPopulatePost, *username, *noComments, false)
		return false, nil
	}

	if *runForcePassChange != "" {
		user, err := core.GetUserByUsername(ctx, db, *runForcePassChange, nil)
		if err != nil {
			return false, err
		}
		pass, err := core.HashPassword([]byte(*password))
		if err != nil {
			return false, err
		}
		if _, err = db.Exec("update users set password = ? where id = ?", pass, user.ID); err != nil {
			return false, err
		}
		log.Println("Password changed successfully")
		return false, nil
	}

	if *addAllUsersToCommunity != "" {
		if err := core.AddAllUsersToCommunity(ctx, db, *addAllUsersToCommunity); err != nil {
			log.Fatal(err)
		}
		log.Println("All users added to community ", *addAllUsersToCommunity)
		return false, nil
	}

	if *showImagePath != "" {
		id, err := uid.FromString(*showImagePath)
		if err != nil {
			fmt.Printf("%s is not a valid image id\n", *showImagePath)
			return false, nil
		}
		fmt.Printf("Image path: %s\n", images.ImagePath(id))
		return false, nil
	}

	if *newBadge != "" {
		if err := core.NewBadgeType(db, *newBadge); err != nil {
			log.Fatal("error creating new badge: ", err)
		}
	}

	return serve, nil
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

// hardReset deletes and recreates the database and Redis.
func hardReset(c *config.Config) error {
	mysql, err := sql.Open("mysql", c.DBUser+":"+c.DBPassword+"@/?parseTime=true")
	if err != nil {
		return err
	}

	r := bufio.NewReader(os.Stdin)
	fmt.Print("Type YES to continue: ")
	if s, err := r.ReadString('\n'); err != nil {
		return err
	} else if strings.TrimSpace(s) != "YES" {
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

	if err = migrate(c, true, 0); err != nil {
		return err
	}

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
