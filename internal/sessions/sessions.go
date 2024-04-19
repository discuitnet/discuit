package sessions

import (
	"encoding/json"
	"math/rand"
	"net/http"
	"time"

	"github.com/gomodule/redigo/redis"
)

const defaultSessionIDLength = 36

// Store is a session store.
type Store interface {
	// Get returns an already stored session or, if none exists, a new one (in
	// which case it's not persisted to the store until Save is called). Check
	// session.CookieSet value to determine if the session is a new one.
	Get(r *http.Request) (*Session, error)

	// Save saves the session to the underlying store and sets http cookie
	// headers.
	Save(w http.ResponseWriter, r *http.Request, s *Session, secure bool) error
}

// Session stores a map of session values.
type Session struct {
	store Store // pointer to underlying store

	// ID is the value of the session cookie.
	ID string

	Values map[string]interface{}

	// CookieSet indicates whether this is a new session or not.
	CookieSet bool
}

// Store returns the underlying store of session.
func (s *Session) Store() Store {
	return s.store
}

// Save implements Store.Save method.
func (s *Session) Save(w http.ResponseWriter, r *http.Request, secure bool) error {
	return s.store.Save(w, r, s, secure)
}

// Clear sets s.Values to a new map. The new map is not persisted to the store
// until Save is called.
func (s *Session) Clear() {
	s.Values = make(map[string]interface{})
}

// RedisStore implements a session store which uses Redis as its underlying
// data store.
type RedisStore struct {
	// CookieName is the name of the session cookie.
	CookieName string

	// Session ID length (ie cookie value).
	IDLength int

	pool *redis.Pool
}

// NewRedisStore returns a session store that uses Redis for storage. Redis
// runs on tcp port 6379 by default.
func NewRedisStore(network, address, cookieName string) (*RedisStore, error) {
	store := &RedisStore{CookieName: cookieName, IDLength: defaultSessionIDLength}
	store.pool = &redis.Pool{
		MaxIdle: 30,
		// MaxActive:   10,
		IdleTimeout: 240 * time.Second,
		Dial: func() (redis.Conn, error) {
			return redis.Dial(network, address)
		},
	}

	return store, nil
}

// Close closes the underlying redis resources.
func (rs *RedisStore) Close() error {
	return rs.pool.Close()
}

// Get returns a session from the store, or, if absent, it creates one. Call
// Save to store the session and set a Set-Cookie header.
func (rs *RedisStore) Get(r *http.Request) (*Session, error) {
	cookie, err := r.Cookie(rs.CookieName)
	if err == http.ErrNoCookie { // only possible error
		return rs.newSession()
	}

	conn := rs.pool.Get()
	defer conn.Close()

	res, err := redis.String(conn.Do("GET", rs.RedisKey(cookie.Value)))
	if err != nil {
		if err == redis.ErrNil { // cookie exists but no matching store record
			return rs.newSession()
		}
		return nil, err
	}

	s := &Session{
		store:     rs,
		ID:        cookie.Value,
		Values:    make(map[string]interface{}),
		CookieSet: true,
	}

	if err := json.Unmarshal([]byte(res), &s.Values); err != nil {
		return nil, err
	}

	return s, nil
}

func (rs *RedisStore) newSession() (*Session, error) {
	s := &Session{
		store:     rs,
		ID:        generateID(rs.IDLength),
		Values:    make(map[string]interface{}),
		CookieSet: false,
	}
	return s, nil
}

// Save saves the session values to redis and, if the session is new, it adds a
// Set-Cookie header to ResponseWriter.
func (rs *RedisStore) Save(w http.ResponseWriter, r *http.Request, s *Session, secure bool) error {
	data, err := json.Marshal(s.Values)
	if err != nil {
		return err
	}

	expires := time.Hour * 24 * 30 * 12 // 1 year

	cookie, err := r.Cookie(rs.CookieName)
	if !s.CookieSet && (err == http.ErrNoCookie || cookie.Value != s.ID) {
		http.SetCookie(w, &http.Cookie{
			Name:     rs.CookieName,
			Value:    s.ID,
			Secure:   secure,
			HttpOnly: true,
			Path:     "/",
			Expires:  time.Now().UTC().Add(expires),
			SameSite: http.SameSiteLaxMode,
		})
		s.CookieSet = true
	}

	conn := rs.pool.Get()
	defer conn.Close()

	key := rs.RedisKey(s.ID)

	conn.Send("MULTI")
	conn.Send("SET", key, string(data))
	conn.Send("EXPIRE", key, int64(float64(expires)/1e9))
	_, err = conn.Do("EXEC")
	return err
}

// RedisKey returns the key the session data is stored in Redis.
func (rs *RedisStore) RedisKey(sessionID string) string {
	return "rs_" + rs.CookieName + ":" + sessionID
}

func generateID(length int) string {
	letters := "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_"
	var id string

	for i := 0; i < length; i++ {
		id = id + string(letters[rand.Intn(len(letters))])
	}

	return id
}
