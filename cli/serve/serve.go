package serve

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
	"strings"
	"time"

	"github.com/discuitnet/discuit/cli/migrate"
	"github.com/discuitnet/discuit/config"
	"github.com/discuitnet/discuit/core"
	"github.com/discuitnet/discuit/internal/images"
	"github.com/discuitnet/discuit/internal/taskrunner"
	"github.com/discuitnet/discuit/internal/uid"
	"github.com/discuitnet/discuit/server"
	"github.com/urfave/cli/v2"
)

var Command = &cli.Command{
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
	},
	Action: serve,
}

// serve starts the web server.
func serve(ctx *cli.Context) error {
	db := ctx.Context.Value("db").(*sql.DB)
	conf := ctx.Context.Value("config").(*config.Config)

	if err := createGhostUser(db); err != nil {
		os.Exit(1)
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
	images.SetImagesRootFolder(p)

	// Create default badges.
	if err := core.NewBadgeType(db, "supporter"); err != nil {
		log.Fatalf("Error creating 'supporter' user badge: %v\n", err)
	}

	// Define the background tasks to be run.
	tr := taskrunner.New(context.Background())
	tr.New("Purge temp posts", func(ctx context.Context) error {
		return core.PurgePostsFromTempTables(ctx, db)
	}, time.Hour, false)
	tr.New("Delete temp images", func(ctx context.Context) error {
		n, err := core.RemoveTempImages(ctx, db)
		log.Printf("Removed %d temp images\n", n)
		return err
	}, time.Hour, false)
	tr.New("Send welcome notifications", func(ctx context.Context) error {
		n, err := core.SendWelcomeNotifications(ctx, db, conf.WelcomeCommunity, time.Hour*6)
		if n > 0 {
			log.Printf("%d welcome notifications successfully sent\n", n)
		}
		return err
	}, time.Minute, false)

	go func() {
		time.Sleep(time.Second * 2)
		tr.Start()
	}()

	if !config.AddressValid(conf.Addr) {
		log.Fatal("Address needs to be a valid address of the form 'host:port' (host can be empty)")
	}

	site, err := server.New(db, conf)
	if err != nil {
		log.Fatal("Error creating server: ", err)
	}
	defer site.Close()

	var https bool = conf.CertFile != ""

	server := &http.Server{
		Addr: conf.Addr,
		Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if hostname := conf.Hostname(); hostname != "" {
				// Redirect all requests to any subdomains of conf.Addr to
				// conf.Addr (no redirecting is done if the hostname provided in
				// config is empty).
				if _, subdomain := strings.CutSuffix(r.Host, "."+conf.Hostname()); subdomain {
					url := *r.URL
					url.Host = hostname
					if https {
						url.Scheme = "https"
					} else {
						url.Scheme = "http"
					}
					http.Redirect(w, r, url.String(), http.StatusMovedPermanently)
					return
				}
			}
			site.ServeHTTP(w, r)
		}),
	}

	stopCtx, stop := signal.NotifyContext(context.Background(), os.Interrupt, os.Kill) // interrupt context
	defer stop()

	var redirectServer *http.Server

	// Optionally start a server to redirect traffic from HTTP to HTTPS.
	if https && conf.Addr[strings.Index(conf.Addr, ":"):] == ":443" {
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
		log.Println("Starting server on " + conf.Addr)
		if https {
			if err := server.ListenAndServeTLS(conf.CertFile, conf.KeyFile); err != nil && !errors.Is(err, http.ErrServerClosed) {
				log.Printf("ListenAndServeTLS (main) error: %v\n", err)
			}
		} else {
			if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
				log.Printf("ListenAndServe (main) error: %v\n", err)
			}
		}
	}()

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

	// Stop the background tasks.
	if err := tr.Stop(stopCtx); err != nil {
		if errors.Is(err, stopCtx.Err()) {
			log.Println("Forcefully exited (some) of the background tasks")
		} else {
			log.Printf("Background tasks stop error: %v\n", err)
		}
	} else {
		log.Println("Gracefully exited all background tasks")
	}
	return nil
}

// createGhostUser creates the ghost user only if migrations have been run. If
// migrations have not yet been run, the function exists silently without
// returning an error
func createGhostUser(db *sql.DB) error {
	if _, err := migrate.Version(db); err != nil {
		if err == migrate.ErrMigrationsTableNotFound || err == sql.ErrNoRows {
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
