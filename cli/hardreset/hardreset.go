package hardreset

import (
	"database/sql"
	"errors"
	"log"

	discuitCLI "github.com/discuitnet/discuit/cli"
	"github.com/discuitnet/discuit/config"
	"github.com/gomodule/redigo/redis"
	"github.com/urfave/cli/v2"
)

var Command = &cli.Command{
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
}

// hardReset deletes and recreates the database and Redis.
func hardReset(c *config.Config) error {
	mysql, err := sql.Open("mysql", c.DBUser+":"+c.DBPassword+"@/?parseTime=true")
	if err != nil {
		return err
	}

	if ok := discuitCLI.YesConfirmCommand(); !ok {
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
