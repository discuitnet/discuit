package core

import (
	"context"
	"crypto/md5"
	"database/sql"
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
