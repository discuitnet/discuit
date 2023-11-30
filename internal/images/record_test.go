package images

import (
	"testing"

	"github.com/discuitnet/discuit/internal/uid"
)

func TestIdToFolder(t *testing.T) {
	cases := []struct {
		id                         uid.ID
		expectPath, expectFilename string
	}{
		{uid.From(0, 0), "2c/5", "13f149e737ec4063fc1d37aee9beabc4b4bbf"},
	}

	for _, item := range cases {
		gotPath, gotFilename := idToFolder(item.id)
		if gotPath != item.expectPath {
			t.Errorf("expected path %v, got %v", item.expectPath, gotPath)
		}
		if gotFilename != item.expectFilename {
			t.Errorf("expected filename %v, got %v", item.expectFilename, gotFilename)
		}
	}
}

func TestImagePath(t *testing.T) {
	ds := newDiskStore()
	cases := []struct {
		imageID        uid.ID
		format         ImageFormat
		expectFilepath string
		expectError    bool
	}{
		{uid.From(0, 0), ImageFormatJPEG, "2c/5/13f149e737ec4063fc1d37aee9beabc4b4bbf.jpeg", false},
	}
	for _, item := range cases {
		gotFilepath, err := ds.imagePath(item.imageID, item.format)
		if item.expectError != (err != nil) {
			s := ""
			if !item.expectError {
				s = " no"
			}
			t.Errorf("expected%v error but got error %v", s, err)
		}
		if !item.expectError {
			if gotFilepath != item.expectFilepath {
				t.Errorf("expected filepath %v, got %v", item.expectFilepath, gotFilepath)
			}
		}
	}
}
