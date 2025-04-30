package program

import (
	"database/sql"
	"errors"
	"fmt"
	"log"

	gomigrate "github.com/golang-migrate/migrate/v4"
)

var (
	ErrMigrationsTableNotFound = errors.New("migrations table not found")
)

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
func (pg *Program) Migrate(log bool, steps int) error {
	fmt.Println("Running migrations")

	m, err := gomigrate.New("file://migrations/", "mysql://"+MysqlDSN(pg.conf.DBAddr, pg.conf.DBUser, pg.conf.DBPassword, pg.conf.DBName))
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

type MigrationsStatus struct {
	Version int `json:"version"`
	Dirty   int `json:"dirty"`
}

// MigrationsStatus returns the status of the current database migrations. If
// the migrations table is not found, ErrMigrationsTableNotFound is returned. If
// the migrations table is found but it's empty, sql.ErrNoRows is returned.
func (pg *Program) MigrationsStatus() (MigrationsStatus, error) {
	s := MigrationsStatus{}

	if exists, err := mariadbTableExists(pg.db, "schema_migrations"); err != nil {
		return s, err
	} else if !exists {
		return s, ErrMigrationsTableNotFound
	}

	if err := pg.db.QueryRow("SELECT version, dirty FROM schema_migrations").Scan(&s.Version, &s.Dirty); err != nil {
		return s, err
	}
	return s, nil
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
