package utils

import (
	"strings"
	"testing"
)

func TestGenerateStringID(t *testing.T) {
	length := 10
	id := GenerateStringID(length)
	if len(id) != length {
		t.Errorf("Expected length %d, got %d", length, len(id))
	}
	for _, c := range id {
		if !strings.Contains("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_", string(c)) {
			t.Errorf("Invalid character %c in ID", c)
		}
	}
}

func TestValidMAC(t *testing.T) {
	message := "test message"
	key := "secret"
	mac := NewHMAC(message, key)
	valid, err := ValidMAC(message, mac, key)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if !valid {
		t.Errorf("Expected valid MAC, got invalid")
	}

	invalid, err := ValidMAC(message, "aW52YWxpZF9tYWM=", key)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if invalid {
		t.Errorf("Expected invalid MAC, got valid")
	}
}

func TestNewHMAC(t *testing.T) {
	message := "test message"
	key := "secret"
	hmac := NewHMAC(message, key)
	if hmac == "" {
		t.Error("Expected non-empty HMAC")
	}
}

func TestGenerateSenetence(t *testing.T) {
	wc := 5
	sentence := GenerateSenetence(wc)
	words := strings.Split(sentence, " ")
	if len(words) != wc+1 { // +1 for the title-cased first word
		t.Errorf("Expected %d words, got %d", wc+1, len(words))
	}
	if sentence[len(sentence)-1] != '.' {
		t.Errorf("Expected sentence to end with a period, got %c", sentence[len(sentence)-1])
	}
}

func TestGenerateText(t *testing.T) {
	text := GenerateText()
	if text == "" {
		t.Error("Expected non-empty text")
	}
}

func TestTruncateUnicodeString(t *testing.T) {
	s := "Hello, 世界"
	length := 5
	truncated := TruncateUnicodeString(s, length)
	if len([]rune(truncated)) != length {
		t.Errorf("Expected length %d, got %d", length, len([]rune(truncated)))
	}
}

func TestExtractStringsFromMap(t *testing.T) {
	m := map[string]any{
		"key1": " value1 ",
		"key2": 123,
		"key3": "value3",
	}
	expected := map[string]string{
		"key1": "value1",
		"key3": "value3",
	}
	result := ExtractStringsFromMap(m, true)
	if len(result) != len(expected) {
		t.Errorf("Expected map length %d, got %d", len(expected), len(result))
	}
	for key, val := range expected {
		if result[key] != val {
			t.Errorf("Expected value %s for key %s, got %s", val, key, result[key])
		}
	}
}
