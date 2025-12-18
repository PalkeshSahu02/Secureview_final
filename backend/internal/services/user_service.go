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
	ErrUserAlreadyExists = errors.New("user with this email already exists")
	ErrCannotModifySelf  = errors.New("cannot modify your own account this way")
	ErrCannotDeleteAdmin = errors.New("cannot delete organization admin")
)

// UserService handles user-related business logic
type UserService struct {
	db  *gorm.DB
	cfg *config.Config
}

// NewUserService creates a new UserService
func NewUserService(db *gorm.DB, cfg *config.Config) *UserService {
	return &UserService{
		db:  db,
		cfg: cfg,
	}
}

// ListUsersOptions contains options for listing users
type ListUsersOptions struct {
	OrganizationID uuid.UUID
	Role           models.UserRole
	IsActive       *bool
	Search         string
	Page           int
	PageSize       int
}

// ListUsersResult contains the result of listing users
type ListUsersResult struct {
	Users      []models.User `json:"users"`
	Total      int64         `json:"total"`
	Page       int           `json:"page"`
	PageSize   int           `json:"page_size"`
	TotalPages int           `json:"total_pages"`
}

// ListUsers returns a paginated list of users in an organization
func (s *UserService) ListUsers(opts ListUsersOptions) (*ListUsersResult, error) {
	if opts.Page < 1 {
		opts.Page = 1
	}
	if opts.PageSize < 1 || opts.PageSize > 100 {
		opts.PageSize = 20
	}

	query := s.db.Model(&models.User{}).Where("organization_id = ?", opts.OrganizationID)

	if opts.Role != "" {
		query = query.Where("role = ?", opts.Role)
	}

	if opts.IsActive != nil {
		query = query.Where("is_active = ?", *opts.IsActive)
	}

	if opts.Search != "" {
		search := "%" + opts.Search + "%"
		query = query.Where("name ILIKE ? OR email ILIKE ?", search, search)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, fmt.Errorf("failed to count users: %w", err)
	}

	var users []models.User
	offset := (opts.Page - 1) * opts.PageSize
	if err := query.Offset(offset).Limit(opts.PageSize).Order("created_at DESC").Find(&users).Error; err != nil {
		return nil, fmt.Errorf("failed to list users: %w", err)
	}

	// Clear sensitive data
	for i := range users {
		users[i].PasswordHash = ""
		users[i].PINHash = ""
	}

	totalPages := int(total) / opts.PageSize
	if int(total)%opts.PageSize > 0 {
		totalPages++
	}

	return &ListUsersResult{
		Users:      users,
		Total:      total,
		Page:       opts.Page,
		PageSize:   opts.PageSize,
		TotalPages: totalPages,
	}, nil
}

// GetUser retrieves a user by ID
func (s *UserService) GetUser(userID uuid.UUID, orgID uuid.UUID) (*models.User, error) {
	var user models.User
	if err := s.db.Where("id = ? AND organization_id = ?", userID, orgID).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	user.PasswordHash = ""
	user.PINHash = ""
	return &user, nil
}

// UpdateUserInput represents the input for updating a user
type UpdateUserInput struct {
	Name       string          `json:"name"`
	Role       models.UserRole `json:"role"`
	EmployeeID string          `json:"employee_id"`
	IsActive   *bool           `json:"is_active"`
}

// UpdateUser updates a user's information
func (s *UserService) UpdateUser(userID uuid.UUID, orgID uuid.UUID, currentUserID uuid.UUID, input UpdateUserInput) (*models.User, error) {
	var user models.User
	if err := s.db.Where("id = ? AND organization_id = ?", userID, orgID).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	// Prevent certain changes to self
	if userID == currentUserID {
		if input.Role != "" && input.Role != user.Role {
			return nil, ErrCannotModifySelf
		}
		if input.IsActive != nil && !*input.IsActive {
			return nil, ErrCannotModifySelf
		}
	}

	// Prevent demoting or deactivating org admin if they're the only one
	if user.Role == models.RoleOrgAdmin && (input.Role != "" && input.Role != models.RoleOrgAdmin || input.IsActive != nil && !*input.IsActive) {
		var adminCount int64
		s.db.Model(&models.User{}).Where("organization_id = ? AND role = ? AND is_active = ? AND id != ?", orgID, models.RoleOrgAdmin, true, userID).Count(&adminCount)
		if adminCount == 0 {
			return nil, ErrCannotDeleteAdmin
		}
	}

	updates := make(map[string]interface{})
	if input.Name != "" {
		updates["name"] = input.Name
	}
	if input.Role != "" && input.Role.IsValid() {
		updates["role"] = input.Role
	}
	if input.EmployeeID != "" {
		updates["employee_id"] = input.EmployeeID
	}
	if input.IsActive != nil {
		updates["is_active"] = *input.IsActive
	}

	if len(updates) > 0 {
		if err := s.db.Model(&user).Updates(updates).Error; err != nil {
			return nil, fmt.Errorf("failed to update user: %w", err)
		}
	}

	// Reload user
	if err := s.db.Where("id = ?", userID).First(&user).Error; err != nil {
		return nil, fmt.Errorf("failed to reload user: %w", err)
	}

	user.PasswordHash = ""
	user.PINHash = ""
	return &user, nil
}

// DeactivateUser deactivates a user account
func (s *UserService) DeactivateUser(userID uuid.UUID, orgID uuid.UUID, currentUserID uuid.UUID) error {
	if userID == currentUserID {
		return ErrCannotModifySelf
	}

	var user models.User
	if err := s.db.Where("id = ? AND organization_id = ?", userID, orgID).First(&user).Error; err != nil {
		return ErrUserNotFound
	}

	// Prevent deactivating the last org admin
	if user.Role == models.RoleOrgAdmin {
		var adminCount int64
		s.db.Model(&models.User{}).Where("organization_id = ? AND role = ? AND is_active = ? AND id != ?", orgID, models.RoleOrgAdmin, true, userID).Count(&adminCount)
		if adminCount == 0 {
			return ErrCannotDeleteAdmin
		}
	}

	user.IsActive = false
	if err := s.db.Save(&user).Error; err != nil {
		return fmt.Errorf("failed to deactivate user: %w", err)
	}

	// Delete all sessions for this user
	s.db.Where("user_id = ?", userID).Delete(&models.Session{})

	return nil
}

// CreateInvitationInput represents the input for creating an invitation
type CreateInvitationInput struct {
	Email string          `json:"email" binding:"required,email"`
	Name  string          `json:"name"`
	Role  models.UserRole `json:"role" binding:"required"`
}

// CreateInvitation creates a new invitation
func (s *UserService) CreateInvitation(input CreateInvitationInput, orgID uuid.UUID, invitedBy uuid.UUID) (*models.Invitation, error) {
	// Check if user already exists in this org
	var existingUser models.User
	if err := s.db.Where("email = ? AND organization_id = ?", input.Email, orgID).First(&existingUser).Error; err == nil {
		return nil, ErrUserAlreadyExists
	}

	// Check if invitation already exists and is pending
	var existingInvitation models.Invitation
	if err := s.db.Where("email = ? AND organization_id = ? AND status = ?", input.Email, orgID, models.InvitationPending).First(&existingInvitation).Error; err == nil {
		// Update existing invitation
		existingInvitation.Role = input.Role
		existingInvitation.Name = input.Name
		existingInvitation.InvitedBy = invitedBy
		existingInvitation.ExpiresAt = time.Now().Add(s.cfg.Security.InviteExpiry)
		if err := s.db.Save(&existingInvitation).Error; err != nil {
			return nil, fmt.Errorf("failed to update invitation: %w", err)
		}
		return &existingInvitation, nil
	}

	// Generate invite token
	token, err := utils.GenerateInviteToken()
	if err != nil {
		return nil, fmt.Errorf("failed to generate invite token: %w", err)
	}

	invitation := &models.Invitation{
		OrganizationID: orgID,
		Email:          input.Email,
		Name:           input.Name,
		Role:           input.Role,
		InvitedBy:      invitedBy,
		Token:          token,
		Status:         models.InvitationPending,
		ExpiresAt:      time.Now().Add(s.cfg.Security.InviteExpiry),
	}

	if err := s.db.Create(invitation).Error; err != nil {
		return nil, fmt.Errorf("failed to create invitation: %w", err)
	}

	return invitation, nil
}

// ListInvitations returns pending invitations for an organization
func (s *UserService) ListInvitations(orgID uuid.UUID) ([]models.Invitation, error) {
	var invitations []models.Invitation
	if err := s.db.Where("organization_id = ? AND status = ? AND expires_at > ?", orgID, models.InvitationPending, time.Now()).
		Preload("Inviter").
		Order("created_at DESC").
		Find(&invitations).Error; err != nil {
		return nil, fmt.Errorf("failed to list invitations: %w", err)
	}
	return invitations, nil
}

// CancelInvitation cancels a pending invitation
func (s *UserService) CancelInvitation(invitationID uuid.UUID, orgID uuid.UUID) error {
	result := s.db.Where("id = ? AND organization_id = ? AND status = ?", invitationID, orgID, models.InvitationPending).Delete(&models.Invitation{})
	if result.Error != nil {
		return fmt.Errorf("failed to cancel invitation: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return ErrInvalidInvitation
	}
	return nil
}

// GetCurrentUserProfile retrieves the current user's profile
func (s *UserService) GetCurrentUserProfile(userID uuid.UUID) (*models.User, error) {
	var user models.User
	if err := s.db.Preload("Organization").Where("id = ?", userID).First(&user).Error; err != nil {
		return nil, ErrUserNotFound
	}
	user.PasswordHash = ""
	user.PINHash = ""
	return &user, nil
}

// UpdateProfileInput represents the input for updating user profile
type UpdateProfileInput struct {
	Name       string `json:"name"`
	EmployeeID string `json:"employee_id"`
}

// UpdateProfile updates the current user's profile
func (s *UserService) UpdateProfile(userID uuid.UUID, input UpdateProfileInput) (*models.User, error) {
	var user models.User
	if err := s.db.Where("id = ?", userID).First(&user).Error; err != nil {
		return nil, ErrUserNotFound
	}

	updates := make(map[string]interface{})
	if input.Name != "" {
		updates["name"] = input.Name
	}
	if input.EmployeeID != "" {
		updates["employee_id"] = input.EmployeeID
	}

	if len(updates) > 0 {
		if err := s.db.Model(&user).Updates(updates).Error; err != nil {
			return nil, fmt.Errorf("failed to update profile: %w", err)
		}
	}

	user.PasswordHash = ""
	user.PINHash = ""
	return &user, nil
}

// ChangePasswordInput represents the input for changing password
type ChangePasswordInput struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required,min=8"`
}

// ChangePassword changes the user's password
func (s *UserService) ChangePassword(userID uuid.UUID, input ChangePasswordInput) error {
	var user models.User
	if err := s.db.Where("id = ?", userID).First(&user).Error; err != nil {
		return ErrUserNotFound
	}

	// Verify current password
	if !utils.CheckPassword(input.CurrentPassword, user.PasswordHash) {
		return ErrInvalidCredentials
	}

	// Hash new password
	newHash, err := utils.HashPassword(input.NewPassword)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	// Update password
	if err := s.db.Model(&user).Update("password_hash", newHash).Error; err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	// Invalidate all sessions except current one (handled by caller if needed)
	return nil
}

// ChangePINInput represents the input for changing PIN
type ChangePINInput struct {
	CurrentPIN string `json:"current_pin" binding:"required,len=4"`
	NewPIN     string `json:"new_pin" binding:"required,len=4"`
}

// ChangePIN changes the user's PIN
func (s *UserService) ChangePIN(userID uuid.UUID, input ChangePINInput) error {
	var user models.User
	if err := s.db.Where("id = ?", userID).First(&user).Error; err != nil {
		return ErrUserNotFound
	}

	// Verify current PIN
	if !utils.CheckPIN(input.CurrentPIN, user.PINHash) {
		return ErrInvalidPIN
	}

	// Hash new PIN
	newHash, err := utils.HashPIN(input.NewPIN)
	if err != nil {
		return fmt.Errorf("failed to hash PIN: %w", err)
	}

	// Update PIN
	if err := s.db.Model(&user).Update("pin_hash", newHash).Error; err != nil {
		return fmt.Errorf("failed to update PIN: %w", err)
	}

	return nil
}
