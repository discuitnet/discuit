package config

import (
	"errors"
	"os"

	"github.com/discuitnet/discuit/core"
	"gopkg.in/yaml.v2"
)

// Config holds all site-wide configuration.
type Config struct {
	IsDevelopment bool `yaml:"isDevelopment"`

	Addr string `yaml:"addr"`

	SiteName        string `yaml:"siteName"`
	SiteDescription string `yaml:"siteDescription"` // Used for meta tags.

	// Primary DB credentials.
	DBAddr     string `yaml:"dbAddr"`
	DBUser     string `yaml:"dbUser"`
	DBPassword string `yaml:"dbPassword"`
	DBName     string `yaml:"dbName"`

	SessionCookieName   string `yaml:"sessionCookieName"`
	SessionCookieSecure bool   `yaml:"sessionCookieSecure"`

	RedisAddress string `yaml:"redisAddress"`

	HMACSecret string `yaml:"hmacSecret"`

	CSRFOff bool `yaml:"csrfOff"`

	NoLogToFile bool `yaml:"noLogToFile"`

	PaginationLimit    int           `yaml:"paginationLimit"`
	PaginationLimitMax int           `yaml:"paginationLimitMax"`
	DefaultFeedSort    core.FeedSort `yaml:"defaultFeedSort"`

	// Captcha verification is skipped if empty.
	CaptchaSecret string `yaml:"captchaSecret"`

	CertFile string `yaml:"certFile"`
	KeyFile  string `yaml:"keyFile"`

	DisableRateLimits bool `yaml:"disableRateLimits"`
	MaxImageSize      int  `yaml:"maxImageSize"`

	// If API requests have a URL query parameter of the form 'adminKey=value',
	// where value is AdminApiKey, rate limits are disabled.
	AdminApiKey string `yaml:"adminAPIKey"`

	DisableImagePosts bool `yaml:"disableImagePosts"`

	DisableForumCreation   bool `yaml:"disableForumCreation"`   // If true, only admins can create communities.
	ForumCreationReqPoints int  `yaml:"forumCreationReqPoints"` // Minimum points required for non-admins to create community, Required non-empty config field.
	MaxForumsPerUser       int  `yaml:"maxForumsPerUser"`       // Max forums one user can moderate, Required non-empty config field.

	// The location where images are saved on disk.
	ImagesFolderPath string `yaml:"imagesFolderPath"`
}

// Parse parses the yaml file at path and returns a Config.
func Parse(path string) (*Config, error) {
	c := &Config{
		// Default values.
		Addr:                ":8080",
		DBUser:              "root",
		SessionCookieName:   "SID",
		SessionCookieSecure: true,
		RedisAddress:        ":6379",
		PaginationLimit:     10,
		PaginationLimitMax:  50,
		DefaultFeedSort:     core.FeedSortHot,
		MaxImageSize:        25 * (1 << 20),

		// Required fields:
		ForumCreationReqPoints: -1,
		MaxForumsPerUser:       -1,
	}

	unmarshal := func() error {
		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		if err = yaml.Unmarshal(data, &c); err != nil {
			return err
		}
		return nil
	}
	if err := unmarshal(); err != nil {
		return nil, err
	}

	if c.Addr == "" {
		c.Addr = ":80"
		if c.CertFile != "" {
			c.Addr = ":443"
		}
	}

	if c.ForumCreationReqPoints == -1 {
		return nil, errors.New("c.ForumCreationReqPoints cannot be (-1)")
	}

	if c.MaxForumsPerUser == -1 {
		return nil, errors.New("c.MaxForumsPerUser cannot be (-1)")
	}
	return c, nil
}
