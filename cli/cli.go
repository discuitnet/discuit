package cli

import (
	"bufio"
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/discuitnet/discuit/cli/migrate"
	"github.com/discuitnet/discuit/config"
	"github.com/joho/godotenv"
	"github.com/urfave/cli/v2"
)

func Before(c *cli.Context) error {
	// Load environment variables.
	_ = godotenv.Load()

	// Load config file.
	conf, err := config.Parse("./config.yaml")
	if err != nil {
		log.Fatal("Error parsing config file: ", err)
	}

	if os.Args[1] != "inject-config" {
		db := openDatabase(conf.DBAddr, conf.DBUser, conf.DBPassword, conf.DBName)
		c.Context = context.WithValue(c.Context, "db", db)
	}

	c.Context = context.WithValue(c.Context, "config", conf)
	return nil
}

func After(c *cli.Context) error {
	if db, ok := c.Context.Value("db").(*sql.DB); ok {
		db.Close()
	}
	return nil
}

// openDatabase returns a connection to mysql.
func openDatabase(addr, user, password, dbName string) *sql.DB {
	if dbName == "" {
		log.Fatal("No database selected")
	}

	db, err := sql.Open("mysql", migrate.MysqlDSN(addr, user, password, dbName))
	if err != nil {
		log.Fatal(err)
	}

	if err = db.Ping(); err != nil {
		log.Fatal(err)
	}
	return db
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
