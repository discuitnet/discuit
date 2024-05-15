package serve

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/discuitnet/discuit/cli/migrate"
	"github.com/discuitnet/discuit/config"
	"github.com/discuitnet/discuit/core"
	"github.com/discuitnet/discuit/internal/images"
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

			// Set CORS headers.
			origin := r.Header.Get("Origin")
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
			w.Header().Set("Access-Control-Expose-Headers", "Csrf-Token")
			w.Header().Set("Access-Control-Allow-Headers", "x-csrf-token, Content-Type")
			w.Header().Set("Access-Control-Allow-Credentials", "true")

			// Handle preflight requests.
			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
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
