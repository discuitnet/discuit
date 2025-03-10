package core

import (
	"context"
	"crypto/md5"
	"database/sql"
	"encoding/json"
	"time"

	msql "github.com/discuitnet/discuit/internal/sql"
)

// AnalyticsEven represents a record in the analytics table.
type AnalyticsEvent struct {
	ID        int
	Name      string
	UniqueKey []byte
	Payload   string
	CreatedAt time.Time
}

// CreateAnalyticsEvent adds a record to the analytics table. If uniqueKey is
// empty, it is ignored.
func CreateAnalyticsEvent(ctx context.Context, db *sql.DB, name string, uniqueKey string, payload string) error {
	var uniqueKeyHash []byte
	if uniqueKey != "" {
		sum := md5.Sum([]byte(uniqueKey))
		uniqueKeyHash = sum[:]
	}

	query, args := msql.BuildInsertQuery("analytics", []msql.ColumnValue{
		{Name: "event_name", Value: name},
		{Name: "unique_key", Value: uniqueKeyHash},
		{Name: "payload", Value: payload},
	})

	_, err := db.ExecContext(ctx, query, args...)
	if err != nil && !msql.IsErrDuplicateErr(err) {
		return err
	}
	return nil
}

type BasicSiteStats struct {
	Version              int `json:"version"`
	UsersLastDay         int `json:"users_day"` // last 24 hours
	UsersLastWeek        int `json:"users_week"`
	UsersLastMonth       int `json:"users_month"`
	ReturnUsersLastDay   int `json:"return_users_day"` // last 24 hours
	ReturnUsersLastWeek  int `json:"return_users_week"`
	ReturnUsersLastMonth int `json:"return_users_month"`
	TotalSignups         int `json:"signups"`
	PWAInstalls          int `json:"pwa_installs"`
	PushNotifications    int `json:"notifications_enabled"`
	PostsLastDay         int `json:"posts_day"` // last 24 hours
	PostsLastWeek        int `json:"posts_week"`
	CommentsLastDay      int `json:"comments_day"` // last 24 hours
	CommentsLastWeek     int `json:"comments_week"`
}

const BasicSiteStatsEventName = "bss"

func RecordBasicSiteStats(ctx context.Context, db *sql.DB) error {
	stats := &BasicSiteStats{Version: 0}
	if err := db.QueryRow("select count(*) from users where last_seen > subdate(now(), 1)").Scan(&stats.UsersLastDay); err != nil {
		return err
	}
	if err := db.QueryRow("select count(*) from users where last_seen > subdate(now(), 7)").Scan(&stats.UsersLastWeek); err != nil {
		return err
	}
	if err := db.QueryRow("select count(*) from users where last_seen > subdate(now(), 30)").Scan(&stats.UsersLastMonth); err != nil {
		return err
	}
	if err := db.QueryRow("select count(*) from users where last_seen > subdate(now(), 1) and created_at <= subdate(now(), 1)").Scan(&stats.ReturnUsersLastDay); err != nil {
		return err
	}
	if err := db.QueryRow("select count(*) from users where last_seen > subdate(now(), 7) and created_at <= subdate(now(), 7)").Scan(&stats.ReturnUsersLastWeek); err != nil {
		return err
	}
	if err := db.QueryRow("select count(*) from users where last_seen > subdate(now(), 30) and created_at <= subdate(now(), 30)").Scan(&stats.ReturnUsersLastMonth); err != nil {
		return err
	}
	if err := db.QueryRow("select count(*) from users").Scan(&stats.TotalSignups); err != nil {
		return err
	}
	if err := db.QueryRow("select count(*) from analytics").Scan(&stats.PWAInstalls); err != nil {
		return err
	}
	if err := db.QueryRow("select count(*) from web_push_subscriptions").Scan(&stats.PushNotifications); err != nil {
		return err
	}
	if err := db.QueryRow("select count(*) from posts where created_at > subdate(now(), 1)").Scan(&stats.PostsLastDay); err != nil {
		return err
	}
	if err := db.QueryRow("select count(*) from posts where created_at > subdate(now(), 7)").Scan(&stats.PostsLastWeek); err != nil {
		return err
	}
	if err := db.QueryRow("select count(*) from comments where created_at > subdate(now(), 1)").Scan(&stats.CommentsLastDay); err != nil {
		return err
	}
	if err := db.QueryRow("select count(*) from comments where created_at > subdate(now(), 7)").Scan(&stats.CommentsLastWeek); err != nil {
		return err
	}

	b, _ := json.Marshal(stats)
	return CreateAnalyticsEvent(ctx, db, BasicSiteStatsEventName, "", string(b))
}

func GetBasicSiteStats(ctx context.Context, db *sql.DB, days int) ([]*AnalyticsEvent, error) {
	rows, err := db.QueryContext(ctx, "SELECT payload, created_at FROM analytics WHERE event_name = ? ORDER BY created_at DESC", BasicSiteStatsEventName)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []*AnalyticsEvent
	for rows.Next() {
		e := &AnalyticsEvent{}
		if err := rows.Scan(&e.Payload, &e.CreatedAt); err != nil {
			return nil, err
		}
		events = append(events, e)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}
	return events, nil
}
