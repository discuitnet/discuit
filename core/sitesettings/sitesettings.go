package sitesettings

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"sync"
)

var cache = &ssCache{}

// SiteSettings are distinct from config.Config. SiteSettings are those settings
// that can be changed on the fly (while everything is running) from the admin
// dashboard.
type SiteSettings struct {
	SignupsDisabled bool `json:"signupsDisabled"`
	TorBlocked      bool `json:"torBlocked"`

	// note: ssCache.store() and ssCache.get() uses shallow-copy on this struct.
	// So those lines of code need updating if pointer fields are added to this
	// struct.
}

// Save persists s to the database.
func (s *SiteSettings) Save(ctx context.Context, db *sql.DB) error {
	defer cache.bust()

	bytes, err := json.Marshal(s)
	if err != nil {
		return err
	}

	_, err = db.ExecContext(ctx, "INSERT INTO application_data (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?", "site_settings", string(bytes), string(bytes))
	return err
}

type ssCache struct {
	mu       sync.RWMutex
	settings *SiteSettings
}

func (c *ssCache) get() *SiteSettings {
	c.mu.RLock()
	defer c.mu.RUnlock()
	if c.settings != nil {
		cp := &SiteSettings{}
		*cp = *c.settings // shallow copy
		return cp
	}
	return nil
}

func (c *ssCache) store(s *SiteSettings) {
	c.mu.Lock()
	cp := &SiteSettings{}
	*cp = *s // shallow copy
	c.settings = cp
	c.mu.Unlock()
}

func (c *ssCache) bust() {
	c.mu.Lock()
	c.settings = nil
	c.mu.Unlock()
}

// GetSiteSettings retrieves the site settings (of the admin dashboard) from the
// database. If the data is not found in the database (as the case may be if
// they were never altered), then the default settings object is returned.
func GetSiteSettings(ctx context.Context, db *sql.DB) (*SiteSettings, error) {
	if settings := cache.get(); settings != nil {
		return settings, nil
	}

	var jsonText string
	err := db.QueryRowContext(ctx, "SELECT `value` FROM application_data WHERE `key` = ?", "site_settings").Scan(&jsonText)
	if err != nil {
		if err != sql.ErrNoRows {
			return nil, fmt.Errorf("error reading site_settings from db: %w", err)
		}
	}

	settings := &SiteSettings{}
	if jsonText == "" {
		// Do nothhing. No row was found in the application_data table. Return
		// the deafult SiteSettings object.
	} else {
		if err = json.Unmarshal([]byte(jsonText), settings); err != nil {
			return nil, err
		}
	}

	cache.store(settings)
	return settings, nil
}
