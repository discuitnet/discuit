package config

import (
	"os"
	"testing"
)

func TestAddressValid(t *testing.T) {
	tests := []struct {
		addr   string
		expect bool
	}{
		{":8080", true},
		{"", false},
		{":", false},
		{":ha", false},
		{":00", true},
		{"localhost", false},
		{"localhost:80", true},
	}
	for _, test := range tests {
		if got := AddressValid(test.addr); got != test.expect {
			t.Errorf("expected %v for address %s but got %v", test.expect, test.addr, got)
		}
	}
}

func TestParse(t *testing.T) {
	path := "test_config.yaml"
	data := `
isDevelopment: true
addr: ":8080"
uiProxy: "http://localhost:3000"
siteName: "Discuit"
siteDescription: "A discussion platform"
dbAddr: "localhost:5432"
dbUser: "discuit"
dbPassword: "password"
dbName: "discuitdb"
sessionCookieName: "SID"
redisAddress: ":6379"
hmacSecret: "secret"
csrfOff: false
noLogToFile: false
paginationLimit: 10
paginationLimitMax: 50
defaultFeedSort: "hot"
captchaSecret: "captcha_secret"
certFile: "/path/to/cert"
keyFile: "/path/to/key"
disableRateLimits: false
maxImageSize: 26214400
adminAPIKey: "admin_key"
disableImagePosts: false
disableForumCreation: false
forumCreationReqPoints: 100
maxForumsPerUser: 5
imagesFolderPath: "/path/to/images"
`
	err := os.WriteFile(path, []byte(data), 0644)
	if err != nil {
		t.Fatalf("Failed to write config file: %v", err)
	}
	defer os.Remove(path)

	conf, err := Parse(path)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if conf.Addr != ":8080" {
		t.Errorf("Expected Addr %s, got %s", ":8080", conf.Addr)
	}
	if conf.DBUser != "discuit" {
		t.Errorf("Expected DBUser %s, got %s", "discuit", conf.DBUser)
	}
}
