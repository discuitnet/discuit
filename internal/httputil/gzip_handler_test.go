package httputil

import (
	"bytes"
	"compress/gzip"
	"io"
	nethttp "net/http"
	"net/http/httptest"
	"os"
	"path"
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

func TestFileServer(t *testing.T) {
	fs := nethttp.Dir(".")
	handler := FileServer(fs)

	// Test serving a regular file
	req := httptest.NewRequest("GET", "/httputil.go", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	resp := w.Result()
	if resp.StatusCode != nethttp.StatusOK {
		t.Errorf("Expected status code %d, got %d", nethttp.StatusOK, resp.StatusCode)
	}

	// Test serving a gzipped file
	gzippedFilePath := "testfile.gz"
	gzippedFileContent := "This is a test file"
	createGzippedFile(gzippedFilePath, gzippedFileContent)
	defer os.Remove(gzippedFilePath)

	req = httptest.NewRequest("GET", "/testfile", nil)
	req.Header.Set("Accept-Encoding", "gzip")
	w = httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	resp = w.Result()
	if resp.StatusCode != nethttp.StatusOK {
		t.Errorf("Expected status code %d, got %d", nethttp.StatusOK, resp.StatusCode)
	}
	if resp.Header.Get("Content-Encoding") != "gzip" {
		t.Errorf("Expected Content-Encoding 'gzip', got '%s'", resp.Header.Get("Content-Encoding"))
	}

	var buf bytes.Buffer
	_, err := io.Copy(&buf, resp.Body)
	if err != nil {
		t.Fatalf("Expected no error reading body, got %v", err)
	}

	gr, err := gzip.NewReader(&buf)
	if err != nil {
		t.Fatalf("Expected no error creating gzip reader, got %v", err)
	}
	defer gr.Close()

	unzippedContent, err := io.ReadAll(gr)
	if err != nil {
		t.Fatalf("Expected no error reading unzipped content, got %v", err)
	}

	if string(unzippedContent) != gzippedFileContent {
		t.Errorf("Expected content '%s', got '%s'", gzippedFileContent, string(unzippedContent))
	}
}

func createGzippedFile(filePath, content string) {
	f, err := os.Create(filePath)
	if err != nil {
		panic(err)
	}
	defer f.Close()

	gz := gzip.NewWriter(f)
	defer gz.Close()

	_, err = gz.Write([]byte(content))
	if err != nil {
		panic(err)
	}
}

func TestGzipHandler(t *testing.T) {
	handler := GzipHandler(nethttp.HandlerFunc(func(w nethttp.ResponseWriter, r *nethttp.Request) {
		w.Write([]byte("Hello, world!"))
	}))

	// Test with Accept-Encoding: gzip
	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("Accept-Encoding", "gzip")
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	resp := w.Result()
	if resp.StatusCode != nethttp.StatusOK {
		t.Errorf("Expected status code %d, got %d", nethttp.StatusOK, resp.StatusCode)
	}
	if resp.Header.Get("Content-Encoding") != "gzip" {
		t.Errorf("Expected Content-Encoding 'gzip', got '%s'", resp.Header.Get("Content-Encoding"))
	}

	var buf bytes.Buffer
	_, err := io.Copy(&buf, resp.Body)
	if err != nil {
		t.Fatalf("Expected no error reading body, got %v", err)
	}

	gr, err := gzip.NewReader(&buf)
	if err != nil {
		t.Fatalf("Expected no error creating gzip reader, got %v", err)
	}
	defer gr.Close()

	body, err := io.ReadAll(gr)
	if err != nil {
		t.Fatalf("Expected no error reading unzipped body, got %v", err)
	}

	expectedBody := "Hello, world!"
	if string(body) != expectedBody {
		t.Errorf("Expected body '%s', got '%s'", expectedBody, string(body))
	}

	// Test without Accept-Encoding: gzip
	req = httptest.NewRequest("GET", "/", nil)
	w = httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	resp = w.Result()
	if resp.StatusCode != nethttp.StatusOK {
		t.Errorf("Expected status code %d, got %d", nethttp.StatusOK, resp.StatusCode)
	}
	if resp.Header.Get("Content-Encoding") == "gzip" {
		t.Errorf("Did not expect Content-Encoding 'gzip', got '%s'", resp.Header.Get("Content-Encoding"))
	}

	body, err = io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("Expected no error reading body, got %v", err)
	}

	if string(body) != expectedBody {
		t.Errorf("Expected body '%s', got '%s'", expectedBody, string(body))
	}
}

func TestServeGzip(t *testing.T) {
	fs := nethttp.Dir(".")
	tests := []struct {
		name        string
		acceptGzip  bool
		expectGzip  bool
		expectError bool
	}{
		{name: "/httputil.go", acceptGzip: true, expectGzip: false, expectError: false},
		{name: "/nonexistent", acceptGzip: true, expectGzip: false, expectError: true},
		{name: "/testfile", acceptGzip: true, expectGzip: true, expectError: false},
	}

	gzippedFilePath := "testfile.gz"
	gzippedFileContent := "This is a test file"
	createGzippedFile(gzippedFilePath, gzippedFileContent)
	defer os.Remove(gzippedFilePath)

	for _, test := range tests {
		req := httptest.NewRequest("GET", test.name, nil)
		if test.acceptGzip {
			req.Header.Set("Accept-Encoding", "gzip")
		}
		w := httptest.NewRecorder()

		serveGzip(w, req, fs, path.Clean(test.name))

		resp := w.Result()
		if test.expectError && resp.StatusCode == nethttp.StatusOK {
			t.Errorf("Expected error for test %v, got status %d", test.name, resp.StatusCode)
		}
		if !test.expectError && resp.StatusCode != nethttp.StatusOK {
			t.Errorf("Expected status %d for test %v, got status %d", nethttp.StatusOK, test.name, resp.StatusCode)
		}
		if test.expectGzip && resp.Header.Get("Content-Encoding") != "gzip" {
			t.Errorf("Expected Content-Encoding 'gzip' for test %v, got '%s'", test.name, resp.Header.Get("Content-Encoding"))
		}
		if !test.expectGzip && resp.Header.Get("Content-Encoding") == "gzip" {
			t.Errorf("Did not expect Content-Encoding 'gzip' for test %v, got '%s'", test.name, resp.Header.Get("Content-Encoding"))
		}
	}
}
