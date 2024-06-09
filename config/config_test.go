package config

import "testing"

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
