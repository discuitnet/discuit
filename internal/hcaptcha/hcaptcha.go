// Package hcaptcha implements functions to verify hCaptcha and reCAPTCHA
// challenges.
package hcaptcha

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
)

// VerifyHCaptcha verifies whether user hCaptcha challenge was successful.
func VerifyHCaptcha(secretKey, token string) (bool, error) {
	return verify(secretKey, token, "https://hcaptcha.com/siteverify")
}

// VerifyReCaptcha verifies whether user reCaptcha challenge was successful.
func VerifyReCaptcha(secretKey, token string) (bool, error) {
	return verify(secretKey, token, "https://www.google.com/recaptcha/api/siteverify")
}

func verify(secret, token, apiEndpoint string) (bool, error) {
	values := url.Values{}
	values.Add("secret", secret)
	values.Add("response", token)

	res, err := http.Post(apiEndpoint, "application/x-www-form-urlencoded", bytes.NewBuffer([]byte(values.Encode())))
	if err != nil {
		return false, err
	}
	defer res.Body.Close()

	body, err := io.ReadAll(res.Body)
	if err != nil {
		return false, err
	}

	response := struct {
		Success    bool     `json:"success"`
		ErrorCodes []string `json:"error-codes"`
		// ... optional fields (later)
	}{}
	if err = json.Unmarshal(body, &response); err != nil {
		return false, err
	}
	return response.Success, nil
}
