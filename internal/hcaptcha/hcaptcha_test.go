package hcaptcha

import (
	"bytes"
	"io/ioutil"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
)

type mockTransport struct {
	serverURL string
}

func (t *mockTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	// Redirect the request to the test server
	req.URL, _ = url.Parse(t.serverURL + req.URL.Path)

	// Create a new request
	newReq, err := http.NewRequest(req.Method, req.URL.String(), req.Body)
	if err != nil {
		return nil, err
	}
	newReq.Header = req.Header

	client := &http.Client{}
	resp, err := client.Do(newReq)
	if err != nil {
		return nil, err
	}

	// Copy the response
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	resp.Body = ioutil.NopCloser(bytes.NewBuffer(body))

	return resp, nil
}

func TestVerifyHCaptcha(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := r.ParseForm(); err != nil {
			t.Fatalf("Expected no error parsing form, got %v", err)
		}
		if r.Form.Get("secret") != "test-secret" {
			t.Errorf("Expected secret 'test-secret', got '%s'", r.Form.Get("secret"))
		}
		if r.Form.Get("response") != "test-token" {
			t.Errorf("Expected response 'test-token', got '%s'", r.Form.Get("response"))
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"success": true}`))
	}))
	defer ts.Close()

	// Create a client with the mock transport
	client := &http.Client{
		Transport: &mockTransport{serverURL: ts.URL},
	}

	http.DefaultClient = client // Override the default client for testing

	success, err := VerifyHCaptcha("test-secret", "test-token")
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if !success {
		t.Errorf("Expected success to be true, got false")
	}
}

func TestVerifyReCaptcha(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := r.ParseForm(); err != nil {
			t.Fatalf("Expected no error parsing form, got %v", err)
		}
		if r.Form.Get("secret") != "test-secret" {
			t.Errorf("Expected secret 'test-secret', got '%s'", r.Form.Get("secret"))
		}
		if r.Form.Get("response") != "test-token" {
			t.Errorf("Expected response 'test-token', got '%s'", r.Form.Get("response"))
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"success": true}`))
	}))
	defer ts.Close()

	// Create a client with the mock transport
	client := &http.Client{
		Transport: &mockTransport{serverURL: ts.URL},
	}

	http.DefaultClient = client // Override the default client for testing

	success, err := VerifyReCaptcha("test-secret", "test-token")
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if !success {
		t.Errorf("Expected success to be true, got false")
	}
}

func TestVerifyFailure(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"success": false, "error-codes": ["invalid-input-response"]}`))
	}))
	defer ts.Close()

	// Create a client with the mock transport
	client := &http.Client{
		Transport: &mockTransport{serverURL: ts.URL},
	}

	http.DefaultClient = client // Override the default client for testing

	success, err := verify("test-secret", "test-token", ts.URL)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if success {
		t.Errorf("Expected success to be false, got true")
	}
}
