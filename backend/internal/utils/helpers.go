package utils

import (
	"fmt"
	"regexp"
	"strings"
	"unicode"
)

// GenerateSlug creates a URL-safe slug from a string
func GenerateSlug(s string) string {
	// Convert to lowercase
	slug := strings.ToLower(s)

	// Replace spaces and special characters with hyphens
	reg := regexp.MustCompile(`[^a-z0-9]+`)
	slug = reg.ReplaceAllString(slug, "-")

	// Remove leading/trailing hyphens
	slug = strings.Trim(slug, "-")

	// Collapse multiple hyphens
	reg = regexp.MustCompile(`-+`)
	slug = reg.ReplaceAllString(slug, "-")

	// Limit length
	if len(slug) > 100 {
		slug = slug[:100]
	}

	return slug
}

// ValidateEmail checks if an email address is valid
func ValidateEmail(email string) bool {
	// Simple email validation regex
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	return emailRegex.MatchString(email)
}

// SanitizeString removes potentially dangerous characters from a string
func SanitizeString(s string) string {
	// Remove null bytes and control characters
	return strings.Map(func(r rune) rune {
		if unicode.IsControl(r) {
			return -1
		}
		return r
	}, s)
}

// TruncateString truncates a string to the specified length
func TruncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen]
}

// ContainsString checks if a slice contains a string
func ContainsString(slice []string, s string) bool {
	for _, item := range slice {
		if item == s {
			return true
		}
	}
	return false
}

// UniqueStrings returns a slice with duplicate strings removed
func UniqueStrings(slice []string) []string {
	seen := make(map[string]bool)
	result := make([]string, 0, len(slice))
	for _, s := range slice {
		if !seen[s] {
			seen[s] = true
			result = append(result, s)
		}
	}
	return result
}

// GetMimeType returns the MIME type for a file extension
func GetMimeType(ext string) string {
	ext = strings.ToLower(strings.TrimPrefix(ext, "."))
	mimeTypes := map[string]string{
		"pdf":  "application/pdf",
		"doc":  "application/msword",
		"docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		"xls":  "application/vnd.ms-excel",
		"xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		"ppt":  "application/vnd.ms-powerpoint",
		"pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
		"png":  "image/png",
		"jpg":  "image/jpeg",
		"jpeg": "image/jpeg",
		"gif":  "image/gif",
		"txt":  "text/plain",
		"csv":  "text/csv",
	}

	if mime, ok := mimeTypes[ext]; ok {
		return mime
	}
	return "application/octet-stream"
}

// IsAllowedFileType checks if a file type is allowed for upload
func IsAllowedFileType(ext string) bool {
	allowedTypes := []string{
		"pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
		"png", "jpg", "jpeg", "gif", "txt", "csv",
	}
	ext = strings.ToLower(strings.TrimPrefix(ext, "."))
	return ContainsString(allowedTypes, ext)
}

// FormatFileSize formats a file size in bytes to a human-readable string
func FormatFileSize(bytes int64) string {
	const unit = 1024
	if bytes < unit {
		return fmt.Sprintf("%d B", bytes)
	}
	div, exp := int64(unit), 0
	for n := bytes / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(bytes)/float64(div), "KMGTPE"[exp])
}
