package httperr

import (
	"fmt"
	"net/http"
)

// Error represents an HTTP error of a REST API. This type is used for all
// except internal server errors.
type Error struct {
	// HTTP status code.
	HTTPStatus int `json:"status"`

	// Code is used to uniquely identify errors of the same HTTP status code
	// coming from the same API endpoint.
	Code string `json:"code,omitempty"`

	// Message is a human readable error message. Message should begin with a
	// capital letter and each sentence should end in a period.
	Message string `json:"message"`
}

func (err *Error) Error() string {
	return fmt.Sprintf("%d %s (%s): %s", err.HTTPStatus, http.StatusText(err.HTTPStatus), err.Code, err.Message)
}

// NewNotFound returns an error with 404 HTTP status code.
func NewNotFound(code, message string) error {
	return &Error{
		HTTPStatus: http.StatusNotFound,
		Code:       code,
		Message:    message,
	}
}

// NewdBadRequest returns an error with 400 HTTP status code.
func NewBadRequest(code, message string) error {
	return &Error{
		HTTPStatus: http.StatusBadRequest,
		Code:       code,
		Message:    message,
	}
}

// NewForbidden returns an error with 403 HTTP status code.
func NewForbidden(code, message string) error {
	return &Error{
		HTTPStatus: http.StatusForbidden,
		Code:       code,
		Message:    message,
	}
}

// IsInternalServerError reports whether err should be treated as an HTTP 500
// error.
func IsInternalServerError(err error) bool {
	e, ok := err.(*Error)
	return !ok || e.HTTPStatus == 500
}

// ToHTTPStatus extracts HTTPStatus from Error. If err is not an instance of
// Error, it returns -1.
func ToHTTPStatus(err error) int {
	e, ok := err.(*Error)
	if !ok {
		return -1
	}
	return e.HTTPStatus
}

// IsNotFound returns true if err is of type Error and it's a 404 error.
func IsNotFound(err error) bool {
	return ToHTTPStatus(err) == 404
}
