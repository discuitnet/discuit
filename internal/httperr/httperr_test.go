package httperr

import (
	"errors"
	"net/http"
	"testing"
)

func TestError_Error(t *testing.T) {
	err := &Error{
		HTTPStatus: http.StatusNotFound,
		Code:       "not_found",
		Message:    "Resource not found.",
	}
	expected := "404 Not Found (not_found): Resource not found."
	if err.Error() != expected {
		t.Errorf("Expected error message %q, got %q", expected, err.Error())
	}
}

func TestNewNotFound(t *testing.T) {
	code := "not_found"
	message := "Resource not found."
	err := NewNotFound(code, message)
	httperr, ok := err.(*Error)
	if !ok {
		t.Fatalf("Expected *Error, got %T", err)
	}
	if httperr.HTTPStatus != http.StatusNotFound {
		t.Errorf("Expected HTTP status %d, got %d", http.StatusNotFound, httperr.HTTPStatus)
	}
	if httperr.Code != code {
		t.Errorf("Expected code %q, got %q", code, httperr.Code)
	}
	if httperr.Message != message {
		t.Errorf("Expected message %q, got %q", message, httperr.Message)
	}
}

func TestNewBadRequest(t *testing.T) {
	code := "bad_request"
	message := "Invalid request."
	err := NewBadRequest(code, message)
	httperr, ok := err.(*Error)
	if !ok {
		t.Fatalf("Expected *Error, got %T", err)
	}
	if httperr.HTTPStatus != http.StatusBadRequest {
		t.Errorf("Expected HTTP status %d, got %d", http.StatusBadRequest, httperr.HTTPStatus)
	}
	if httperr.Code != code {
		t.Errorf("Expected code %q, got %q", code, httperr.Code)
	}
	if httperr.Message != message {
		t.Errorf("Expected message %q, got %q", message, httperr.Message)
	}
}

func TestNewForbidden(t *testing.T) {
	code := "forbidden"
	message := "Access denied."
	err := NewForbidden(code, message)
	httperr, ok := err.(*Error)
	if !ok {
		t.Fatalf("Expected *Error, got %T", err)
	}
	if httperr.HTTPStatus != http.StatusForbidden {
		t.Errorf("Expected HTTP status %d, got %d", http.StatusForbidden, httperr.HTTPStatus)
	}
	if httperr.Code != code {
		t.Errorf("Expected code %q, got %q", code, httperr.Code)
	}
	if httperr.Message != message {
		t.Errorf("Expected message %q, got %q", message, httperr.Message)
	}
}

func TestIsInternalServerError(t *testing.T) {
	internalErr := errors.New("internal error")
	if !IsInternalServerError(internalErr) {
		t.Error("Expected true for internal error")
	}

	err := &Error{
		HTTPStatus: http.StatusInternalServerError,
		Code:       "internal_error",
		Message:    "Internal server error.",
	}
	if !IsInternalServerError(err) {
		t.Error("Expected true for 500 error")
	}

	err.HTTPStatus = http.StatusNotFound
	if IsInternalServerError(err) {
		t.Error("Expected false for non-500 error")
	}
}

func TestToHTTPStatus(t *testing.T) {
	err := &Error{
		HTTPStatus: http.StatusNotFound,
		Code:       "not_found",
		Message:    "Resource not found.",
	}
	if status := ToHTTPStatus(err); status != http.StatusNotFound {
		t.Errorf("Expected HTTP status %d, got %d", http.StatusNotFound, status)
	}

	nonHTTPErr := errors.New("non-http error")
	if status := ToHTTPStatus(nonHTTPErr); status != -1 {
		t.Errorf("Expected HTTP status -1, got %d", status)
	}
}

func TestIsNotFound(t *testing.T) {
	err := &Error{
		HTTPStatus: http.StatusNotFound,
		Code:       "not_found",
		Message:    "Resource not found.",
	}
	if !IsNotFound(err) {
		t.Error("Expected true for 404 error")
	}

	err.HTTPStatus = http.StatusInternalServerError
	if IsNotFound(err) {
		t.Error("Expected false for non-404 error")
	}

	nonHTTPErr := errors.New("non-http error")
	if IsNotFound(nonHTTPErr) {
		t.Error("Expected false for non-http error")
	}
}
