package testutils

import (
	"errors"
	"strconv"
	"sync"

	"github.com/gomodule/redigo/redis"
)

type FakeRedisConn struct {
	mu    sync.Mutex
	store map[string]interface{}
	err   error
}

func NewFakeRedisConn() *FakeRedisConn {
	return &FakeRedisConn{
		store: make(map[string]interface{}),
	}
}

// Do simulates a Redis command
// Supported commands: GET, SET, DECR, INCR, FLUSH, FLUSHALL, FLUSHDB
func (c *FakeRedisConn) Do(commandName string, args ...interface{}) (interface{}, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	switch commandName {
	case "GET":
		key := args[0].(string)
		if val, ok := c.store[key]; ok {
			switch v := val.(type) {
			case int:
				return int64(v), nil
			case int64:
				return v, nil
			case string:
				return strconv.ParseInt(v, 10, 64)
			}
		}
		return nil, redis.ErrNil
	case "SET":
		key := args[0].(string)
		val := args[1]
		c.store[key] = val
		return "OK", nil
	case "DECR":
		key := args[0].(string)
		if val, ok := c.store[key]; ok {
			switch v := val.(type) {
			case int:
				v--
				c.store[key] = v
				return int64(v), nil
			case int64:
				v--
				c.store[key] = v
				return v, nil
			case string:
				currentVal, _ := strconv.ParseInt(v, 10, 64)
				currentVal--
				c.store[key] = strconv.FormatInt(currentVal, 10)
				return currentVal, nil
			}
		}
		return nil, redis.ErrNil
	case "INCR":
		key := args[0].(string)
		if val, ok := c.store[key]; ok {
			switch v := val.(type) {
			case int:
				v++
				c.store[key] = v
				return int64(v), nil
			case int64:
				v++
				c.store[key] = v
				return v, nil
			case string:
				currentVal, _ := strconv.ParseInt(v, 10, 64)
				currentVal++
				c.store[key] = strconv.FormatInt(currentVal, 10)
				return currentVal, nil
			}
		}
		return nil, redis.ErrNil
	case "MULTI":
		// Start a transaction, for simplicity we do nothing here
		// as we don't super need this for testing, as it is mainly for ensuring the rate limiter works
		return "OK", nil
	case "EXEC":
		// Execute a transaction, for simplicity we do nothing here
		return "OK", nil
	case "FLUSH", "FLUSHALL", "FLUSHDB":
		c.store = make(map[string]interface{})
		return "OK", nil
	default:
		return nil, errors.New("unknown command")
	}
}

func (c *FakeRedisConn) Send(commandName string, args ...interface{}) error {
	_, err := c.Do(commandName, args...)
	return err
}

func (c *FakeRedisConn) Close() error {
	return nil
}

func (c *FakeRedisConn) Err() error {
	return c.err
}

func (c *FakeRedisConn) Flush() error {
	store := make(map[string]interface{})
	c.store = store
	return nil
}

func (c *FakeRedisConn) Receive() (interface{}, error) {
	return nil, nil
}
