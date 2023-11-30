package httputil

import (
	nethttp "net/http"
	"testing"
)

func TestAcceptEncoding(t *testing.T) {
	tests := []struct {
		headerVal []string // for Accept-Encoding
		expect    bool
	}{
		{[]string{"gzip"}, true},
		{[]string{"gzip,deflate"}, true},
		{[]string{"deflate,random,gzip,s3"}, true},
		{[]string{"", "gzip ,deflate"}, true},
		{[]string{"deflate", "bz,deflate,thing"}, false},
	}
	for _, test := range tests {
		h := make(nethttp.Header)
		for _, val := range test.headerVal {
			h.Add("Accept-Encoding", val)
		}
		if got := AcceptEncoding(h, "gzip"); got != test.expect {
			t.Errorf("encoding expected %v for %v, got %v", test.expect, test.headerVal, got)
		}
	}
}
