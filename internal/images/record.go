package images

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	msql "github.com/discuitnet/discuit/internal/sql"
	"github.com/discuitnet/discuit/internal/uid"
)

// ImageRecord is a database row of an image item.
//
// Table name: images.
type ImageRecord struct {
	db *sql.DB

	ID uid.ID `json:"id"`

	StoreName            string `json:"storeName"`
	storeMetadataRawJSON *string
	StoreMetadata        map[string]any `json:"storeMetadata"`

	Format       ImageFormat `json:"format"`
	Width        int         `json:"width"`
	Height       int         `json:"height"`
	Size         int         `json:"size"`
	UploadSize   int         `json:"uploadSize"`
	AverageColor RGB         `json:"averageColor"`
	CreatedAt    time.Time   `json:"createdAt"`
	DeletedAt    *time.Time  `json:"deletedAt"`
	AltText      *string     `json:"altText"`
}

// ImageRecordColumns returns the list of columns of the images table. Use this
// function in conjuction with ImageRecordScanDestinations when selecting SQL
// joins.
func ImageRecordColumns() []string {
	return []string{
		"images.id",
		"images.store_name",
		"images.store_metadata",
		"images.format",
		"images.width",
		"images.height",
		"images.size",
		"images.upload_size",
		"images.average_color",
		"images.created_at",
		"images.deleted_at",
		"images.alt_text",
	}
}

var imageRecordSelectColumns = ImageRecordColumns()

// ScanDestinations returns a slice of pointers that sql.Rows.Scan can populate.
// The pointers match the column names returned by ImageRecordSelectColumns.
func (r *ImageRecord) ScanDestinations() []any {
	return []any{
		&r.ID,
		&r.StoreName,
		&r.storeMetadataRawJSON,
		&r.Format,
		&r.Width,
		&r.Height,
		&r.Size,
		&r.UploadSize,
		&r.AverageColor,
		&r.CreatedAt,
		&r.DeletedAt,
		&r.AltText,
	}
}

// GetImageRecords returns a slice of image records. If no images were found it
// returns ErrImageNotFound.
func GetImageRecords(ctx context.Context, db *sql.DB, ids ...uid.ID) ([]*ImageRecord, error) {
	query := msql.BuildSelectQuery("images", imageRecordSelectColumns, nil, "WHERE id IN "+msql.InClauseQuestionMarks(len(ids)))

	args := make([]any, len(ids))
	for i := range ids {
		args[i] = ids[i]
	}

	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}

	records, err := scanImageRecords(db, rows)
	if err != nil {
		return nil, err
	}
	if len(records) == 0 {
		return nil, ErrImageNotFound
	}
	return records, nil
}

// GetImageRecords returns an image record. If no image was found it returns
// ErrImageNotFound.
func GetImageRecord(ctx context.Context, db *sql.DB, id uid.ID) (*ImageRecord, error) {
	records, err := GetImageRecords(ctx, db, id)
	if err != nil {
		return nil, err
	}
	return records[0], nil
}

func scanImageRecords(db *sql.DB, rows *sql.Rows) ([]*ImageRecord, error) {
	defer rows.Close()

	var records []*ImageRecord
	for rows.Next() {
		r := &ImageRecord{db: db}
		err := rows.Scan(r.ScanDestinations()...)
		if err != nil {
			return nil, err
		}
		if err = r.UnmarshalMetadataJSON(); err != nil {
			return nil, err
		}
		records = append(records, r)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}
	return records, nil
}

// UnmarshalMetadataJSON allocates r.StoreMetadata and fills it with JSON
// metadata fetched from the database.
func (r *ImageRecord) UnmarshalMetadataJSON() error {
	r.StoreMetadata = make(map[string]any)
	if r.storeMetadataRawJSON != nil {
		if err := json.Unmarshal([]byte(*r.storeMetadataRawJSON), &r.StoreMetadata); err != nil {
			return fmt.Errorf("scanning image records error (invalid metadata json) of image record %v", r.ID)
		}
	}
	return nil
}

func (r *ImageRecord) store() store {
	return matchStore(r.StoreName)
}

func (r *ImageRecord) StoreExists() bool {
	return r.store() != nil
}

func (r *ImageRecord) Image() *Image {
	m := NewImage()
	*m.ID = r.ID
	*m.Format = r.Format
	*m.Width = r.Width
	*m.Height = r.Height
	*m.Size = r.Size
	*m.AverageColor = r.AverageColor
	m.AltText = r.AltText
	m.PostScan()
	return m
}

// Image is an image that's to be sent to the client. It is to be derived from
// an ImageRecord.
type Image struct {
	ID           *uid.ID      `json:"id"`
	Format       *ImageFormat `json:"format"`
	MimeType     *string      `json:"mimetype"`
	Width        *int         `json:"width"`
	Height       *int         `json:"height"`
	Size         *int         `json:"size"`
	AverageColor *RGB         `json:"averageColor"`
	URL          *string      `json:"url"`
	Copies       []*ImageCopy `json:"copies"`
	AltText      *string      `json:"altText"`
}

// NewImage returns an Image with all pointer fields allocated and set to zero
// values.
func NewImage() *Image {
	m := &Image{}
	m.ID = new(uid.ID)
	m.Format = new(ImageFormat)
	m.MimeType = new(string)
	m.Width = new(int)
	m.Height = new(int)
	m.Size = new(int)
	m.AverageColor = new(RGB)
	m.URL = new(string)
	m.Copies = make([]*ImageCopy, 0)
	m.AltText = new(string)
	return m
}

// ImageColumns returns a list of columns of the images table (not all of them)
// for when selecting using and outer join. Use Image.ScanDestinations in
// conjunction with this function.
func ImageColumns(tableAlias string) []string {
	return []string{
		tableAlias + ".id",
		tableAlias + ".format",
		tableAlias + ".width",
		tableAlias + ".height",
		tableAlias + ".size",
		tableAlias + ".average_color",
		tableAlias + ".alt_text",
	}
}

func (m *Image) ScanDestinations() []any {
	return []any{
		&m.ID,
		&m.Format,
		&m.Width,
		&m.Height,
		&m.Size,
		&m.AverageColor,
		&m.AltText,
	}
}

// PostScan is to be called after m's fields are scanned from the database. It
// sets fields of m that are derived from database values (like m.URL).
func (m *Image) PostScan() {
	if m.Format != nil {
		s := "image/" + string(*m.Format)
		m.MimeType = &s
	}
	if m.Copies == nil {
		m.Copies = make([]*ImageCopy, 0)
	}
	m.SetURL()
}

// SetURL sets m.URL properly with a hash signature.
func (m *Image) SetURL() {
	if m.ID == nil || m.Format == nil {
		return
	}
	req := request{
		id:     *m.ID,
		format: *m.Format,
	}
	url := req.url()
	if FullImageURL != nil {
		url = FullImageURL(url)
	}
	if m.URL == nil {
		m.URL = new(string)
	}
	*m.URL = url
}

// AppendCopy is a helper function that appends an ImageCopy to m.Copies slice.
// If format is zero, m.Format is used.
func (m *Image) AppendCopy(name string, boxWidth, boxHeight int, fit ImageFit, format ImageFormat) *ImageCopy {
	copy := &ImageCopy{
		ImageID:   *m.ID,
		Name:      name,
		BoxWidth:  boxWidth,
		BoxHeight: boxHeight,
		Fit:       fit,
		Format:    format,
	}

	if format == "" {
		copy.Format = *m.Format
	}

	if fit == ImageFitContain {
		copy.Width, copy.Height = ImageContainSize(*m.Width, *m.Height, boxWidth, boxHeight)
	} else {
		copy.Width, copy.Height = copy.BoxWidth, copy.BoxHeight
	}

	copy.SetURL()
	m.Copies = append(m.Copies, copy)
	return copy
}

// SelectCopy selects the first copy of this image that matches the name. If no
// copy is found, it returns nil.
func (m *Image) SelectCopy(name string) *ImageCopy {
	for _, copy := range m.Copies {
		if copy.Name == name {
			return copy
		}
	}
	return nil
}

// An ImageCopy is a transformed (size, format, and/or fit changed) copy of an
// Image.
type ImageCopy struct {
	ImageID   uid.ID      `json:"-"`
	Name      string      `json:"name,omitempty"` // To identify a copy.
	Width     int         `json:"width"`          // Real width of the image.
	Height    int         `json:"height"`         // Real height of the image.
	BoxWidth  int         `json:"boxWidth"`       // Width of the box the image fits into (for Format == ImageFitContain)
	BoxHeight int         `json:"boxHeight"`      // Height of the box the image fits into (for Format == ImageFitContain)
	Fit       ImageFit    `json:"objectFit"`
	Format    ImageFormat `json:"format"`
	URL       string      `json:"url"`
}

// SetURL sets c.URL to the correct value.
func (c *ImageCopy) SetURL() {
	r := request{
		id:     c.ImageID,
		size:   ImageSize{Width: c.BoxWidth, Height: c.BoxHeight},
		fit:    c.Fit,
		format: c.Format,
	}
	c.URL = r.url()
	if FullImageURL != nil {
		c.URL = FullImageURL(c.URL)
	}
}
