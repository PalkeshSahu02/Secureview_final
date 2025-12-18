// Package utils provides utility functions used throughout the application.
package utils

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"regexp"
	"unicode"

	"golang.org/x/crypto/bcrypt"
)

const (
	// bcrypt cost factor (higher = more secure but slower)
	bcryptCost = 12

	// Minimum password requirements
	minPasswordLength = 8
	maxPasswordLength = 128
)

var (
	ErrPasswordTooShort   = errors.New("password must be at least 8 characters")
	ErrPasswordTooLong    = errors.New("password must be less than 128 characters")
	ErrPasswordWeak       = errors.New("password must contain at least one uppercase letter, one lowercase letter, one number, and one special character")
	ErrInvalidPIN         = errors.New("PIN must be exactly 4 digits")
)

// HashPassword generates a bcrypt hash of the password
func HashPassword(password string) (string, error) {
	if err := ValidatePassword(password); err != nil {
		return "", err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
	if err != nil {
		return "", fmt.Errorf("failed to hash password: %w", err)
	}

	return string(hash), nil
}

// CheckPassword compares a password with a hash
func CheckPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// ValidatePassword checks if a password meets security requirements
func ValidatePassword(password string) error {
	if len(password) < minPasswordLength {
		return ErrPasswordTooShort
	}
	if len(password) > maxPasswordLength {
		return ErrPasswordTooLong
	}

	var (
		hasUpper   bool
		hasLower   bool
		hasNumber  bool
		hasSpecial bool
	)

	for _, char := range password {
		switch {
		case unicode.IsUpper(char):
			hasUpper = true
		case unicode.IsLower(char):
			hasLower = true
		case unicode.IsNumber(char):
			hasNumber = true
		case unicode.IsPunct(char) || unicode.IsSymbol(char):
			hasSpecial = true
		}
	}

	if !hasUpper || !hasLower || !hasNumber || !hasSpecial {
		return ErrPasswordWeak
	}

	return nil
}

// HashPIN generates a bcrypt hash of the PIN
func HashPIN(pin string) (string, error) {
	if err := ValidatePIN(pin); err != nil {
		return "", err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(pin), bcryptCost)
	if err != nil {
		return "", fmt.Errorf("failed to hash PIN: %w", err)
	}

	return string(hash), nil
}

// CheckPIN compares a PIN with a hash
func CheckPIN(pin, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(pin))
	return err == nil
}

// ValidatePIN checks if a PIN is valid (4 digits)
func ValidatePIN(pin string) error {
	matched, _ := regexp.MatchString(`^\d{4}$`, pin)
	if !matched {
		return ErrInvalidPIN
	}
	return nil
}

// GenerateRandomToken generates a cryptographically secure random token
func GenerateRandomToken(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("failed to generate random token: %w", err)
	}
	return base64.URLEncoding.EncodeToString(bytes), nil
}

// GenerateInviteToken generates a secure invitation token
func GenerateInviteToken() (string, error) {
	return GenerateRandomToken(32)
}

// GenerateSessionToken generates a secure session token
func GenerateSessionToken() (string, error) {
	return GenerateRandomToken(48)
}

// HashToken creates a hash of a token for storage
func HashToken(token string) string {
	hash, _ := bcrypt.GenerateFromPassword([]byte(token), bcryptCost)
	return string(hash)
}

// CheckToken compares a token with its hash
func CheckToken(token, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(token))
	return err == nil
}
