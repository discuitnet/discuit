package images

import (
	"crypto/sha1"
	"encoding/hex"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path"

	"github.com/discuitnet/discuit/internal/uid"
)

// In the working directory of the running process. Beware when running tests.
var filesRootFolder = ""

// diskStore implements the interface store.
//
// All images are stored inside rootFolder, in a sub-sub-folder. To determine
// the subfolder, the ID of the image is hashed and the hash's first three
// characters are used (ex: "rootFolder/a7/e"). An image therefore can be
// retrieved without a database lookup.
type diskStore struct{}

func newDiskStore() *diskStore {
	return &diskStore{}
}

func (ds *diskStore) name() string {
	return "disk"
}

func (ds *diskStore) get(r *ImageRecord) ([]byte, error) {
	filepath, err := ds.imagePath(r.ID, r.Format)
	if err != nil {
		return nil, err
	}
	data, err := os.ReadFile(filepath)
	if err != nil {
		err = fmt.Errorf("get image %v: %w", r.ID, err)
	}
	return data, err
}

var createFolders = true // To be set to false when testing.

// mkdirAll creates all the nonexistent folders in path.
func mkdirAll(path string) error {
	if !createFolders {
		return nil
	}
	err := os.MkdirAll(path, 0755)
	if err != nil && !os.IsExist(err) {
		return fmt.Errorf("error creating folder %v (%w)", path, err)
	}
	return nil
}

// idToFolder computes the sha1 hash of the id and returns a path with the
// format "f8/e" consisting of the first 3 characters of the hash, and a
// filename consisting the rest.
func idToFolder(id uid.ID) (folder string, filename string) {
	hash := sha1.Sum(id.Bytes())
	hex := hex.EncodeToString(hash[:])
	folder = hex[:2] + "/" + hex[2:3]
	filename = hex[3:]
	return
}

// ImagePath returns the relative path of where an image is stored on disk
// (without the filename extension).
func ImagePath(id uid.ID) string {
	x, y := idToFolder(id)
	return path.Join(x, y)
}

// imagePath returns the path p of where the image should be stored. It creates
// the residing folder, and all parent folders, if they're not found.
func (ds *diskStore) imagePath(imageID uid.ID, f ImageFormat) (p string, err error) {
	folder, filename := idToFolder(imageID)
	folder = path.Join(filesRootFolder, folder)
	if err = mkdirAll(folder); err != nil {
		return
	}
	filename += f.Extension()
	p = path.Join(folder, filename)
	return
}

func (ds *diskStore) save(r *ImageRecord, image []byte) error {
	filepath, err := ds.imagePath(r.ID, r.Format)
	if err != nil {
		return fmt.Errorf("error creating images folder: %v", err)
	}
	if err := os.WriteFile(filepath, image, 0755); err != nil {
		return fmt.Errorf("error writing image file %v: %v", filepath, err)
	}
	return nil
}

func (ds *diskStore) delete(r *ImageRecord) error {
	filepath, err := ds.imagePath(r.ID, r.Format)
	if err != nil {
		return err
	}
	err = os.Remove(filepath)
	if errors.Is(err, fs.ErrNotExist) {
		// Image does not exist for some reason. Could be because of a failed
		// delete image transaction earlier.
		return nil
	}
	return err
}

// SetImagesRootFolder sets the folder in which images are saved (for the disk
// store) and where cache files are stored. Make sure to call this function. The
// path p must be an absolute path.
func SetImagesRootFolder(p string) {
	if !path.IsAbs(p) {
		panic(fmt.Sprintf("path %v is not an absolute path", p))
	}
	filesRootFolder = p
}
