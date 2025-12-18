package utils

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

var (
	ErrInvalidToken = errors.New("invalid token")
	ErrExpiredToken = errors.New("token has expired")
)

// TokenType represents the type of JWT token
type TokenType string

const (
	TokenTypeAccess  TokenType = "access"
	TokenTypeRefresh TokenType = "refresh"
)

// JWTClaims represents the claims in a JWT token
type JWTClaims struct {
	UserID         uuid.UUID `json:"user_id"`
	OrganizationID *uuid.UUID `json:"organization_id,omitempty"`
	Email          string    `json:"email"`
	Role           string    `json:"role"`
	TokenType      TokenType `json:"token_type"`
	SessionID      uuid.UUID `json:"session_id"`
	jwt.RegisteredClaims
}

// JWTManager handles JWT token operations
type JWTManager struct {
	secretKey       []byte
	accessDuration  time.Duration
	refreshDuration time.Duration
}

// NewJWTManager creates a new JWT manager
func NewJWTManager(secret string, accessDuration, refreshDuration time.Duration) *JWTManager {
	return &JWTManager{
		secretKey:       []byte(secret),
		accessDuration:  accessDuration,
		refreshDuration: refreshDuration,
	}
}

// GenerateAccessToken creates a new access token
func (m *JWTManager) GenerateAccessToken(userID uuid.UUID, orgID *uuid.UUID, email, role string, sessionID uuid.UUID) (string, error) {
	return m.generateToken(userID, orgID, email, role, sessionID, TokenTypeAccess, m.accessDuration)
}

// GenerateRefreshToken creates a new refresh token
func (m *JWTManager) GenerateRefreshToken(userID uuid.UUID, orgID *uuid.UUID, email, role string, sessionID uuid.UUID) (string, error) {
	return m.generateToken(userID, orgID, email, role, sessionID, TokenTypeRefresh, m.refreshDuration)
}

// generateToken creates a token with the specified parameters
func (m *JWTManager) generateToken(userID uuid.UUID, orgID *uuid.UUID, email, role string, sessionID uuid.UUID, tokenType TokenType, duration time.Duration) (string, error) {
	now := time.Now().UTC()
	claims := JWTClaims{
		UserID:         userID,
		OrganizationID: orgID,
		Email:          email,
		Role:           role,
		TokenType:      tokenType,
		SessionID:      sessionID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(duration)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			Issuer:    "secureview",
			Subject:   userID.String(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(m.secretKey)
}

// ValidateToken validates a JWT token and returns its claims
func (m *JWTManager) ValidateToken(tokenString string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return m.secretKey, nil
	})

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrExpiredToken
		}
		return nil, ErrInvalidToken
	}

	claims, ok := token.Claims.(*JWTClaims)
	if !ok || !token.Valid {
		return nil, ErrInvalidToken
	}

	return claims, nil
}

// ValidateAccessToken validates an access token
func (m *JWTManager) ValidateAccessToken(tokenString string) (*JWTClaims, error) {
	claims, err := m.ValidateToken(tokenString)
	if err != nil {
		return nil, err
	}

	if claims.TokenType != TokenTypeAccess {
		return nil, ErrInvalidToken
	}

	return claims, nil
}

// ValidateRefreshToken validates a refresh token
func (m *JWTManager) ValidateRefreshToken(tokenString string) (*JWTClaims, error) {
	claims, err := m.ValidateToken(tokenString)
	if err != nil {
		return nil, err
	}

	if claims.TokenType != TokenTypeRefresh {
		return nil, ErrInvalidToken
	}

	return claims, nil
}

// RefreshTokens generates new access and refresh tokens
func (m *JWTManager) RefreshTokens(refreshToken string) (string, string, *JWTClaims, error) {
	claims, err := m.ValidateRefreshToken(refreshToken)
	if err != nil {
		return "", "", nil, err
	}

	accessToken, err := m.GenerateAccessToken(claims.UserID, claims.OrganizationID, claims.Email, claims.Role, claims.SessionID)
	if err != nil {
		return "", "", nil, err
	}

	newRefreshToken, err := m.GenerateRefreshToken(claims.UserID, claims.OrganizationID, claims.Email, claims.Role, claims.SessionID)
	if err != nil {
		return "", "", nil, err
	}

	return accessToken, newRefreshToken, claims, nil
}

// GetAccessDuration returns the access token duration
func (m *JWTManager) GetAccessDuration() time.Duration {
	return m.accessDuration
}

// GetRefreshDuration returns the refresh token duration
func (m *JWTManager) GetRefreshDuration() time.Duration {
	return m.refreshDuration
}
