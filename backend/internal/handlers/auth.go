// Package handlers contains HTTP request handlers for the API.
package handlers

import (
	"net/http"

	"secureview/internal/middleware"
	"secureview/internal/services"

	"github.com/gin-gonic/gin"
)

// AuthHandler handles authentication-related requests
type AuthHandler struct {
	authService *services.AuthService
}

// NewAuthHandler creates a new AuthHandler
func NewAuthHandler(authService *services.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

// Register handles organization registration
// POST /api/v1/auth/register
func (h *AuthHandler) Register(c *gin.Context) {
	var input services.RegisterOrganizationInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_error",
			"message": err.Error(),
		})
		return
	}

	result, err := h.authService.RegisterOrganization(input)
	if err != nil {
		status := http.StatusInternalServerError
		if err == services.ErrEmailExists {
			status = http.StatusConflict
		}
		c.JSON(status, gin.H{
			"error":   "registration_failed",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":       "Organization registered successfully",
		"organization":  result.Organization,
		"user":          result.User,
		"access_token":  result.AccessToken,
		"refresh_token": result.RefreshToken,
	})
}

// Login handles user login
// POST /api/v1/auth/login
func (h *AuthHandler) Login(c *gin.Context) {
	var input services.LoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_error",
			"message": err.Error(),
		})
		return
	}

	result, err := h.authService.Login(input)
	if err != nil {
		status := http.StatusUnauthorized
		message := "Invalid credentials"

		switch err {
		case services.ErrUserInactive:
			message = "Your account has been deactivated"
		case services.ErrOrgInactive:
			message = "Your organization has been deactivated"
		}

		c.JSON(status, gin.H{
			"error":   "login_failed",
			"message": message,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":       "Login successful",
		"user":          result.User,
		"access_token":  result.AccessToken,
		"refresh_token": result.RefreshToken,
		"requires_pin":  result.RequiresPIN,
		"session_id":    result.SessionID,
	})
}

// VerifyPIN handles PIN verification
// POST /api/v1/auth/verify-pin
func (h *AuthHandler) VerifyPIN(c *gin.Context) {
	userID, ok := middleware.GetCurrentUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "unauthorized",
			"message": "User not authenticated",
		})
		return
	}

	var input services.VerifyPINInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_error",
			"message": err.Error(),
		})
		return
	}

	if err := h.authService.VerifyPIN(userID, input); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "pin_verification_failed",
			"message": "Invalid PIN",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "PIN verified successfully",
	})
}

// Logout handles user logout
// POST /api/v1/auth/logout
func (h *AuthHandler) Logout(c *gin.Context) {
	userID, ok := middleware.GetCurrentUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "unauthorized",
			"message": "User not authenticated",
		})
		return
	}

	sessionID, _ := middleware.GetSessionID(c)

	if err := h.authService.Logout(userID, sessionID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "logout_failed",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Logged out successfully",
	})
}

// RefreshToken handles token refresh
// POST /api/v1/auth/refresh
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var input struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_error",
			"message": err.Error(),
		})
		return
	}

	result, err := h.authService.RefreshTokens(input.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "refresh_failed",
			"message": "Invalid or expired refresh token",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"access_token":  result.AccessToken,
		"refresh_token": result.RefreshToken,
		"requires_pin":  result.RequiresPIN,
	})
}

// GetCurrentUser returns the current user's information
// GET /api/v1/auth/me
func (h *AuthHandler) GetCurrentUser(c *gin.Context) {
	user, ok := middleware.GetCurrentUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "unauthorized",
			"message": "User not authenticated",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user": user,
	})
}

// AcceptInvitation handles accepting an invitation
// POST /api/v1/auth/invitations/accept
func (h *AuthHandler) AcceptInvitation(c *gin.Context) {
	var input services.AcceptInvitationInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_error",
			"message": err.Error(),
		})
		return
	}

	result, err := h.authService.AcceptInvitation(input)
	if err != nil {
		status := http.StatusBadRequest
		if err == services.ErrEmailExists {
			status = http.StatusConflict
		}
		c.JSON(status, gin.H{
			"error":   "invitation_failed",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":       "Invitation accepted successfully",
		"organization":  result.Organization,
		"user":          result.User,
		"access_token":  result.AccessToken,
		"refresh_token": result.RefreshToken,
	})
}

// GetInvitation retrieves invitation details by token
// GET /api/v1/auth/invitations/:token
func (h *AuthHandler) GetInvitation(c *gin.Context) {
	token := c.Param("token")
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_error",
			"message": "Invitation token is required",
		})
		return
	}

	invitation, err := h.authService.GetInvitationByToken(token)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "not_found",
			"message": "Invalid or expired invitation",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"invitation": invitation,
	})
}
