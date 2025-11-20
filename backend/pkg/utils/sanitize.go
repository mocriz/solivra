// pkg/utils/sanitize.go
package utils

import (
	"regexp"
	"strings"
)

// SanitizeString sanitizes a string by removing dangerous characters
func SanitizeString(input string, maxLength int) string {
	// Trim whitespace
	result := strings.TrimSpace(input)

	// Remove null bytes
	result = strings.ReplaceAll(result, "\x00", "")

	// Remove control characters except newlines and tabs
	result = regexp.MustCompile(`[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]`).ReplaceAllString(result, "")

	// Limit length
	if maxLength > 0 && len(result) > maxLength {
		result = result[:maxLength]
	}

	return result
}

// CleanMongoOperators removes MongoDB operators from a map
func CleanMongoOperators(data map[string]interface{}) {
	for key := range data {
		if strings.HasPrefix(key, "$") || strings.Contains(key, ".") {
			delete(data, key)
		}
		// Recursively clean nested maps
		if nested, ok := data[key].(map[string]interface{}); ok {
			CleanMongoOperators(nested)
		}
	}
}

// ValidateUsername checks if username matches the required pattern
func ValidateUsername(username string) bool {
	// Pattern: lowercase letters, numbers, dots, underscores, @ (1-30 chars)
	// Must start with letter or number
	pattern := `^[a-z0-9](?:[a-z0-9._@]{0,29})$`
	matched, _ := regexp.MatchString(pattern, username)
	return matched
}
