package images

import (
	"encoding/json"
	"net/url"
	"reflect"
	"testing"

	"github.com/discuitnet/discuit/internal/uid"
)

func init() {
	createFolders = false
}

func TestImageParamsFilename(t *testing.T) {
	zeroID := uid.From(0, 0)
	cases := []struct {
		params         request
		expectFilename string
	}{
		{
			params:         request{id: zeroID, size: ImageSize{300, 300}, fit: ImageFitContain, format: ImageFormatJPEG},
			expectFilename: "13f149e737ec4063fc1d37aee9beabc4b4bbf_300_contain.jpeg",
		},
		{
			params:         request{id: zeroID, size: ImageSize{300, 400}, fit: ImageFitCover, format: ImageFormatWEBP},
			expectFilename: "13f149e737ec4063fc1d37aee9beabc4b4bbf_300x400_cover.webp",
		},
		{
			params:         request{id: zeroID, format: ImageFormatJPEG},
			expectFilename: "13f149e737ec4063fc1d37aee9beabc4b4bbf.jpeg",
		},
		{
			params:         request{id: zeroID, format: ImageFormatWEBP, fit: "cover"},
			expectFilename: "13f149e737ec4063fc1d37aee9beabc4b4bbf.webp",
		},
	}
	for _, item := range cases {
		gotFilename := item.params.filename()
		if gotFilename != item.expectFilename {
			t.Errorf("expected filename %v, got %v", item.expectFilename, gotFilename)
		}
	}
}

func TestFromURL(t *testing.T) {
	zeroID := uid.From(0, 0)
	cases := []struct {
		url         string
		errExpected bool
		expectedErr error // not checked if nil
		expectReq   *request
	}{
		{
			"/images/000000000000000000000000.jpeg?size=300x300&fit=contain&sig=aGFoYQ",
			false,
			nil,
			&request{
				id:     zeroID,
				size:   ImageSize{300, 300},
				format: ImageFormatJPEG,
				fit:    ImageFitContain,
				hash:   []byte("haha"),
			},
		},
		{
			"/images/000000000000000000000000.what?size=300x300&fit=contain&sig=aGFoYQ",
			true,
			ErrImageFormatUnsupported,
			&request{
				id:     zeroID,
				size:   ImageSize{300, 300},
				format: "",
				fit:    ImageFitContain,
				hash:   []byte("haha"),
			},
		},
	}
	for _, item := range cases {
		u, _ := url.Parse(item.url)
		gotReq, err := fromURL(u)
		if err != nil {
			if !item.errExpected {
				t.Errorf("expected an error but got no error (url: %v): \"%v\"", item.url, err)
			}
			if item.expectedErr != nil && err != item.expectedErr {
				t.Errorf("expected error \"%v\" but got error \"%v\" (url: %v)", item.expectedErr, err, item.url)
			}
			continue
		} else {
			if item.errExpected {
				t.Errorf("not expected an error but got an error (url: %v)", item.url)
			}
		}
		if !reflect.DeepEqual(gotReq, item.expectReq) {
			t.Errorf("expect Request %v, got Request %v (url: %v)", item.expectReq, gotReq, item.url)
		}
	}
}

func TestRGBMarshal(t *testing.T) {
	cases := []struct {
		color      RGB
		expectJSON string
	}{
		{color: RGB{Red: 20, Green: 30, Blue: 40}, expectJSON: `"rgb(20,30,40)"`},
	}
	for _, item := range cases {
		gotJSON, err := json.Marshal(item.color)
		if err != nil {
			t.Errorf("marshalling RGB got error: %v", err)
		}
		if string(gotJSON) != item.expectJSON {
			t.Errorf("expected json '%v', got json '%v'", item.expectJSON, string(gotJSON))
		}
	}
}

func TestRGBUnmarshal(t *testing.T) {
	type d struct {
		Color RGB `json:"color"`
	}
	items := []struct {
		json      string
		expect    d
		expectErr bool
	}{
		{json: `{"color":"rgb(10,20,30)"}`, expect: d{RGB{Red: 10, Green: 20, Blue: 30}}},
		{json: `{"color":"rgb(10, 20, 30)"}`, expect: d{RGB{Red: 10, Green: 20, Blue: 30}}},
		{json: `{"color":"rgb(10, 20 , 30)"}`, expect: d{RGB{Red: 10, Green: 20, Blue: 30}}},
		{json: `{"color":"rgb( 0, 20 , 0 )"}`, expect: d{RGB{Red: 0, Green: 20, Blue: 0}}},
		{json: `{"color":""}`, expectErr: true},
		{json: `{"color":"rgb(,,)"}`, expectErr: true},
		{json: `{"color":"rg b(10,20,30)"}`, expectErr: true},
		{json: `{"color":null}`},
		{json: `{"color":""}`, expectErr: true},
	}
	for _, item := range items {
		var got d
		err := json.Unmarshal([]byte(item.json), &got)
		if !item.expectErr && err != nil {
			t.Errorf("error unmarshalling RGB ('%v'): %v", item.json, err)
		}
		if item.expectErr && err == nil {
			t.Errorf("expected error but not got none (json: '%v')", item.json)
		}
		if !reflect.DeepEqual(got, item.expect) {
			t.Errorf("unmarshalling RBG; expected '%v', got '%v'", item.expect.Color, got.Color)
		}
	}
}
