package httputil

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestGetIP(t *testing.T) {
	req := &http.Request{
		RemoteAddr: "192.168.1.1:12345",
	}
	ip := GetIP(req)
	if ip != "192.168.1.1" {
		t.Errorf("Expected IP '192.168.1.1', got '%s'", ip)
	}
}

func TestGet(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("User-Agent") != userAgent {
			t.Errorf("Expected User-Agent '%s', got '%s'", userAgent, r.Header.Get("User-Agent"))
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Hello, world!"))
	}))
	defer ts.Close()

	resp, err := Get(ts.URL)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected status code %d, got %d", http.StatusOK, resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("Expected no error reading body, got %v", err)
	}

	if string(body) != "Hello, world!" {
		t.Errorf("Expected body 'Hello, world!', got '%s'", string(body))
	}
}

func TestExtractOpenGraphImage(t *testing.T) {
	htmlData := `<html><head><meta property="og:image" content="http://example.com/image.jpg"></head></html>`
	r := strings.NewReader(htmlData)
	imageURL, err := ExtractOpenGraphImage(r)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	expected := "http://example.com/image.jpg"
	if imageURL != expected {
		t.Errorf("Expected image URL '%s', got '%s'", expected, imageURL)
	}
}

func TestExtractOpenGraphTitle(t *testing.T) {
	htmlData := `<html><head><meta property="og:title" content="Example Title"></head></html>`
	r := strings.NewReader(htmlData)
	title, err := ExtractOpenGraphTitle(r)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	expected := "Example Title"
	if title != expected {
		t.Errorf("Expected title '%s', got '%s'", expected, title)
	}
}

func TestProxyRequest(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("User-Agent") != userAgent {
			t.Errorf("Expected User-Agent '%s', got '%s'", userAgent, r.Header.Get("User-Agent"))
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Proxied response"))
	}))
	defer ts.Close()

	r := httptest.NewRequest("GET", "http://example.com", nil)
	w := httptest.NewRecorder()
	ProxyRequest(w, r, ts.URL)

	resp := w.Result()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("Expected no error reading body, got %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected status code %d, got %d", http.StatusOK, resp.StatusCode)
	}

	expectedBody := "Proxied response"
	if string(body) != expectedBody {
		t.Errorf("Expected body '%s', got '%s'", expectedBody, string(body))
	}
}
