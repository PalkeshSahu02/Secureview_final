// Package middleware provides HTTP middleware for the Gin web framework.
package middleware

import (
	"net/http"
	"strings"

	"secureview/internal/models"
	"secureview/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Context keys for storing authenticated user data
const (
	ContextKeyUser         = "user"
	ContextKeyUserID       = "user_id"
	ContextKeyOrganization = "organization"
	ContextKeyOrgID        = "organization_id"
	ContextKeyClaims       = "claims"
	ContextKeySessionID    = "session_id"
)

// AuthMiddleware creates a middleware that validates JWT tokens
func AuthMiddleware(jwtManager *utils.JWTManager, db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Extract token from Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":   "unauthorized",
				"message": "Authorization header is required",
			})
			return
		}

		// Check for Bearer token format
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":   "unauthorized",
				"message": "Invalid authorization format. Use: Bearer <token>",
			})
			return
		}

		tokenString := parts[1]

		// Validate the token
		claims, err := jwtManager.ValidateAccessToken(tokenString)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":   "unauthorized",
				"message": "Invalid or expired token",
			})
			return
		}

		// Verify session exists and is valid
		var session models.Session
		if err := db.Where("id = ? AND user_id = ?", claims.SessionID, claims.UserID).First(&session).Error; err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":   "unauthorized",
				"message": "Session not found or expired",
			})
			return
		}

		if session.IsExpired() {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":   "unauthorized",
				"message": "Session has expired",
			})
			return
		}

		// Load the user
		var user models.User
		if err := db.Preload("Organization").Where("id = ? AND is_active = ?", claims.UserID, true).First(&user).Error; err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":   "unauthorized",
				"message": "User not found or inactive",
			})
			return
		}

		// Store user data in context
		c.Set(ContextKeyUser, &user)
		c.Set(ContextKeyUserID, user.ID)
		c.Set(ContextKeyClaims, claims)
		c.Set(ContextKeySessionID, session.ID)

		if user.OrganizationID != nil {
			c.Set(ContextKeyOrgID, *user.OrganizationID)
			if user.Organization != nil {
				c.Set(ContextKeyOrganization, user.Organization)
			}
		}

		c.Next()
	}
}

// RequirePIN creates a middleware that ensures PIN has been verified for the session
func RequirePIN(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		sessionID, exists := c.Get(ContextKeySessionID)
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":   "unauthorized",
				"message": "Session not found",
			})
			return
		}

		var session models.Session
		if err := db.Where("id = ?", sessionID).First(&session).Error; err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":   "unauthorized",
				"message": "Session not found",
			})
			return
		}

		if !session.PINVerified {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error":   "pin_required",
				"message": "PIN verification is required to access this resource",
			})
			return
		}

		c.Next()
	}
}

// RequireRole creates a middleware that checks if the user has one of the allowed roles
func RequireRole(allowedRoles ...models.UserRole) gin.HandlerFunc {
	return func(c *gin.Context) {
		userValue, exists := c.Get(ContextKeyUser)
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":   "unauthorized",
				"message": "User not found in context",
			})
			return
		}

		user, ok := userValue.(*models.User)
		if !ok {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
				"error":   "internal_error",
				"message": "Failed to get user from context",
			})
			return
		}

		for _, role := range allowedRoles {
			if user.Role == role {
				c.Next()
				return
			}
		}

		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
			"error":   "forbidden",
			"message": "You don't have permission to access this resource",
		})
	}
}

// RequireOrgAdmin ensures the user is an organization admin or super admin
func RequireOrgAdmin() gin.HandlerFunc {
	return RequireRole(models.RoleSuperAdmin, models.RoleOrgAdmin)
}

// RequireSuperAdmin ensures the user is a super admin
func RequireSuperAdmin() gin.HandlerFunc {
	return RequireRole(models.RoleSuperAdmin)
}

// RequireOrgMember ensures the user belongs to the same organization
func RequireOrgMember() gin.HandlerFunc {
	return func(c *gin.Context) {
		userValue, exists := c.Get(ContextKeyUser)
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":   "unauthorized",
				"message": "User not found in context",
			})
			return
		}

		user, ok := userValue.(*models.User)
		if !ok {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
				"error":   "internal_error",
				"message": "Failed to get user from context",
			})
			return
		}

		// Super admins can access any organization
		if user.Role == models.RoleSuperAdmin {
			c.Next()
			return
		}

		// Check if user belongs to an organization
		if user.OrganizationID == nil {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error":   "forbidden",
				"message": "User does not belong to any organization",
			})
			return
		}

		c.Next()
	}
}

// GetCurrentUser extracts the current user from the Gin context
func GetCurrentUser(c *gin.Context) (*models.User, bool) {
	userValue, exists := c.Get(ContextKeyUser)
	if !exists {
		return nil, false
	}
	user, ok := userValue.(*models.User)
	return user, ok
}

// GetCurrentUserID extracts the current user ID from the Gin context
func GetCurrentUserID(c *gin.Context) (uuid.UUID, bool) {
	userIDValue, exists := c.Get(ContextKeyUserID)
	if !exists {
		return uuid.Nil, false
	}
	userID, ok := userIDValue.(uuid.UUID)
	return userID, ok
}

// GetCurrentOrgID extracts the current organization ID from the Gin context
func GetCurrentOrgID(c *gin.Context) (uuid.UUID, bool) {
	orgIDValue, exists := c.Get(ContextKeyOrgID)
	if !exists {
		return uuid.Nil, false
	}
	orgID, ok := orgIDValue.(uuid.UUID)
	return orgID, ok
}

// GetSessionID extracts the current session ID from the Gin context
func GetSessionID(c *gin.Context) (uuid.UUID, bool) {
	sessionIDValue, exists := c.Get(ContextKeySessionID)
	if !exists {
		return uuid.Nil, false
	}
	sessionID, ok := sessionIDValue.(uuid.UUID)
	return sessionID, ok
}
