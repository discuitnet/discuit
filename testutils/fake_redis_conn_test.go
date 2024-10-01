package testutils

import (
	"testing"

	"github.com/gomodule/redigo/redis"
)

func TestFakeRedisConn_SET_GET(t *testing.T) {
	conn := NewFakeRedisConn()

	// Test SET command
	_, err := conn.Do("SET", "key1", "123")
	if err != nil {
		t.Fatalf("SET command failed: %v", err)
	}

	// Test GET command for existing key
	val, err := conn.Do("GET", "key1")
	if err != nil {
		t.Fatalf("GET command failed: %v", err)
	}
	if val.(int64) != 123 {
		t.Fatalf("GET command returned unexpected value: got %v want %v", val, 123)
	}

	// Test GET command for non-existing key
	val, err = conn.Do("GET", "key2")
	if err != redis.ErrNil {
		t.Fatalf("GET command for non-existing key did not return redis.ErrNil: %v", err)
	}
	if val != nil {
		t.Fatalf("GET command for non-existing key returned unexpected value: got %v want nil", val)
	}
}

func TestFakeRedisConn_DECR(t *testing.T) {
	conn := NewFakeRedisConn()

	// Test DECR command for non-existing key
	_, err := conn.Do("DECR", "counter")
	if err != redis.ErrNil {
		t.Fatalf("DECR command for non-existing key did not return redis.ErrNil: %v", err)
	}

	// Set initial value for counter
	_, err = conn.Do("SET", "counter", "10")
	if err != nil {
		t.Fatalf("SET command failed: %v", err)
	}

	// Test DECR command
	val, err := conn.Do("DECR", "counter")
	if err != nil {
		t.Fatalf("DECR command failed: %v", err)
	}
	if val.(int64) != 9 {
		t.Fatalf("DECR command returned unexpected value: got %v want %v", val, 9)
	}

	// Test multiple DECR commands
	val, err = conn.Do("DECR", "counter")
	if err != nil {
		t.Fatalf("DECR command failed: %v", err)
	}
	if val.(int64) != 8 {
		t.Fatalf("DECR command returned unexpected value: got %v want %v", val, 8)
	}
}

func TestFakeRedisConn_SetIntValue(t *testing.T) {
	conn := NewFakeRedisConn()

	// Test SET command with int value
	_, err := conn.Do("SET", "intKey", 123)
	if err != nil {
		t.Fatalf("SET command failed: %v", err)
	}

	// Test GET command for existing key with int value
	val, err := conn.Do("GET", "intKey")
	if err != nil {
		t.Fatalf("GET command failed: %v", err)
	}
	if val.(int64) != 123 {
		t.Fatalf("GET command returned unexpected value: got %v want %v", val, 123)
	}
}

func TestFakeRedisConn_SetInt64Value(t *testing.T) {
	conn := NewFakeRedisConn()

	// Test SET command with int64 value
	_, err := conn.Do("SET", "int64Key", int64(456))
	if err != nil {
		t.Fatalf("SET command failed: %v", err)
	}

	// Test GET command for existing key with int64 value
	val, err := conn.Do("GET", "int64Key")
	if err != nil {
		t.Fatalf("GET command failed: %v", err)
	}
	if val.(int64) != 456 {
		t.Fatalf("GET command returned unexpected value: got %v want %v", val, 456)
	}
}

func TestFakeRedisConn_SetStringValue(t *testing.T) {
	conn := NewFakeRedisConn()

	// Test SET command with string value
	_, err := conn.Do("SET", "stringKey", "789")
	if err != nil {
		t.Fatalf("SET command failed: %v", err)
	}

	// Test GET command for existing key with string value
	val, err := conn.Do("GET", "stringKey")
	if err != nil {
		t.Fatalf("GET command failed: %v", err)
	}
	if val.(int64) != 789 {
		t.Fatalf("GET command returned unexpected value: got %v want %v", val, 789)
	}
}

func TestFakeRedisConn_UnknownCommand(t *testing.T) {
	conn := NewFakeRedisConn()

	// Test unknown command
	_, err := conn.Do("UNKNOWN")
	if err == nil {
		t.Fatalf("Expected error for unknown command, got nil")
	}
}

func TestFakeRedisConn_UnknownKey(t *testing.T) {
	conn := NewFakeRedisConn()

	// Test unknown key
	_, err := conn.Do("GET", "unknownKey")
	if err != redis.ErrNil {
		t.Fatalf("Expected redis.ErrNil for unknown key, got %v", err)
	}
}

func TestFakeRedisConn_FlushDB(t *testing.T) {
	conn := NewFakeRedisConn()

	// Set some keys
	_, err := conn.Do("SET", "key", "value")
	if err != nil {
		t.Fatalf("SET command failed: %v", err)
	}

	// Test FLUSHDB command
	_, err = conn.Do("FLUSHDB")
	if err != nil {
		t.Fatalf("FLUSHDB command failed: %v", err)
	}

	// Verify that the keys were deleted
	_, err = conn.Do("GET", "key")
	if err != redis.ErrNil {
		t.Fatalf("Expected redis.ErrNil for deleted key, got %v", err)
	}
}

func TestFakeRedisConn_Flush(t *testing.T) {
	conn := NewFakeRedisConn()

	// Set some keys
	_, err := conn.Do("SET", "key", "value")
	if err != nil {
		t.Fatalf("SET command failed: %v", err)
	}

	// Test FLUSHDB command
	err = conn.Flush()
	if err != nil {
		t.Fatalf("FLUSHDB command failed: %v", err)
	}

	// Verify that the keys were deleted
	_, err = conn.Do("GET", "key")
	if err != redis.ErrNil {
		t.Fatalf("Expected redis.ErrNil for deleted key, got %v", err)
	}
}
