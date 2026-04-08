package server

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/discuitnet/discuit/config"
	"github.com/discuitnet/discuit/internal/sessions"
	"github.com/gorilla/mux"
)

// basic smoke test for the createPaymentIntent handler; since we don't have a
// valid stripe key in CI we just verify that we get a 500-style response when
// the library complains.
func TestCreatePaymentIntent_NoKey(t *testing.T) {
	srv := &Server{config: &config.Config{StripeSecretKey: ""}}

	body := []byte(`{"amount":100,"email":"test@example.com"}`)
	req := httptest.NewRequest("POST", "/", bytes.NewReader(body))
	rw := &responseWriter{w: httptest.NewRecorder()}
	// pass an empty session so newRequest doesn't panic
	sess := &sessions.Session{Values: map[string]any{}}
	r := newRequest(req, sess)

	err := srv.createPaymentIntent(rw, r)
	if err == nil {
		t.Fatal("expected error when stripe key is empty")
	}
}

// verify the checkout session handler produces an error when no stripe key is
// configured. this mirrors the behaviour of the payment intent test above.
func TestCreateCheckoutSession_NoKey(t *testing.T) {
	srv := &Server{config: &config.Config{StripeSecretKey: ""}}

	body := []byte(`{"amount":5000,"email":"foo@bar.com"}`)
	req := httptest.NewRequest("POST", "/", bytes.NewReader(body))
	rw := &responseWriter{w: httptest.NewRecorder()}
	// again, the session can be stubbed out
	sess := &sessions.Session{Values: map[string]any{}}
	r := newRequest(req, sess)

	err := srv.createCheckoutSession(rw, r)
	if err == nil {
		t.Fatal("expected error when stripe key is empty")
	}
}

// ensure the checkout-session route can be invoked with no CSRF token. the
// handler is wrapped using withHandlerNoCSRF above so an anonymous POST should
// receive something other than a 401.
func TestCheckoutRoute_AllowsMissingCSRF(t *testing.T) {
	srv := &Server{config: &config.Config{StripeSecretKey: ""}}

	r := mux.NewRouter()
	r.Handle("/api/donations/create-checkout-session", srv.withHandlerNoCSRF(srv.createCheckoutSession)).Methods("POST")

	body := []byte(`{"amount":1234,"email":"a@b.c"}`)
	req := httptest.NewRequest("POST", "/api/donations/create-checkout-session", bytes.NewReader(body))
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)
	if w.Code == http.StatusUnauthorized {
		t.Fatalf("CSRF was not skipped: got %d", w.Code)
	}
}
