package uid

import (
	"encoding/binary"
	"encoding/json"
	"fmt"
	"testing"
)

func TestFrom(t *testing.T) {
	ts := uint64(1629131234567890000)
	rand := uint32(1234567890)
	id := From(ts, rand)

	if id.Time().UnixNano() != int64(ts) {
		t.Errorf("Expected timestamp %d, got %d", ts, id.Time().UnixNano())
	}

	expectedRand := make([]byte, 4)
	binary.BigEndian.PutUint32(expectedRand, rand)
	if !id.EqualsTo(From(ts, rand)) {
		t.Errorf("Expected random bytes %x, got %x", expectedRand, id[8:])
	}
}

func TestNew(t *testing.T) {
	id := New()
	fmt.Println(id)
	if id.Zero() {
		t.Error("Expected non-zero ID")
	}
}

func TestFromString(t *testing.T) {
	hexStr := "17e0e9c7af6fbc7d6360a3f1"
	id, err := FromString(hexStr)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if id.String() != hexStr {
		t.Errorf("Expected ID %s, got %s", hexStr, id.String())
	}
}

func TestEqualsTo(t *testing.T) {
	id1 := New()
	id2 := id1
	if !id1.EqualsTo(id2) {
		t.Error("Expected IDs to be equal")
	}
	id2 = New()
	if id1.EqualsTo(id2) {
		t.Error("Expected IDs to be different")
	}
}

func TestClear(t *testing.T) {
	id := New()
	id.Clear()
	if !id.Zero() {
		t.Error("Expected ID to be zero after clearing")
	}
}

func TestZero(t *testing.T) {
	var id ID
	if !id.Zero() {
		t.Error("Expected zero ID")
	}
	id = New()
	if id.Zero() {
		t.Error("Expected non-zero ID")
	}
}

func TestBytes(t *testing.T) {
	id := New()
	if len(id.Bytes()) != 12 {
		t.Errorf("Expected 12 bytes, got %d", len(id.Bytes()))
	}
}

func TestString(t *testing.T) {
	id := New()
	if len(id.String()) != 24 {
		t.Errorf("Expected 24 characters, got %d", len(id.String()))
	}
}

func TestMarshalUnmarshalText(t *testing.T) {
	id := New()
	data, err := id.MarshalText()
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	var id2 ID
	if err := id2.UnmarshalText(data); err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if !id.EqualsTo(id2) {
		t.Error("Expected IDs to be equal after unmarshaling")
	}
}

func TestScan(t *testing.T) {
	id := New()
	var id2 ID
	if err := id2.Scan(id.Bytes()); err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if !id.EqualsTo(id2) {
		t.Error("Expected IDs to be equal after scanning")
	}
}

func TestValue(t *testing.T) {
	id := New()
	val, err := id.Value()
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if val == nil {
		t.Error("Expected non-nil value")
	}
}

func TestNullID(t *testing.T) {
	var ni NullID
	if ni.Valid {
		t.Error("Expected invalid NullID")
	}

	ni.Scan(nil)
	if ni.Valid {
		t.Error("Expected invalid NullID after scanning nil")
	}

	id := New()
	ni.Scan(id.Bytes())
	if !ni.Valid {
		t.Error("Expected valid NullID after scanning valid bytes")
	}

	val, err := ni.Value()
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if val == nil {
		t.Error("Expected non-nil value")
	}

	jsonData, err := json.Marshal(ni)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	var ni2 NullID
	if err := json.Unmarshal(jsonData, &ni2); err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if !ni2.Valid {
		t.Error("Expected valid NullID after unmarshaling")
	}
	if !ni.ID.EqualsTo(ni2.ID) {
		t.Error("Expected IDs to be equal after unmarshaling")
	}
}
