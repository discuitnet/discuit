package sql

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

// ErrDuplicateRow is for when MySQL returns a 1062 error code.
var ErrDuplicateRow = errors.New("1062: Duplicate row")

// NilIfEmptyString returns nil if s is empty.
// Otherwise it returns s.
func NilIfEmptyString(s string) interface{} {
	var i interface{} = s
	if s == "" {
		i = nil
	}
	return i
}

// NullString represents a string that may be null.
// NullString implements the Scanner interface so
// it can be used as a scan destination:
//
// Unlike sql.NullString, NullString marshals into JSON properly (with the JSON
// value being null if Valid is false).
type NullString struct {
	sql.NullString
}

// NewNullString returns a NullString with Valid
// set to true if str is a string.
func NewNullString(str interface{}) NullString {
	var s NullString
	val, ok := str.(string)

	if ok {
		s.Valid = true
		s.String = val
	} else {
		s.Valid = false
	}
	return s
}

// MarshalJSON implements json.Marshalar interface
func (s NullString) MarshalJSON() ([]byte, error) {
	if s.Valid {
		return json.Marshal(s.String)
	}

	return []byte("null"), nil
}

// UnmarshalJSON implements json.Unmarshalar interface
func (s *NullString) UnmarshalJSON(b []byte) error {
	if string(b) == "null" {
		s.Valid = false
		return nil
	}

	if err := json.Unmarshal(b, &s.String); err != nil {
		return err
	}

	s.Valid = true
	return nil
}

// NullTime represents a time.Time that may be null.
// NullTime implements the Scanner interface so
// it can be used as a scan destination, similar to NullString.
//
// Unlike sql.NullTime, NullTime marshals into JSON properly (with the JSON
// value being null if Valid is false).
type NullTime struct {
	sql.NullTime
}

// NewNullTime returns a NullTime with Valid
// set to true if t is a time.Time.
func NewNullTime(t interface{}) NullTime {
	var s NullTime
	x, ok := t.(time.Time)

	if ok {
		s.Valid = true
		s.Time = x
	} else {
		s.Valid = false
	}
	return s
}

// MarshalJSON implements json.Marshalar interface.
func (s NullTime) MarshalJSON() ([]byte, error) {
	if s.Valid {
		return json.Marshal(s.Time)
	}

	return []byte("null"), nil
}

// UnmarshalJSON implements json.Unmarshalar interface.
func (s *NullTime) UnmarshalJSON(b []byte) error {
	if string(b) == "null" {
		s.Valid = false
		return nil
	}

	if err := json.Unmarshal(b, &s.Time); err != nil {
		return err
	}

	s.Valid = true
	return nil
}

// NullInt32 represents an int32 that may be null.
// NullInt32 implements the Scanner interface so
// it can be used as a scan destination, similar to NullString.
//
// Unlike sql.NullInt32, NullInt32 marshals into JSON properly (with the JSON
// value being null if Valid is false).
type NullInt32 struct {
	sql.NullInt32
}

// NewNullInt32 returns a NullInt32 with Valid
// set to true if t is an int.
func NewNullInt32(t interface{}) NullInt32 {
	var s NullInt32
	x, ok := t.(int)

	if ok {
		s.Valid = true
		s.Int32 = int32(x)
	} else {
		s.Valid = false
	}
	return s
}

// MarshalJSON implements json.Marshalar interface.
func (i NullInt32) MarshalJSON() ([]byte, error) {
	if i.Valid {
		return json.Marshal(i.Int32)
	}

	return []byte("null"), nil
}

// UnmarshalJSON implements json.Unmarshalar interface.
func (i *NullInt32) UnmarshalJSON(b []byte) error {
	if string(b) == "null" {
		i.Valid = false
		return nil
	}

	if err := json.Unmarshal(b, &i.Int32); err != nil {
		return err
	}

	i.Valid = true
	return nil
}

// NullFloat64 represents a float64 that may be null.
// NullFloat64 implements the Scanner interface so
// it can be used as a scan destination, similar to NullString.
//
// Unlike sql.NullFloat64, NullFloat64 marshals into JSON properly (with the
// JSON value being null if Valid is false).
type NullFloat64 struct {
	sql.NullFloat64
}

// NewNullFloat64 returns a NullFloat64 with Valid
// set to true if fl is a float64.
func NewNullFloat64(fl interface{}) NullFloat64 {
	var f NullFloat64
	val, ok := fl.(float64)

	if ok {
		f.Valid = true
		f.Float64 = val
	} else {
		f.Valid = false
	}
	return f
}

// MarshalJSON implements json.Marshalar interface.
func (i NullFloat64) MarshalJSON() ([]byte, error) {
	if i.Valid {
		return json.Marshal(i.Float64)
	}

	return []byte("null"), nil
}

// UnmarshalJSON implements json.Unmarshalar interface.
func (i *NullFloat64) UnmarshalJSON(b []byte) error {
	if string(b) == "null" {
		i.Valid = false
		return nil
	}

	if err := json.Unmarshal(b, &i.Float64); err != nil {
		return err
	}

	i.Valid = true
	return nil
}

// NullBool represents a bool that may be null.
// NullBool implements the Scanner interface so
// it can be used as a scan destination, similar to NullString.
//
// Unlike sql.NullBool, NullBool marshals into JSON properly (with the JSON
// value being null if Valid is false).
type NullBool struct {
	Bool  bool
	Valid bool
}

// NewNullBool returns a NullBool with Valid set to
// true is t is of type bool.
func NewNullBool(t interface{}) NullBool {
	var b NullBool
	v, ok := t.(bool)

	if ok {
		b.Valid = true
		b.Bool = v
	} else {
		b.Valid = false
	}
	return b
}

// Scan implements sql.Scanner interface
func (i *NullBool) Scan(src interface{}) error {
	i.Valid = true
	switch v := src.(type) {
	case int64:
		i.Bool = v != 0
	case bool:
		i.Bool = v
	case nil:
		i.Valid = false
	case string:
		i.Bool = v != "0"
	case []byte:
		i.Bool = string(v) != "0"
	default:
		return errors.New("Scanning NullBool, unspecified src type")
	}

	return nil
}

// MarshalJSON implements json.Marshalar interface.
func (i NullBool) MarshalJSON() ([]byte, error) {
	if i.Valid {
		return json.Marshal(i.Bool)
	}
	return []byte("null"), nil
}

// UnmarshalJSON implements json.Unmarshalar interface.
func (i *NullBool) UnmarshalJSON(b []byte) error {
	if string(b) == "null" {
		i.Valid = false
		return nil
	}

	if err := json.Unmarshal(b, &i.Bool); err != nil {
		return err
	}

	i.Valid = true
	return nil
}

// BuildSelectQuery prepares a select sql statement. columns and whereClause
// could be empty strings.
func BuildSelectQuery(table string, columns, joins []string, whereClause string) string {
	b := strings.Builder{}
	b.WriteString("select ")

	for i := 0; i < len(columns); i++ {
		b.WriteString(columns[i])
		if i < len(columns)-1 {
			b.WriteString(", ")
		}
	}

	b.WriteString(" from " + table)
	for _, join := range joins {
		b.WriteString(" " + join)
	}

	if whereClause != "" {
		b.WriteString(" ")
	}
	b.WriteString(whereClause)

	return b.String()
}

// IsErrDuplicateErr checks MySQL/MariaDB error string
// to see a '1062' can be found.
func IsErrDuplicateErr(err error) bool {
	if err == nil {
		return false
	}
	return strings.Contains(err.Error(), "1062")
}

// In question mark returns a string of the format
// "(?, ?, ?)" where there are n question marks.
// It panics if n <= 0.
func InClauseQuestionMarks(n int) string {
	if n <= 0 {
		panic(fmt.Sprintf("count is %v (it must be positive)", n))
	}
	var b strings.Builder
	b.WriteString("(")
	for i := 0; i < n; i++ {
		if i > 0 {
			b.WriteString(", ")
		}
		b.WriteString("?")
	}
	b.WriteString(")")
	return b.String()
}

// ColumnValue represents value in a table's row and the column it belongs to.
type ColumnValue struct {
	Name  string // name of column
	Value any
}

// BuildInsertQuery prepares an insert sql statement on table. It returns the
// query string and an array of args for, for example, sql.DB's Exec.
func BuildInsertQuery(table string, cols []ColumnValue) (query string, args []any) {
	var b, b2 strings.Builder
	fmt.Fprintf(&b, "INSERT INTO %s (", table)
	b2.WriteString("VALUES (")
	for i, item := range cols {
		if i > 0 {
			b.WriteString(", ")
			b2.WriteString(", ")
		}
		b.WriteString(item.Name)
		b2.WriteString("?")
		args = append(args, item.Value)
	}
	b.WriteString(") ")
	b2.WriteString(")")
	b.WriteString(b2.String())
	query = b.String()
	return
}

// Transact begins a transaction and calls f. If f returns an error, the
// transaction is rolled back and the error from f is returned (it is wrapped if
// there's an error on rollback). Otherwise, the transaction is committed.
func Transact(ctx context.Context, db *sql.DB, f func(tx *sql.Tx) error) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	if err := f(tx); err != nil {
		if rErr := tx.Rollback(); err != nil {
			return fmt.Errorf("%w (rollback error: %w)", err, rErr)
		}
		return err
	}

	return tx.Commit()
}
