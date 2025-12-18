// Package services contains the business logic layer of the application.
package services

import (
	"errors"
	"fmt"
	"time"

	"secureview/internal/config"
	"secureview/internal/models"
	"secureview/internal/utils"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

var (
	ErrInvalidCredentials  = errors.New("invalid email or password")
	ErrUserNotFound        = errors.New("user not found")
	ErrUserInactive        = errors.New("user account is inactive")
	ErrOrgInactive         = errors.New("organization is inactive")
	ErrEmailExists         = errors.New("email already registered")
	ErrInvalidPIN          = errors.New("invalid PIN")
	ErrSessionNotFound     = errors.New("session not found")
	ErrInvalidInvitation   = errors.New("invalid or expired invitation")
	ErrInvitationUsed      = errors.New("invitation has already been used")
)

// AuthService handles authentication-related business logic
type AuthService struct {
	db         *gorm.DB
	cfg        *config.Config
	jwtManager *utils.JWTManager
}

// NewAuthService creates a new AuthService
func NewAuthService(db *gorm.DB, cfg *config.Config, jwtManager *utils.JWTManager) *AuthService {
	return &AuthService{
		db:         db,
		cfg:        cfg,
		jwtManager: jwtManager,
	}
}

// RegisterOrganizationInput represents the input for organization registration
type RegisterOrganizationInput struct {
	OrganizationName string `json:"organization_name" binding:"required,min=2,max=255"`
	AdminName        string `json:"admin_name" binding:"required,min=2,max=255"`
	Email            string `json:"email" binding:"required,email"`
	Password         string `json:"password" binding:"required,min=8"`
	PIN              string `json:"pin" binding:"required,len=4"`
	Phone            string `json:"phone"`
}

// RegisterOrganizationResult contains the result of organization registration
type RegisterOrganizationResult struct {
	Organization *models.Organization `json:"organization"`
	User         *models.User         `json:"user"`
	AccessToken  string               `json:"access_token"`
	RefreshToken string               `json:"refresh_token"`
}

// RegisterOrganization registers a new organization with its admin user
func (s *AuthService) RegisterOrganization(input RegisterOrganizationInput) (*RegisterOrganizationResult, error) {
	// Check if email already exists
	var existingUser models.User
	if err := s.db.Where("email = ?", input.Email).First(&existingUser).Error; err == nil {
		return nil, ErrEmailExists
	}

	// Hash password and PIN
	passwordHash, err := utils.HashPassword(input.Password)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	pinHash, err := utils.HashPIN(input.PIN)
	if err != nil {
		return nil, fmt.Errorf("failed to hash PIN: %w", err)
	}

	// Generate unique slug for organization
	slug := utils.GenerateSlug(input.OrganizationName)
	baseSlug := slug
	counter := 1
	for {
		var existingOrg models.Organization
		if err := s.db.Where("slug = ?", slug).First(&existingOrg).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				break
			}
			return nil, fmt.Errorf("failed to check slug: %w", err)
		}
		slug = fmt.Sprintf("%s-%d", baseSlug, counter)
		counter++
	}

	// Create organization and user in a transaction
	var result RegisterOrganizationResult

	err = s.db.Transaction(func(tx *gorm.DB) error {
		// Create organization
		org := &models.Organization{
			Name:     input.OrganizationName,
			Slug:     slug,
			IsActive: true,
		}
		if err := tx.Create(org).Error; err != nil {
			return fmt.Errorf("failed to create organization: %w", err)
		}

		// Create admin user
		user := &models.User{
			OrganizationID: &org.ID,
			Email:          input.Email,
			PasswordHash:   passwordHash,
			PINHash:        pinHash,
			Name:           input.AdminName,
			Role:           models.RoleOrgAdmin,
			IsActive:       true,
			EmailVerified:  false, // Will be true after email verification
		}
		if err := tx.Create(user).Error; err != nil {
			return fmt.Errorf("failed to create user: %w", err)
		}

		// Create session
		session := &models.Session{
			UserID:    user.ID,
			ExpiresAt: time.Now().Add(s.cfg.Security.SessionTimeout),
		}
		if err := tx.Create(session).Error; err != nil {
			return fmt.Errorf("failed to create session: %w", err)
		}

		// Generate tokens
		accessToken, err := s.jwtManager.GenerateAccessToken(user.ID, &org.ID, user.Email, string(user.Role), session.ID)
		if err != nil {
			return fmt.Errorf("failed to generate access token: %w", err)
		}

		refreshToken, err := s.jwtManager.GenerateRefreshToken(user.ID, &org.ID, user.Email, string(user.Role), session.ID)
		if err != nil {
			return fmt.Errorf("failed to generate refresh token: %w", err)
		}

		result.Organization = org
		result.User = user
		result.AccessToken = accessToken
		result.RefreshToken = refreshToken

		return nil
	})

	if err != nil {
		return nil, err
	}

	return &result, nil
}

// LoginInput represents the input for user login
type LoginInput struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// LoginResult contains the result of a successful login
type LoginResult struct {
	User         *models.User `json:"user"`
	AccessToken  string       `json:"access_token"`
	RefreshToken string       `json:"refresh_token"`
	RequiresPIN  bool         `json:"requires_pin"`
	SessionID    uuid.UUID    `json:"session_id"`
}

// Login authenticates a user with email and password
func (s *AuthService) Login(input LoginInput) (*LoginResult, error) {
	// Find user by email
	var user models.User
	if err := s.db.Preload("Organization").Where("email = ?", input.Email).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrInvalidCredentials
		}
		return nil, fmt.Errorf("failed to find user: %w", err)
	}

	// Check if user is active
	if !user.IsActive {
		return nil, ErrUserInactive
	}

	// Check if organization is active (for non-super admins)
	if user.Organization != nil && !user.Organization.IsActive {
		return nil, ErrOrgInactive
	}

	// Verify password
	if !utils.CheckPassword(input.Password, user.PasswordHash) {
		return nil, ErrInvalidCredentials
	}

	// Create session
	session := &models.Session{
		UserID:      user.ID,
		PINVerified: false,
		ExpiresAt:   time.Now().Add(s.cfg.Security.SessionTimeout),
	}
	if err := s.db.Create(session).Error; err != nil {
		return nil, fmt.Errorf("failed to create session: %w", err)
	}

	// Update last login time
	now := time.Now()
	user.LastLoginAt = &now
	s.db.Model(&user).Update("last_login_at", now)

	// Generate tokens
	accessToken, err := s.jwtManager.GenerateAccessToken(user.ID, user.OrganizationID, user.Email, string(user.Role), session.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to generate access token: %w", err)
	}

	refreshToken, err := s.jwtManager.GenerateRefreshToken(user.ID, user.OrganizationID, user.Email, string(user.Role), session.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to generate refresh token: %w", err)
	}

	// Clear sensitive data
	user.PasswordHash = ""
	user.PINHash = ""

	return &LoginResult{
		User:         &user,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		RequiresPIN:  true,
		SessionID:    session.ID,
	}, nil
}

// VerifyPINInput represents the input for PIN verification
type VerifyPINInput struct {
	PIN       string    `json:"pin" binding:"required,len=4"`
	SessionID uuid.UUID `json:"session_id" binding:"required"`
}

// VerifyPIN verifies a user's PIN for a session
func (s *AuthService) VerifyPIN(userID uuid.UUID, input VerifyPINInput) error {
	// Find user
	var user models.User
	if err := s.db.Where("id = ?", userID).First(&user).Error; err != nil {
		return ErrUserNotFound
	}

	// Verify PIN
	if !utils.CheckPIN(input.PIN, user.PINHash) {
		return ErrInvalidPIN
	}

	// Update session
	now := time.Now()
	if err := s.db.Model(&models.Session{}).Where("id = ? AND user_id = ?", input.SessionID, userID).Updates(map[string]interface{}{
		"pin_verified":    true,
		"pin_verified_at": now,
	}).Error; err != nil {
		return fmt.Errorf("failed to update session: %w", err)
	}

	return nil
}

// RefreshTokens generates new access and refresh tokens
func (s *AuthService) RefreshTokens(refreshToken string) (*LoginResult, error) {
	accessToken, newRefreshToken, claims, err := s.jwtManager.RefreshTokens(refreshToken)
	if err != nil {
		return nil, fmt.Errorf("failed to refresh tokens: %w", err)
	}

	// Verify session still exists
	var session models.Session
	if err := s.db.Where("id = ? AND user_id = ?", claims.SessionID, claims.UserID).First(&session).Error; err != nil {
		return nil, ErrSessionNotFound
	}

	if session.IsExpired() {
		return nil, ErrSessionNotFound
	}

	// Get user
	var user models.User
	if err := s.db.Preload("Organization").Where("id = ?", claims.UserID).First(&user).Error; err != nil {
		return nil, ErrUserNotFound
	}

	return &LoginResult{
		User:         &user,
		AccessToken:  accessToken,
		RefreshToken: newRefreshToken,
		RequiresPIN:  !session.PINVerified,
		SessionID:    session.ID,
	}, nil
}

// Logout invalidates a user's session
func (s *AuthService) Logout(userID, sessionID uuid.UUID) error {
	if err := s.db.Where("id = ? AND user_id = ?", sessionID, userID).Delete(&models.Session{}).Error; err != nil {
		return fmt.Errorf("failed to delete session: %w", err)
	}
	return nil
}

// AcceptInvitationInput represents the input for accepting an invitation
type AcceptInvitationInput struct {
	Token    string `json:"token" binding:"required"`
	Name     string `json:"name" binding:"required,min=2,max=255"`
	Password string `json:"password" binding:"required,min=8"`
	PIN      string `json:"pin" binding:"required,len=4"`
}

// AcceptInvitation allows a user to accept an invitation and create their account
func (s *AuthService) AcceptInvitation(input AcceptInvitationInput) (*RegisterOrganizationResult, error) {
	// Find invitation by token
	var invitation models.Invitation
	if err := s.db.Preload("Organization").Where("token = ?", input.Token).First(&invitation).Error; err != nil {
		return nil, ErrInvalidInvitation
	}

	// Check if invitation is valid
	if !invitation.IsValid() {
		if invitation.Status != models.InvitationPending {
			return nil, ErrInvitationUsed
		}
		return nil, ErrInvalidInvitation
	}

	// Check if email already exists
	var existingUser models.User
	if err := s.db.Where("email = ?", invitation.Email).First(&existingUser).Error; err == nil {
		return nil, ErrEmailExists
	}

	// Hash password and PIN
	passwordHash, err := utils.HashPassword(input.Password)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	pinHash, err := utils.HashPIN(input.PIN)
	if err != nil {
		return nil, fmt.Errorf("failed to hash PIN: %w", err)
	}

	var result RegisterOrganizationResult

	err = s.db.Transaction(func(tx *gorm.DB) error {
		// Create user
		user := &models.User{
			OrganizationID: &invitation.OrganizationID,
			Email:          invitation.Email,
			PasswordHash:   passwordHash,
			PINHash:        pinHash,
			Name:           input.Name,
			Role:           invitation.Role,
			IsActive:       true,
			EmailVerified:  true, // Email is verified through invitation
		}
		if err := tx.Create(user).Error; err != nil {
			return fmt.Errorf("failed to create user: %w", err)
		}

		// Update invitation status
		now := time.Now()
		invitation.Status = models.InvitationAccepted
		invitation.AcceptedAt = &now
		if err := tx.Save(&invitation).Error; err != nil {
			return fmt.Errorf("failed to update invitation: %w", err)
		}

		// Create session
		session := &models.Session{
			UserID:    user.ID,
			ExpiresAt: time.Now().Add(s.cfg.Security.SessionTimeout),
		}
		if err := tx.Create(session).Error; err != nil {
			return fmt.Errorf("failed to create session: %w", err)
		}

		// Generate tokens
		accessToken, err := s.jwtManager.GenerateAccessToken(user.ID, &invitation.OrganizationID, user.Email, string(user.Role), session.ID)
		if err != nil {
			return fmt.Errorf("failed to generate access token: %w", err)
		}

		refreshToken, err := s.jwtManager.GenerateRefreshToken(user.ID, &invitation.OrganizationID, user.Email, string(user.Role), session.ID)
		if err != nil {
			return fmt.Errorf("failed to generate refresh token: %w", err)
		}

		result.Organization = invitation.Organization
		result.User = user
		result.AccessToken = accessToken
		result.RefreshToken = refreshToken

		return nil
	})

	if err != nil {
		return nil, err
	}

	return &result, nil
}

// GetInvitationByToken retrieves an invitation by its token
func (s *AuthService) GetInvitationByToken(token string) (*models.Invitation, error) {
	var invitation models.Invitation
	if err := s.db.Preload("Organization").Where("token = ?", token).First(&invitation).Error; err != nil {
		return nil, ErrInvalidInvitation
	}

	if !invitation.IsValid() {
		return nil, ErrInvalidInvitation
	}

	return &invitation, nil
}
