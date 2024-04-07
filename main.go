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

	// Connect to MeiliSearch.
	searchClient := core.NewSearchClient(conf.MeiliHost, conf.MeiliKey)

	if err := core.CreateGhostUser(db); err != nil {
		log.Fatal("Error creating the ghost user: ", err)
	}

	flags, err := parseFlags()
	if err != nil {
		log.Fatal("Error parsing falgs: ", err)
	}

	runServer, err := runFlagCommands(db, searchClient, conf, flags)
	if err != nil {
		log.Fatal("Error running flag commands: ", err)
	}

	hasMoreCommandsToRun := flags.deleteUser != "" // commands that require the server.Server object
	if !runServer && !hasMoreCommandsToRun {
		return // Nothing to do
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

	site, err := server.New(db, conf)
	if err != nil {
		log.Fatal("Error creating server: ", err)
	}
	defer site.Close()

	if flags.deleteUser != "" {
		if ok := cliYesConfirmCommand(); !ok {
			log.Fatal("Cannot continue without a YES.")
		}
		user, err := core.GetUserByUsername(context.Background(), db, flags.deleteUser, nil)
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

	if !runServer {
		return // Nothing to do.
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

type flags struct {
	runServer     bool
	runMigrations bool
	steps         int // migrations steps

	hardReset bool

	makeAdmin   string // user to make admin
	removeAdmin string // user to remove as admin

	makeMod   string // user to make a mod of community
	removeMod string // user to remove as mod of community
	community string

	populatePost string // post to populate with generated comments
	numComments  int    // number of comments to populate in post

	forcePassChange string // user to change the password of
	password        string

	username string

	printImagePath string // print the path of image stored on disk

	fixHotness             bool
	addAllUsersToCommunity string
	newBadge               string
	deleteUser             string

	// MeiliSearch flags
	meiliIndexCommunities bool
	meiliResetIndex       string
}

func parseFlags() (*flags, error) {
	f := &flags{}
	flag.BoolVar(&f.runMigrations, "migrate", false, "Run database migrations")
	flag.IntVar(&f.steps, "steps", 0, "Migrations steps to run (0 runs all migrations, and value can be nagative)")
	flag.BoolVar(&f.runServer, "serve", false, "Start web server")

	flag.StringVar(&f.makeAdmin, "make-admin", "", "Make user an admin")
	flag.StringVar(&f.removeAdmin, "remove-admin", "", "Remove user as admin")

	flag.StringVar(&f.makeMod, "make-mod", "", "Make user a moderator")        // Uses -community flag
	flag.StringVar(&f.removeMod, "remove-mod", "", "Remove user as moderator") // Uses -community flag

	flag.StringVar(&f.community, "community", "", "Community name") // Helper flag
	flag.StringVar(&f.username, "user", "", "Username")             // Helper flag

	flag.BoolVar(&f.hardReset, "hard-reset", false, "Hard reset")
	flag.StringVar(&f.forcePassChange, "force-pass-change", "", "Change user password") // Uses -user flag
	flag.StringVar(&f.password, "password", "", "Password")                             // Helper flag for -force-pass-change

	flag.StringVar(&f.printImagePath, "image-path", "", "Show where an image is stored on disk.")

	flag.StringVar(&f.populatePost, "populate-post", "", "Populate post with random comments") // Populate post with random comments
	flag.IntVar(&f.numComments, "num-comments", 100, "No of comments")                         // Helper flag for -populate-post

	flag.BoolVar(&f.fixHotness, "fix-hotness", false, "Fix hotness of all posts")
	flag.StringVar(&f.addAllUsersToCommunity, "add-all-users-to-community", "", "Add all users to community") // Uses -community flag

	flag.StringVar(&f.newBadge, "new-badge", "", "New user badge")
	flag.StringVar(&f.deleteUser, "delete-user", "", "Delete a user.")

	// MeiliSearch flags
	flag.BoolVar(&f.meiliIndexCommunities, "meili-index-communities", false, "Index all communities in MeiliSearch")
	flag.StringVar(&f.meiliResetIndex, "meili-reset-index", "", "Reset MeiliSearch index")

	flag.Parse()
	return f, nil
}

// If returns false, the program should exit immeditately afterwords, even if
// there was no error.
func runFlagCommands(db *sql.DB, searchClient *core.MeiliSearch, conf *config.Config, flags *flags) (bool, error) {
	ctx := context.Background()

	if flags.fixHotness {
		if err := core.UpdateAllPostsHotness(ctx, db); err != nil {
			return false, err
		}
		return false, nil
	}

	if flags.hardReset {
		if err := db.Close(); err != nil {
			return false, err
		}
		if err := hardReset(conf); err != nil {
			return false, fmt.Errorf("failed to hard reset: %w", err)
		}
		return false, nil
	}

	if flags.runMigrations {
		if err := migrate(conf, true, flags.steps); err != nil {
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

	if flags.makeAdmin != "" {
		user, err := core.MakeAdmin(ctx, db, flags.makeAdmin, true)
		if err != nil {
			return false, fmt.Errorf("failed to make %s an admin: %w", flags.makeAdmin, err)
		}
		log.Printf("User %s is now an admin\n", user.Username)
		return false, nil
	}

	if flags.removeAdmin != "" {
		user, err := core.MakeAdmin(ctx, db, flags.removeAdmin, false)
		if err != nil {
			return false, fmt.Errorf("failed to remove %s as an admin: %w", flags.removeAdmin, err)
		}
		log.Printf("User %s is no longer an admin", user.Username)
		return false, nil
	}

	if flags.makeMod != "" || flags.removeMod != "" {
		community, err := core.GetCommunityByName(ctx, db, flags.community, nil)
		if err != nil {
			return false, err
		}
		if flags.makeMod != "" {
			user, err := core.GetUserByUsername(ctx, db, flags.makeMod, nil)
			if err != nil {
				return false, err
			}
			if err = core.MakeUserModCLI(db, community, user.ID, true); err != nil {
				return false, err
			}
			log.Printf("%s is now a moderator of %s\n", user.Username, community.Name)
		}
		if flags.removeMod != "" {
			user, err := core.GetUserByUsername(ctx, db, flags.removeMod, nil)
			if err != nil {
				return false, err
			}
			if err = core.MakeUserModCLI(db, community, user.ID, false); err != nil {
				return false, err
			}
			log.Printf("%s is no longer a moderator of %s\n", user.Username, community.Name)
		}
		return false, nil
	}

	if flags.populatePost != "" {
		populatePost(db, flags.populatePost, flags.username, flags.numComments, false) // log.Fatals on failure
		return true, nil
	}

	if flags.forcePassChange != "" {
		if ok := cliConfirmCommand("Are you sure?"); !ok {
			return false, errors.New("admin's not sure about the password change")
		}
		user, err := core.GetUserByUsername(ctx, db, flags.forcePassChange, nil)
		if err != nil {
			return false, err
		}
		if user.Deleted {
			return false, fmt.Errorf("cannot change deleted user's password")
		}
		pass, err := core.HashPassword([]byte(flags.password))
		if err != nil {
			return false, err
		}
		if _, err = db.Exec("UPDATE users SET password = ? WHERE id = ?", pass, user.ID); err != nil {
			return false, err
		}
		log.Println("Password changed successfully")
		return false, nil
	}

	if flags.addAllUsersToCommunity != "" {
		if err := core.AddAllUsersToCommunity(ctx, db, flags.addAllUsersToCommunity); err != nil {
			return false, fmt.Errorf("failed to add all users to %s: %w", flags.addAllUsersToCommunity, err)
		}
		log.Printf("All users added to %s\n", flags.addAllUsersToCommunity)
		return false, nil
	}

	if flags.printImagePath != "" {
		id, err := uid.FromString(flags.printImagePath)
		if err != nil {
			return false, fmt.Errorf("%s is not a valid image id: %w", flags.printImagePath, err)
		}
		fmt.Printf("Image path: %s\n", images.ImagePath(id))
		return false, nil
	}

	if flags.newBadge != "" {
		if err := core.NewBadgeType(db, flags.newBadge); err != nil {
			return false, fmt.Errorf("failed to create a new badge: %w", err)
		}
		return false, nil
	}

	if flags.meiliIndexCommunities {
		if err := searchClient.IndexAllCommunitiesInMeiliSearch(ctx, db); err != nil {
			return false, fmt.Errorf("failed to index all communities in MeiliSearch: %w", err)
		}
		log.Printf("All communities indexed in MeiliSearch\n")
		return false, nil
	}

	if flags.meiliResetIndex != "" {
		if err := searchClient.ResetIndex(ctx, flags.meiliResetIndex); err != nil {
			return false, fmt.Errorf("failed to reset MeiliSearch index: %w", err)
		}
		log.Printf("MeiliSearch index %s reset\n", flags.meiliResetIndex)
		return false, nil
	}

	return true, nil
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
