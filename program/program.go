package program

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"slices"
	"strings"
	"time"

	"github.com/discuitnet/discuit/config"
	"github.com/discuitnet/discuit/core"
	"github.com/discuitnet/discuit/internal/images"
	"github.com/discuitnet/discuit/internal/taskrunner"
	"github.com/discuitnet/discuit/internal/uid"
	"github.com/discuitnet/discuit/server"
	"github.com/go-sql-driver/mysql"
	"github.com/gomodule/redigo/redis"
)

type Program struct {
	conf      *config.Config
	db        *sql.DB
	imagesDir string
	ctx       context.Context
	tr        *taskrunner.TaskRunner
}

func NewProgram(openDatabase bool) (*Program, error) {
	var (
		err error
		pg  = new(Program)
	)

	pg.ctx = context.Background()

	pg.conf, err = config.Parse("config.yaml") // in the working directory
	if err != nil {
		return nil, fmt.Errorf("error parsing the config file: %w", err)
	}

	// Set the images directory:
	pg.imagesDir = "images" // in the working directory
	if pg.conf.ImagesFolderPath != "" {
		pg.imagesDir = pg.conf.ImagesFolderPath
	}
	pg.imagesDir, err = filepath.Abs(pg.imagesDir)
	if err != nil {
		return nil, fmt.Errorf("error attempting to set the images folder location (%s): %w", pg.imagesDir, err)
	}
	images.SetImagesRootFolder(pg.imagesDir)

	pg.tr = taskrunner.New(pg.ctx)

	if openDatabase {
		if _, err := pg.OpenDatabase(); err != nil {
			return nil, err
		}
	}

	return pg, nil
}

func (pg *Program) startBackgroundTasks(delay time.Duration) {
	if pg.db == nil {
		panic("pg.db is nil")
	}

	pg.tr.New("Purge temp posts", func(ctx context.Context) error {
		return core.PurgePostsFromTempTables(ctx, pg.db)
	}, time.Hour, false)
	pg.tr.New("Delete temp images", func(ctx context.Context) error {
		n, err := core.RemoveTempImages(ctx, pg.db)
		log.Printf("Removed %d temp images\n", n)
		return err
	}, time.Hour, false)
	pg.tr.New("Send welcome notifications", func(ctx context.Context) error {
		if pg.conf.WelcomeCommunity == "" {
			log.Println("Config.WelcomeCommunity is empty; skipping sending welcome notifications.")
			return nil
		}
		n, err := core.SendWelcomeNotifications(ctx, pg.db, pg.conf.WelcomeCommunity, time.Hour*6)
		if n > 0 {
			log.Printf("%d welcome notifications successfully sent\n", n)
		}
		return err
	}, time.Minute, false)
	pg.tr.New("Send announcement notifications", func(ctx context.Context) error {
		t0 := time.Now()
		if err := core.SendAnnouncementNotifications(ctx, pg.db, uid.ID{}); err != nil {
			return err
		}
		took := time.Since(t0)
		if took > time.Millisecond*100 {
			log.Printf("Took %v to send announcement notifications\n", time.Since(t0))
		}
		return nil
	}, time.Second*10, false)
	pg.tr.New("Record basic site analytics", func(ctx context.Context) error {
		return core.RecordBasicSiteStats(ctx, pg.db)
	}, time.Hour, false)

	go func() {
		time.Sleep(delay)
		pg.tr.Start()
	}()
}

func (pg *Program) stopBackgroundTasks(ctx context.Context) {
	if err := pg.tr.Stop(ctx); err != nil {
		if errors.Is(err, ctx.Err()) {
			log.Println("Forcefully exited (some) of the background tasks")
		} else {
			log.Printf("Background tasks stop error: %v\n", err)
		}
	} else {
		log.Println("Gracefully exited all background tasks")
	}
}

// OpenDatabase opens the database. If it was opened previously, the existing
// sql.DB object is returned.
func (pg *Program) OpenDatabase() (*sql.DB, error) {
	if pg.db != nil {
		return pg.db, nil
	}

	var err error
	if pg.db, err = openDatabase(pg.conf.DBAddr, pg.conf.DBUser, pg.conf.DBPassword, pg.conf.DBName); err != nil {
		return nil, fmt.Errorf("error opening database: %w", err)
	}
	return pg.db, nil
}

func (pg *Program) Serve() error {
	if err := pg.createSentinelUsers(); err != nil {
		return fmt.Errorf("error creating sentinel users: %w", err)
	}

	// Create the default badges:
	if err := core.NewBadgeType(pg.db, "supporter"); err != nil {
		return fmt.Errorf("error creating 'supporter' user badge: %w", err)
	}

	if !config.AddressValid(pg.conf.Addr) {
		return errors.New("address needs to be a valid address of the form 'host:port' (host can be empty)")
	}

	site, err := server.New(pg.db, pg.conf)
	if err != nil {
		return fmt.Errorf("error creating server: %w", err)
	}
	defer site.Close()

	var https bool = pg.conf.CertFile != ""

	server := &http.Server{
		Addr: pg.conf.Addr,
		Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Redirect all www. requests to a non-www. host.
			if withoutWWW, found := strings.CutPrefix(r.Host, "www."); found {
				url := *r.URL
				url.Host = withoutWWW
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

	stopCtx, stop := signal.NotifyContext(context.Background(), os.Interrupt, os.Kill) // interrupt context
	defer stop()

	var redirectServer *http.Server

	// Optionally start a server to redirect traffic from HTTP to HTTPS.
	if https && pg.conf.Addr[strings.Index(pg.conf.Addr, ":"):] == ":443" {
		redirectServer = &http.Server{
			Addr: ":80",
			Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				url := *r.URL
				url.Scheme = "https"
				url.Host = r.Host
				http.Redirect(w, r, url.String(), http.StatusMovedPermanently)
			}),
		}
		go func() {
			log.Println("Starting redirect server (HTTP -> HTTPS) on " + redirectServer.Addr)
			if err := redirectServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
				log.Printf("ListenAndServe (redirect) error: %v\n", err)
			}
		}()
	}

	// Start the server.
	go func() {
		log.Println("Starting server on " + pg.conf.Addr)
		if pg.conf.IsDevelopment {
			log.Println("\033[93;103mStarting server in development mode\033[0m")
		} else {
			if pg.conf.UseHTTPCookies {
				log.Println("\033[93;103mWarning: using unsecure HTTP cookies in production\033[0m")
			}
		}
		if https {
			if err := server.ListenAndServeTLS(pg.conf.CertFile, pg.conf.KeyFile); err != nil && !errors.Is(err, http.ErrServerClosed) {
				log.Printf("ListenAndServeTLS (main) error: %v\n", err)
			}
		} else {
			if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
				log.Printf("ListenAndServe (main) error: %v\n", err)
			}
		}
	}()

	pg.startBackgroundTasks(time.Second)

	// Wait for interrupt signal.
	<-stopCtx.Done()

	log.Println("Shutting down HTTP server...")

	// Send another interrupt to exit immediately.
	stopCtx, stop = signal.NotifyContext(context.Background(), os.Interrupt, os.Kill)
	defer stop()

	if err := server.Shutdown(stopCtx); err != nil {
		if errors.Is(err, stopCtx.Err()) {
			log.Println("Forcefully exited HTTP server")
		} else {
			log.Printf("HTTP server shutdown error: %v\n", err)
		}
	} else {
		log.Println("HTTP Server exited gracefully")
	}
	if redirectServer != nil {
		if err := redirectServer.Shutdown(stopCtx); err != nil {
			if !errors.Is(err, stopCtx.Err()) {
				log.Printf("Redirect server (HTTP -> HTTP) shutdown error: %v\n", err)
			}
		}
	}

	pg.stopBackgroundTasks(stopCtx)
	return nil
}

func (pg *Program) Config() *config.Config {
	var c = new(config.Config)
	*c = *pg.conf
	return c
}

func (pg *Program) Close() error {
	if pg.db != nil {
		return pg.db.Close()
	}
	return nil
}

// openDatabase returns a connection to mysql.
func openDatabase(addr, user, password, dbName string) (*sql.DB, error) {
	if dbName == "" {
		return nil, errors.New("no database selected")
	}

	db, err := sql.Open("mysql", MysqlDSN(addr, user, password, dbName))
	if err != nil {
		return nil, err
	}

	if err = db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping the database: %w", err)
	}

	return db, nil
}

// createSentinelUsers creates the ghost user only if migrations have been run. If
// migrations have not yet been run, the function exists silently without
// returning an error
func (pg *Program) createSentinelUsers() error {
	if _, err := pg.MigrationsVersion(); err != nil {
		if err == ErrMigrationsTableNotFound || err == sql.ErrNoRows {
			log.Println("Skipping creating ghost user, as migrations are not yet run.")
			return nil
		}
		log.Printf("Error creating the ghost user: %v\n", err)
		return err
	}

	// Create the ghost user:
	created, err := core.CreateGhostUser(pg.db)
	if err != nil {
		log.Printf("Error creating the ghost user: %v\n", err)
		return err
	}
	if created {
		log.Println("User @ghost succesfully created.")
	}

	// Create the ghost user:
	created, err = core.CreateNobodyUser(pg.db)
	if err != nil {
		log.Printf("Error creating the nobody user: %v\n", err)
		return err
	}
	if created {
		log.Println("User @nobody succesfully created.")
	}

	return nil
}

// MysqlDSN returns a DSN that could be used to connect to a MySQL database. You
// may want to append mysql:// to the beginning of the returned string.
func MysqlDSN(addr, user, password, dbName string) string {
	cfg := mysql.NewConfig()
	cfg.Net = "tcp"
	cfg.Addr = addr
	cfg.User = user
	cfg.Passwd = password
	cfg.DBName = dbName
	cfg.ParseTime = true
	return cfg.FormatDSN()
}

func (pg *Program) HardReset() error {
	if pg.db != nil {
		if err := pg.db.Close(); err != nil {
			return err
		}
		pg.db = nil
	}

	db, err := sql.Open("mysql", pg.conf.DBUser+":"+pg.conf.DBPassword+"@/?parseTime=true")
	if err != nil {
		return err
	}

	if _, err = db.Exec("drop database if exists " + pg.conf.DBName); err != nil {
		return err
	}

	if _, err = db.Exec("create database " + pg.conf.DBName + " default character set utf8mb4"); err != nil {
		return err
	}

	log.Printf("Database %s destroyed and recreated\n", pg.conf.DBName)

	if err = db.Close(); err != nil {
		return err
	}

	if _, err := pg.OpenDatabase(); err != nil {
		return err
	}

	if err = pg.Migrate(true, 0); err != nil {
		return err
	}

	conn, err := redis.Dial("tcp", pg.conf.RedisAddress)
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

func (pg *Program) NewBadgeType(name string) error {
	if err := core.NewBadgeType(pg.db, name); err != nil {
		return fmt.Errorf("failed to create a new badge: %w", err)
	}
	return nil
}

func (pg *Program) MakeUserMod(community, user string, isMod bool) error {
	thecommunity, err := core.GetCommunityByName(pg.ctx, pg.db, community, nil)
	if err != nil {
		return err
	}

	theuser, err := core.GetUserByUsername(pg.ctx, pg.db, user, nil)
	if err != nil {
		return err
	}

	if err = core.MakeUserModCLI(pg.ctx, pg.db, thecommunity, theuser.ID, isMod); err != nil {
		return err
	}

	return nil
}

func (pg *Program) ChangeUserPassword(user, password string) error {
	theuser, err := core.GetUserByUsername(pg.ctx, pg.db, user, nil)
	if err != nil {
		return err
	}
	if theuser.Deleted {
		return fmt.Errorf("cannot change deleted user's password")
	}

	pass, err := core.HashPassword([]byte(password))
	if err != nil {
		return err
	}
	if _, err = pg.db.Exec("UPDATE users SET password = ? WHERE id = ?", pass, theuser.ID); err != nil {
		return err
	}

	log.Println("Password changed successfully")
	return nil
}

func (pg *Program) FixPostHotScores() error {
	return core.UpdateAllPostsHotness(pg.ctx, pg.db)
}

func (pg *Program) DeleteUser(user string, purge bool) error {
	site, err := server.New(pg.db, pg.conf)
	if err != nil {
		return fmt.Errorf("error creating server: %w", err)
	}
	defer site.Close()

	theuser, err := core.GetUserByUsername(pg.ctx, pg.db, user, nil)
	if err != nil {
		return err
	}

	if theuser.IsGhost() {
		theuser.UnsetToGhost()
	}

	if err := site.LogoutAllSessionsOfUser(theuser); err != nil {
		return err
	}

	if purge {
		nobody, err := core.GetUserByUsername(pg.ctx, pg.db, core.NobodyUserUsername, nil)
		if err != nil {
			return err
		}
		if err := theuser.DeleteContent(pg.ctx, pg.db, 0, nobody.ID); err != nil {
			return err
		}
		log.Println("User content all purged")
	}

	if err := theuser.Delete(pg.ctx, pg.db); err != nil {
		if err == core.ErrUserDeleted {
			log.Printf("%s has been deleted previously\n", theuser.Username)
			return nil
		}
		return err
	}

	log.Printf("%s successfully deleted\n", theuser.Username)

	return nil
}

func (pg *Program) DeleteUnusedCommunities(days uint, dryRun bool) error {
	names, err := core.DeleteUnusedCommunities(pg.ctx, pg.db, days, dryRun)
	if err != nil {
		log.Printf("Failed to delete unused communities older than %d days: %v", days, err)
		return err
	}
	slices.Sort(names)

	if len(names) == 0 {
		log.Println("There are no unused communities to delete.")
	} else {
		var b strings.Builder
		for i, name := range names {
			if i != 0 {
				b.WriteString(", ")
			}
			b.WriteString(name)
		}
		b.WriteString(".")
		log.Printf("Successfully deleted %d unused communities with 0 posts in them: %s", len(names), b.String())
	}

	return nil
}

func (pg *Program) MakeUserAdmin(username string, isAdmin bool) error {
	user, err := core.MakeAdmin(pg.ctx, pg.db, username, isAdmin)
	if err != nil {
		return fmt.Errorf("failed to make %s an admin: %w", username, err)
	}
	if isAdmin {
		log.Printf("User %s is now an admin\n", user.Username)
	} else {
		log.Printf("User %s is no longer an admin", user.Username)
	}
	return nil
}

func (pg *Program) AddAllUsersToCommunity(community string) error {
	if err := core.AddAllUsersToCommunity(pg.ctx, pg.db, community); err != nil {
		return fmt.Errorf("failed to add all users to %s: %w", community, err)
	}
	log.Printf("All users added to %s\n", community)
	return nil
}
