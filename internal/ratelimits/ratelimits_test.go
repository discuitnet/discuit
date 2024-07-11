package ratelimits

import (
	"testing"
	"time"

	"github.com/discuitnet/discuit/testutils"
	"github.com/gomodule/redigo/redis"
)

func TestLimit(t *testing.T) {
	conn := testutils.NewFakeRedisConn()

	bucketID := "test-bucket"
	interval := time.Second * 10
	maxTokens := 5

	// First call should initialize the bucket
	allowed, err := Limit(conn, bucketID, interval, maxTokens)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if !allowed {
		t.Errorf("Expected allowed to be true, got false")
	}

	// Decrease tokens
	for i := 0; i < maxTokens-1; i++ {
		allowed, err := Limit(conn, bucketID, interval, maxTokens)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}
		if !allowed {
			t.Errorf("Expected allowed to be true, got false")
		}
	}

	// Next call should not be allowed
	allowed, err = Limit(conn, bucketID, interval, maxTokens)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if allowed {
		t.Errorf("Expected allowed to be false, got true")
	}

	// Wait for the interval to pass
	time.Sleep(interval)

	// Next call should be allowed again
	allowed, err = Limit(conn, bucketID, interval, maxTokens)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if !allowed {
		t.Errorf("Expected allowed to be true, got false")
	}
}

func TestResetBucket(t *testing.T) {
	conn := testutils.NewFakeRedisConn()

	bucketID := "test-bucket"
	maxTokens := 5

	err := resetBucket(conn, bucketID, maxTokens)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	tokensLeft, err := redis.Int(conn.Do("GET", redisKey(bucketID, "count")))
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if tokensLeft != maxTokens {
		t.Errorf("Expected %d tokens, got %d", maxTokens, tokensLeft)
	}

	lastUpdated, err := redis.Int64(conn.Do("GET", redisKey(bucketID, "ts")))
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if lastUpdated <= 0 {
		t.Errorf("Expected positive timestamp, got %d", lastUpdated)
	}
}
