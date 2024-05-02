package migrate

import (
	"bufio"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"os"
	"sort"
	"strconv"
	"strings"

	"github.com/discuitnet/discuit/config"
	"github.com/go-sql-driver/mysql"
	gomigrate "github.com/golang-migrate/migrate/v4"
	"github.com/urfave/cli/v2"
)

var (
	ErrMigrationsTableNotFound = errors.New("migrations table not found")
)

var Command = &cli.Command{
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
	m, err := gomigrate.New("file://migrations/", "mysql://"+MysqlDSN(c.DBAddr, c.DBUser, c.DBPassword, c.DBName))
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

// Version returns the last migration number (the value in the
// schema_migrations table). If the migrations table is not found, then
// errMigrationsTableNotFound is returned. If the migrations table is found but
// empty, then sql.ErrNoRows is returned.
func Version(db *sql.DB) (int, error) {
	if exists, err := mariadbTableExists(db, "schema_migrations"); err != nil {
		return -1, err
	} else if !exists {
		return -1, ErrMigrationsTableNotFound
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
