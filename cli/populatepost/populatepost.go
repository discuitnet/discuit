package populatepost

import (
	"context"
	"database/sql"
	"log"
	"math/rand"

	"github.com/discuitnet/discuit/core"
	"github.com/discuitnet/discuit/internal/uid"
	"github.com/discuitnet/discuit/internal/utils"
	"github.com/urfave/cli/v2"

	_ "github.com/golang-migrate/migrate/v4/database/mysql"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

var Command = &cli.Command{
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
