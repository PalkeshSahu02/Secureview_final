package handlers

import (
	"net/http"
	"strconv"

	"secureview/internal/middleware"
	"secureview/internal/models"
	"secureview/internal/services"
	"secureview/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// ViewerHandler handles secure document viewing requests
type ViewerHandler struct {
	viewerService *services.ViewerService
}

// NewViewerHandler creates a new ViewerHandler
func NewViewerHandler(viewerService *services.ViewerService) *ViewerHandler {
	return &ViewerHandler{viewerService: viewerService}
}

// InitViewingSession initializes a secure viewing session
// POST /api/v1/viewer/:id/init
func (h *ViewerHandler) InitViewingSession(c *gin.Context) {
	orgID, ok := middleware.GetCurrentOrgID(c)
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "forbidden",
			"message": "Organization context required",
		})
		return
	}

	userID, _ := middleware.GetCurrentUserID(c)

	docID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_error",
			"message": "Invalid document ID",
		})
		return
	}

	// Get client information
	clientIP := utils.GetClientIPFromGin(c.ClientIP(), c.Request.Header)
	browser := c.GetHeader("User-Agent")

	input := services.InitViewingSessionInput{
		DocumentID: docID,
		UserID:     userID,
		OrgID:      orgID,
		IPAddress:  clientIP,
		Browser:    browser,
		OS:         extractOS(browser),
		DeviceType: extractDeviceType(browser),
	}

	result, err := h.viewerService.InitViewingSession(input)
	if err != nil {
		status := http.StatusInternalServerError
		switch err {
		case services.ErrDocumentNotFound:
			status = http.StatusNotFound
		case services.ErrAccessDenied, services.ErrAccessExpired, services.ErrOneTimeAccessUsed:
			status = http.StatusForbidden
		case services.ErrConcurrentSession:
			status = http.StatusConflict
		}
		c.JSON(status, gin.H{
			"error":   "init_failed",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"session_token":  result.SessionToken,
		"document":       result.Document,
		"watermark_data": result.WatermarkData,
		"page_count":     result.PageCount,
	})
}

// GetPage returns a specific page of the document
// GET /api/v1/viewer/:id/page/:pageNum
func (h *ViewerHandler) GetPage(c *gin.Context) {
	userID, ok := middleware.GetCurrentUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "unauthorized",
			"message": "User not authenticated",
		})
		return
	}

	sessionToken := c.GetHeader("X-Viewing-Session")
	if sessionToken == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_error",
			"message": "Viewing session token required",
		})
		return
	}

	pageNum, err := strconv.Atoi(c.Param("pageNum"))
	if err != nil || pageNum < 1 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_error",
			"message": "Invalid page number",
		})
		return
	}

	content, fileType, err := h.viewerService.GetDocumentPage(sessionToken, userID, pageNum)
	if err != nil {
		status := http.StatusInternalServerError
		switch err {
		case services.ErrSessionInvalid, services.ErrSessionExpired:
			status = http.StatusUnauthorized
		case services.ErrDocumentNotFound:
			status = http.StatusNotFound
		}
		c.JSON(status, gin.H{
			"error":   "get_page_failed",
			"message": err.Error(),
		})
		return
	}

	contentType := utils.GetMimeType(fileType)
	c.Header("Content-Type", contentType)
	c.Header("Cache-Control", "no-store, no-cache, must-revalidate, private")
	c.Header("Pragma", "no-cache")
	c.Header("Expires", "0")
	c.Data(http.StatusOK, contentType, content)
}

// Heartbeat keeps the viewing session alive
// POST /api/v1/viewer/:id/heartbeat
func (h *ViewerHandler) Heartbeat(c *gin.Context) {
	userID, ok := middleware.GetCurrentUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "unauthorized",
			"message": "User not authenticated",
		})
		return
	}

	sessionToken := c.GetHeader("X-Viewing-Session")
	if sessionToken == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_error",
			"message": "Viewing session token required",
		})
		return
	}

	var input struct {
		PageNumber int `json:"page_number"`
	}
	c.ShouldBindJSON(&input)

	if err := h.viewerService.Heartbeat(sessionToken, userID, input.PageNumber); err != nil {
		status := http.StatusInternalServerError
		switch err {
		case services.ErrSessionInvalid, services.ErrSessionExpired:
			status = http.StatusUnauthorized
		}
		c.JSON(status, gin.H{
			"error":   "heartbeat_failed",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Heartbeat received",
	})
}

// EndSession ends the viewing session
// POST /api/v1/viewer/:id/close
func (h *ViewerHandler) EndSession(c *gin.Context) {
	userID, ok := middleware.GetCurrentUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "unauthorized",
			"message": "User not authenticated",
		})
		return
	}

	sessionToken := c.GetHeader("X-Viewing-Session")
	if sessionToken == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_error",
			"message": "Viewing session token required",
		})
		return
	}

	if err := h.viewerService.EndViewingSession(sessionToken, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "close_failed",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Session closed",
	})
}

// ReportSecurityEvent reports a security event
// POST /api/v1/viewer/:id/security-event
func (h *ViewerHandler) ReportSecurityEvent(c *gin.Context) {
	userID, ok := middleware.GetCurrentUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "unauthorized",
			"message": "User not authenticated",
		})
		return
	}

	sessionToken := c.GetHeader("X-Viewing-Session")
	if sessionToken == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_error",
			"message": "Viewing session token required",
		})
		return
	}

	var input struct {
		EventType string                 `json:"event_type" binding:"required"`
		Details   map[string]interface{} `json:"details"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_error",
			"message": err.Error(),
		})
		return
	}

	eventType := models.EventType(input.EventType)
	metadata := models.JSONB(input.Details)

	if err := h.viewerService.ReportSecurityEvent(sessionToken, userID, eventType, metadata); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "report_failed",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Security event reported",
	})
}

// Helper functions

func extractOS(userAgent string) string {
	// Simple OS detection from User-Agent
	switch {
	case contains(userAgent, "Windows"):
		return "Windows"
	case contains(userAgent, "Mac OS"):
		return "macOS"
	case contains(userAgent, "Linux"):
		return "Linux"
	case contains(userAgent, "Android"):
		return "Android"
	case contains(userAgent, "iOS"), contains(userAgent, "iPhone"), contains(userAgent, "iPad"):
		return "iOS"
	default:
		return "Unknown"
	}
}

func extractDeviceType(userAgent string) string {
	switch {
	case contains(userAgent, "Mobile"), contains(userAgent, "Android"), contains(userAgent, "iPhone"):
		return "Mobile"
	case contains(userAgent, "Tablet"), contains(userAgent, "iPad"):
		return "Tablet"
	default:
		return "Desktop"
	}
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsHelper(s, substr))
}

func containsHelper(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
