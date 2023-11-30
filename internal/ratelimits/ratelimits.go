// Package ratelimits implements a token bucket rate limiter.
package ratelimits

import (
	"time"

	"github.com/gomodule/redigo/redis"
)

func redisKey(bucketID, suffix string) string {
	return "rl:" + bucketID + ":" + suffix
}

func resetBucket(conn redis.Conn, bucketID string, maxTokens int) error {
	conn.Send("MULTI")
	// Number of tokens left.
	conn.Send("SET", redisKey(bucketID, "count"), maxTokens)
	// Last updated timestamp.
	conn.Send("SET", redisKey(bucketID, "ts"), time.Now().Unix())
	_, err := conn.Do("EXEC")
	return err
}

// Limit implements a Token Bucket rate limiter (with the bucket filled to
// maxTokens after interval). It returns true if more than zero tokens exist in
// the bucket.
func Limit(conn redis.Conn, bucketID string, interval time.Duration, maxTokens int) (bool, error) {
	// TODO: Use redis pipelining to speed things up.
	lastUpdated, err := redis.Int64(conn.Do("GET", redisKey(bucketID, "ts")))
	if err != nil {
		if err == redis.ErrNil {
			if err := resetBucket(conn, bucketID, maxTokens); err != nil {
				return false, err
			}
		} else {
			return false, err
		}
	}

	if time.Since(time.Unix(lastUpdated, 0)) >= interval {
		if err := resetBucket(conn, bucketID, maxTokens); err != nil {
			return false, err
		}
	}

	tokensLeft, err := redis.Int(conn.Do("DECR", redisKey(bucketID, "count")))
	if err != nil {
		return false, err
	}
	if tokensLeft > -1 {
		return true, nil
	}
	return false, nil
}
