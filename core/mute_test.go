package core

import (
	"testing"
)

func TestExtractMuteID(t *testing.T) {
	cases := []struct {
		s        string
		wantType MuteType
		wantID   int
		wantErr  bool
	}{
		{"c_1", MuteTypeCommunity, 1, false},
		{"u_1234", MuteTypeUser, 1234, false},
		{"", "", 0, true},
		{"1234", "", 0, true},
		{"c_", "", 0, true},
	}
	for _, item := range cases {
		type_, id, err := extractMuteID(item.s)
		if type_ != item.wantType || id != item.wantID || (err != nil) != item.wantErr {
			t.Errorf("%s expected values wrong (type: %v, id: %v, err: %v)", item.s, type_, id, err)
		}

	}
}
