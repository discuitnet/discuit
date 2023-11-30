package uid

import (
	"database/sql/driver"
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"math/rand"
	"time"
)

// ID is an array of 12 bytes that is supposed to be composed of 8 bytes
// of time (number of nanoseconds elapsed since January 1, 1970 UTC) and 4
// random bytes.
type ID [12]byte

// From returns an ID with ts timestamp in the first 8 bytes and rand in the
// last 4 bytes.
func From(ts uint64, rand uint32) ID {
	var id ID
	binary.BigEndian.PutUint64(id[:8], ts)
	binary.BigEndian.PutUint32(id[8:], rand)
	return id
}

// New returns a new id.
func New() ID {
	return From(uint64(time.Now().UTC().UnixNano()), rand.Uint32())
}

// FromString unmarshals hex into id.
//
// hex can be any valid hexadecimal number corresponding to len(id) bytes.
func FromString(hex string) (id ID, err error) {
	err = id.UnmarshalText([]byte(hex))
	return
}

// EqualsTo returns true if d and x are identical byte strings.
func (d ID) EqualsTo(x ID) bool {
	for i := 0; i < len(d); i++ {
		if d[i] != x[i] {
			return false
		}
	}
	return true
}

// Clear sets all bytes of d to 0.
func (d *ID) Clear() {
	for i := 0; i < len(d); i++ {
		d[i] = 0
	}
}

var emptyID ID

// Zero reports whether c is all zero.
func (d ID) Zero() bool {
	return d == emptyID
}

func (d ID) Bytes() []byte {
	return d[:]
}

// Time returns the time value embedded in the first 8 bytes of d.
func (d ID) Time() time.Time {
	ts := binary.BigEndian.Uint64(d[:8])
	return time.Unix(0, int64(ts))
}

// String returns the hexadecimal encoding of ID.
func (d ID) String() string {
	return hex.EncodeToString(d[:])
}

// MarshalText implements encoding.TextMarshaler interface.
// And returns the hexadecimal encoding of ID.
func (d ID) MarshalText() ([]byte, error) {
	return []byte(d.String()), nil
}

// UnmarshalText implements encoding.TextUnmarshaler interface.
// text is supposed to be the hexadecimal encoding of an ID.
func (d *ID) UnmarshalText(text []byte) error {
	n, err := hex.Decode(d[:], text)
	if err != nil {
		return err
	}
	if n != len(d) {
		return fmt.Errorf("ID unmarshaling fail (src is %v bytes)", n)
	}
	return nil
}

// Scan implements sql.Scanner interface.
func (d *ID) Scan(src interface{}) error {
	if src == nil {
		return errors.New("ID scan error: src is nil")
	}

	v, ok := src.([]byte)
	if !ok {
		return errors.New("ID scan error: src is of unknown type")
	}

	if len(v) != len(d) {
		return fmt.Errorf("ID scan error: value is %v bytes", len(v))
	}
	if n := copy(d[:], v); n != len(d) {
		return errors.New("ID scan error: failed to copy all bytes")
	}
	return nil
}

// Value implements driver.Valuer interface.
func (d ID) Value() (driver.Value, error) {
	return d[:], nil
}

// NullID represents an ID that may be null.
type NullID struct {
	ID    ID
	Valid bool
}

// Scan implements the sql.Scanner interface.
func (ni *NullID) Scan(src interface{}) error {
	if src == nil {
		ni.Valid = false
		ni.ID.Clear()
		return nil
	}
	ni.Valid = true
	return ni.ID.Scan(src)
}

// Value implements driver.Valuer interface.
func (ni NullID) Value() (driver.Value, error) {
	if !ni.Valid {
		return nil, nil
	}
	return ni.ID.Value()
}

// MarshalJSON implements json.Marshalar interface.
func (ni NullID) MarshalJSON() ([]byte, error) {
	if ni.Valid {
		return json.Marshal(ni.ID.String())
	}
	return []byte("null"), nil
}

// UnmarshalJSON implements json.Unmarshalar interface.
func (ni *NullID) UnmarshalJSON(b []byte) error {
	if string(b) == "null" {
		ni.Valid = false
		ni.ID.Clear()
		return nil
	}

	err := ni.ID.UnmarshalText(b[1 : len(b)-1])
	ni.Valid = err == nil
	return err
}
