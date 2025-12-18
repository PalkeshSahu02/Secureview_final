package handlers

import (
	"net/http"

	"secureview/internal/middleware"
	"secureview/internal/models"
	"secureview/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// UserHandler handles user-related requests
type UserHandler struct {
	userService *services.UserService
}

// NewUserHandler creates a new UserHandler
func NewUserHandler(userService *services.UserService) *UserHandler {
	return &UserHandler{userService: userService}
}

// ListUsers returns a paginated list of organization users
// GET /api/v1/users
func (h *UserHandler) ListUsers(c *gin.Context) {
	orgID, ok := middleware.GetCurrentOrgID(c)
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "forbidden",
			"message": "Organization context required",
		})
		return
	}

	var query struct {
		Role     string `form:"role"`
		IsActive *bool  `form:"is_active"`
		Search   string `form:"search"`
		Page     int    `form:"page,default=1"`
		PageSize int    `form:"page_size,default=20"`
	}
	if err := c.ShouldBindQuery(&query); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_error",
			"message": err.Error(),
		})
		return
	}

	opts := services.ListUsersOptions{
		OrganizationID: orgID,
		Role:           models.UserRole(query.Role),
		IsActive:       query.IsActive,
		Search:         query.Search,
		Page:           query.Page,
		PageSize:       query.PageSize,
	}

	result, err := h.userService.ListUsers(opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "list_failed",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, result)
}

// GetUser returns a specific user's details
// GET /api/v1/users/:id
func (h *UserHandler) GetUser(c *gin.Context) {
	orgID, ok := middleware.GetCurrentOrgID(c)
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "forbidden",
			"message": "Organization context required",
		})
		return
	}

	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_error",
			"message": "Invalid user ID",
		})
		return
	}

	user, err := h.userService.GetUser(userID, orgID)
	if err != nil {
		status := http.StatusInternalServerError
		if err == services.ErrUserNotFound {
			status = http.StatusNotFound
		}
		c.JSON(status, gin.H{
			"error":   "get_failed",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user": user,
	})
}

// UpdateUser updates a user's information
// PUT /api/v1/users/:id
func (h *UserHandler) UpdateUser(c *gin.Context) {
	orgID, ok := middleware.GetCurrentOrgID(c)
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "forbidden",
			"message": "Organization context required",
		})
		return
	}

	currentUserID, _ := middleware.GetCurrentUserID(c)

	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_error",
			"message": "Invalid user ID",
		})
		return
	}

	var input services.UpdateUserInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_error",
			"message": err.Error(),
		})
		return
	}

	user, err := h.userService.UpdateUser(userID, orgID, currentUserID, input)
	if err != nil {
		status := http.StatusInternalServerError
		switch err {
		case services.ErrUserNotFound:
			status = http.StatusNotFound
		case services.ErrCannotModifySelf:
			status = http.StatusForbidden
		case services.ErrCannotDeleteAdmin:
			status = http.StatusForbidden
		}
		c.JSON(status, gin.H{
			"error":   "update_failed",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "User updated successfully",
		"user":    user,
	})
}

// DeactivateUser deactivates a user account
// DELETE /api/v1/users/:id
func (h *UserHandler) DeactivateUser(c *gin.Context) {
	orgID, ok := middleware.GetCurrentOrgID(c)
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "forbidden",
			"message": "Organization context required",
		})
		return
	}

	currentUserID, _ := middleware.GetCurrentUserID(c)

	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_error",
			"message": "Invalid user ID",
		})
		return
	}

	if err := h.userService.DeactivateUser(userID, orgID, currentUserID); err != nil {
		status := http.StatusInternalServerError
		switch err {
		case services.ErrUserNotFound:
			status = http.StatusNotFound
		case services.ErrCannotModifySelf:
			status = http.StatusForbidden
		case services.ErrCannotDeleteAdmin:
			status = http.StatusForbidden
		}
		c.JSON(status, gin.H{
			"error":   "deactivate_failed",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "User deactivated successfully",
	})
}

// CreateInvitation creates a new user invitation
// POST /api/v1/invitations
func (h *UserHandler) CreateInvitation(c *gin.Context) {
	orgID, ok := middleware.GetCurrentOrgID(c)
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "forbidden",
			"message": "Organization context required",
		})
		return
	}

	currentUserID, _ := middleware.GetCurrentUserID(c)

	var input services.CreateInvitationInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_error",
			"message": err.Error(),
		})
		return
	}

	invitation, err := h.userService.CreateInvitation(input, orgID, currentUserID)
	if err != nil {
		status := http.StatusInternalServerError
		if err == services.ErrUserAlreadyExists {
			status = http.StatusConflict
		}
		c.JSON(status, gin.H{
			"error":   "invitation_failed",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":    "Invitation created successfully",
		"invitation": invitation,
		"invite_url": "/accept-invite?token=" + invitation.Token,
	})
}

// ListInvitations returns pending invitations
// GET /api/v1/invitations
func (h *UserHandler) ListInvitations(c *gin.Context) {
	orgID, ok := middleware.GetCurrentOrgID(c)
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "forbidden",
			"message": "Organization context required",
		})
		return
	}

	invitations, err := h.userService.ListInvitations(orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "list_failed",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"invitations": invitations,
	})
}

// CancelInvitation cancels a pending invitation
// DELETE /api/v1/invitations/:id
func (h *UserHandler) CancelInvitation(c *gin.Context) {
	orgID, ok := middleware.GetCurrentOrgID(c)
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "forbidden",
			"message": "Organization context required",
		})
		return
	}

	invitationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_error",
			"message": "Invalid invitation ID",
		})
		return
	}

	if err := h.userService.CancelInvitation(invitationID, orgID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "cancel_failed",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Invitation cancelled successfully",
	})
}

// GetProfile returns the current user's profile
// GET /api/v1/profile
func (h *UserHandler) GetProfile(c *gin.Context) {
	userID, ok := middleware.GetCurrentUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "unauthorized",
			"message": "User not authenticated",
		})
		return
	}

	user, err := h.userService.GetCurrentUserProfile(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "get_failed",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user": user,
	})
}

// UpdateProfile updates the current user's profile
// PUT /api/v1/profile
func (h *UserHandler) UpdateProfile(c *gin.Context) {
	userID, ok := middleware.GetCurrentUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "unauthorized",
			"message": "User not authenticated",
		})
		return
	}

	var input services.UpdateProfileInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_error",
			"message": err.Error(),
		})
		return
	}

	user, err := h.userService.UpdateProfile(userID, input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "update_failed",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Profile updated successfully",
		"user":    user,
	})
}

// ChangePassword changes the current user's password
// POST /api/v1/profile/password
func (h *UserHandler) ChangePassword(c *gin.Context) {
	userID, ok := middleware.GetCurrentUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "unauthorized",
			"message": "User not authenticated",
		})
		return
	}

	var input services.ChangePasswordInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_error",
			"message": err.Error(),
		})
		return
	}

	if err := h.userService.ChangePassword(userID, input); err != nil {
		status := http.StatusInternalServerError
		if err == services.ErrInvalidCredentials {
			status = http.StatusUnauthorized
		}
		c.JSON(status, gin.H{
			"error":   "password_change_failed",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Password changed successfully",
	})
}

// ChangePIN changes the current user's PIN
// POST /api/v1/profile/pin
func (h *UserHandler) ChangePIN(c *gin.Context) {
	userID, ok := middleware.GetCurrentUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "unauthorized",
			"message": "User not authenticated",
		})
		return
	}

	var input services.ChangePINInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_error",
			"message": err.Error(),
		})
		return
	}

	if err := h.userService.ChangePIN(userID, input); err != nil {
		status := http.StatusInternalServerError
		if err == services.ErrInvalidPIN {
			status = http.StatusUnauthorized
		}
		c.JSON(status, gin.H{
			"error":   "pin_change_failed",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "PIN changed successfully",
	})
}
