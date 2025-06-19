package sql

import (
	"encoding/json"
	"net"
	"reflect"
	"testing"
	"time"
)

func TestNilIfEmpty(t *testing.T) {
	if NilIfEmptyString("") != nil {
		t.Error("Not nil")
	}

	if NilIfEmptyString("Not empty") != "Not empty" {
		t.Error("Nil value")
	}
}

func TestNewNullString(t *testing.T) {
	a := NewNullString("not null")
	b := NewNullString(nil)

	if a.String != "not null" {
		t.Error("a.String == not null")
	}

	if a.Valid != true {
		t.Error("a.Valid == true")
	}

	if b.Valid != false {
		t.Error("b.Valid == false")
	}
}

func TestNullStringMarshal(t *testing.T) {
	tests := []struct {
		str    interface{}
		expect string
	}{
		{nil, "null"},
		{"Hi there", `"Hi there"`},
	}

	for _, test := range tests {
		str := NewNullString(test.str)
		b1, _ := json.Marshal(str)
		b2, _ := json.Marshal(&str)

		if string(b1) != test.expect {
			t.Error("NullString marshal")
		}

		if string(b2) != test.expect {
			t.Error("*NullString marshal")
		}
	}
}

func TestNullStringUnmarshal(t *testing.T) {
	js := `"a string"`

	var str NullString
	json.Unmarshal([]byte(js), &str)

	if str.String != "a string" || str.Valid != true {
		t.Errorf("%v json failed to Unmarshal; got: %v", js, str.String)
	}

	js = "null"
	json.Unmarshal([]byte(js), &str)
	if str.Valid != false {
		t.Error("str.Valid = true")
	}
}

func TestNewNullTime(t *testing.T) {
	tt := time.Now()
	a := NewNullTime(tt)
	b := NewNullTime(nil)

	if a.Time != tt {
		t.Error("a.Time == not Now()")
	}

	if a.Valid != true {
		t.Error("a.Valid == true")
	}

	if b.Valid != false {
		t.Error("b.Valid == false")
	}
}

func TestNullTimeMarshal(t *testing.T) {
	expect := `"1901-01-01T01:01:01Z"`
	tests := []struct {
		tt     interface{}
		expect string
	}{
		{nil, "null"},
		{time.Date(1901, time.January, 1, 1, 1, 1, 0, time.FixedZone("UTC", 0)), expect},
	}

	for _, test := range tests {
		tt := NewNullTime(test.tt)
		b1, _ := json.Marshal(tt)
		b2, _ := json.Marshal(&tt)

		if string(b1) != test.expect {
			t.Errorf("NullTime marshal: %v != %v", string(b1), expect)
		}

		if string(b2) != test.expect {
			t.Errorf("*NullTime marshal: %v != %v", string(b1), expect)
		}
	}
}

func TestNullTimeUnmarshal(t *testing.T) {
	js := `"1900-01-01T01:01:01.000000001Z"`

	var tm NullTime
	json.Unmarshal([]byte(js), &tm)

	tt := tm.Time
	if tt.Year() != 1900 ||
		tt.Month() != time.January ||
		tt.Day() != 1 ||
		tt.Hour() != 1 ||
		tt.Minute() != 1 ||
		tt.Second() != 1 ||
		tt.Nanosecond() != 1 {
		t.Error("Wrong time")
	}

	if tm.Valid != true {
		t.Error("NullTime.Valid = false")
	}

	js = "null"
	json.Unmarshal([]byte(js), &tm)

	if tm.Valid != false {
		t.Error("NullTime.Valid = true")
	}
}

func TestNewNullInt32(t *testing.T) {
	a := NewNullInt32(nil)
	b := NewNullInt32(32)

	if a.Valid != false {
		t.Error("a.Value == true")
	}

	if b.Int32 != 32 {
		t.Error("b.Int32 != 32")
	}

	if b.Valid != true {
		t.Error("b.Valid == false")
	}
}

func TestNullInt32Marshal(t *testing.T) {
	tests := []struct {
		i      interface{}
		expect string
	}{
		{nil, "null"},
		{64, "64"},
	}

	for _, test := range tests {
		nullInt := NewNullInt32(test.i)
		b, _ := json.Marshal(nullInt)
		s := string(b)

		if s != test.expect {
			t.Errorf("NullInt32 == %v, should be %v", s, test.expect)
		}

		b, _ = json.Marshal(&nullInt)
		s = string(b)
		if s != test.expect {
			t.Errorf("*NullInt32 == %v, should be %v", s, test.expect)
		}
	}
}
func TestNullInt32Unmarshal(t *testing.T) {
	js := "32"

	var f NullInt32
	json.Unmarshal([]byte(js), &f)

	if f.Int32 != 32 {
		t.Error("f.Float64 != 32")
	}

	if f.Valid != true {
		t.Error("f.Valid = false")
	}

	js = "null"
	json.Unmarshal([]byte(js), &f)

	if f.Valid != false {
		t.Error("f.Valid = true")
	}
}

func TestNewNullFloat64(t *testing.T) {
	a := NewNullFloat64(nil)
	b := NewNullFloat64(32.2)

	if a.Valid != false {
		t.Error("a.Value == true")
	}

	if b.Float64 != 32.2 {
		t.Error("b.Int32 != 32")
	}

	if b.Valid != true {
		t.Error("b.Valid == false")
	}
}

func TestNullFloat64Marshal(t *testing.T) {
	tests := []struct {
		i      interface{}
		expect string
	}{
		{nil, "null"},
		{64.4, "64.4"},
	}

	for _, test := range tests {
		nullInt := NewNullFloat64(test.i)
		b, _ := json.Marshal(nullInt)
		s := string(b)

		if s != test.expect {
			t.Errorf("NullFloat64 == %v, should be %v", s, test.expect)
		}

		b, _ = json.Marshal(&nullInt)
		s = string(b)
		if s != test.expect {
			t.Errorf("*NullFloat64 == %v, should be %v", s, test.expect)
		}
	}
}

func TestNullFloat64Unmarshal(t *testing.T) {
	js := "3.14159"

	var f NullFloat64
	json.Unmarshal([]byte(js), &f)

	if f.Float64 != 3.14159 {
		t.Error("f.Float64 != 3.14159")
	}

	if f.Valid != true {
		t.Error("f.Valid = false")
	}

	js = "null"
	json.Unmarshal([]byte(js), &f)

	if f.Valid != false {
		t.Error("f.Valid = true")
	}
}

func TestNullIPMarshal(t *testing.T) {
	tests := []struct {
		i      interface{}
		expect string
	}{
		{nil, "null"},
		{net.ParseIP("10.0.0.1"), `"10.0.0.1"`},
	}

	for _, test := range tests {
		nullIP := NewNullIP(test.i)
		b, _ := json.Marshal(nullIP)
		s := string(b)

		if s != test.expect {
			t.Errorf("NullIP == %v, should be %v", s, test.expect)
		}

		b, _ = json.Marshal(&nullIP)
		s = string(b)
		if s != test.expect {
			t.Errorf("*NullIP == %v, should be %v", s, test.expect)
		}
	}
}

func TestNullIPUnmarshal(t *testing.T) {
	js := `"10.0.0.1"`
	var i NullIP
	json.Unmarshal([]byte(js), &i)

	if i.IP.String() != "10.0.0.1" {
		t.Errorf("i.IP is not 10.0.0.1, it's %s", i.IP.String())
	}

	if i.Valid != true {
		t.Error("i.Valid = false")
	}

	js = "null"
	json.Unmarshal([]byte(js), &i)

	if i.Valid != false {
		t.Error("f.Valid = true")
	}
}

func TestBuildSelectQuery(t *testing.T) {
	tests := []struct {
		tableName   string
		cols, joins []string
		where       string
		expect      string
	}{
		{"users", []string{"name, email"}, nil, "where id = 2", "select name, email from users where id = 2"},
		{"`posts`", []string{"`posts.id`, `posts.title`, `users.name`"}, []string{
			"inner join users on posts.username = users.name",
		}, "where id = ?", "select `posts.id`, `posts.title`, `users.name` from `posts` inner join users on posts.username = users.name where id = ?"},
		{"users", []string{"name", "address", "bday"}, []string{
			"inner join addresses on users.id = addresses.user_id",
			"inner join bdays on users.bday = bdays.bday",
		}, "where id = ?", "select name, address, bday from users inner join addresses on users.id = addresses.user_id inner join bdays on users.bday = bdays.bday where id = ?"},
	}

	for _, test := range tests {
		if s := BuildSelectQuery(test.tableName, test.cols, test.joins, test.where); s != test.expect {
			t.Errorf("expected: '%v', got: '%v'", test.expect, s)
		}
	}
}

func TestInClauseQuestionMark(t *testing.T) {
	tests := []struct {
		count  int
		expect string
	}{
		{1, "(?)"},
		{2, "(?, ?)"},
		{3, "(?, ?, ?)"},
	}
	for _, test := range tests {
		if s := InClauseQuestionMarks(test.count); s != test.expect {
			t.Errorf("expected: %v, got: %v", test.expect, s)
		}
	}
}

func TestBuildInsertQuery(t *testing.T) {
	tests := []struct {
		table string // table name
		rows  [][]ColumnValue

		expectQuery string
		expectArgs  []any
	}{
		{
			table:       "users",
			rows:        [][]ColumnValue{{{"name", "Leonardo da Vinci"}}},
			expectQuery: "INSERT INTO users (name) VALUES (?)",
			expectArgs:  []any{"Leonardo da Vinci"},
		},
		{
			table: "users",
			rows: [][]ColumnValue{
				{{"name", "Leonardo da Vinci"}},
				{{"name", "Raphael"}},
				{{"name", "Sandro Botticelli"}},
			},
			expectQuery: "INSERT INTO users (name) VALUES (?), (?), (?)",
			expectArgs:  []any{"Leonardo da Vinci", "Raphael", "Sandro Botticelli"},
		},
		{
			table: "users",
			rows: [][]ColumnValue{
				{{"name", "Leonardo da Vinci"}, {"email", "leo@vinci.it"}},
				{{"name", "Raphael"}, {"email", "raph@el.com"}},
				{{"name", "Sandro Botticelli"}, {"email", "san@celli.xy"}},
			},
			expectQuery: "INSERT INTO users (name, email) VALUES (?, ?), (?, ?), (?, ?)",
			expectArgs:  []any{"Leonardo da Vinci", "leo@vinci.it", "Raphael", "raph@el.com", "Sandro Botticelli", "san@celli.xy"},
		},
		{
			table:       "users",
			rows:        [][]ColumnValue{{{"name", "Leonardo da Vinci"}, {"email", "leo@vinci.it"}, {"index", 90}}},
			expectQuery: "INSERT INTO users (name, email, index) VALUES (?, ?, ?)",
			expectArgs:  []any{"Leonardo da Vinci", "leo@vinci.it", 90},
		},
		{
			table:       "users",
			rows:        [][]ColumnValue{{{"name", "Leonardo da Vinci"}, {"email", "leo@vinci.it"}, {"index", 90}, {"verified", NewNullBool(nil)}}},
			expectQuery: "INSERT INTO users (name, email, index, verified) VALUES (?, ?, ?, ?)",
			expectArgs:  []any{"Leonardo da Vinci", "leo@vinci.it", 90, NewNullBool(nil)},
		},
	}
	for _, test := range tests {
		gotQuery, gotArgs := BuildInsertQuery(test.table, test.rows...)
		if test.expectQuery != gotQuery {
			t.Errorf("expected: %v, got: %v", test.expectQuery, gotQuery)
		}
		if !reflect.DeepEqual(test.expectArgs, gotArgs) {
			t.Errorf("expected: %v, got: %v", test.expectArgs, gotArgs)
		}
	}
}
