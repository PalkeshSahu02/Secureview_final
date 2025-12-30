package handlers

import (
	"net/http"

	"secureview/internal/middleware"
	"secureview/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// ActivityHandler handles activity log requests
type ActivityHandler struct {
	auditService *services.AuditService
}

// NewActivityHandler creates a new ActivityHandler
func NewActivityHandler(auditService *services.AuditService) *ActivityHandler {
	return &ActivityHandler{auditService: auditService}
}

// ListActivity returns paginated activity logs for the organization
// GET /api/v1/activity
func (h *ActivityHandler) ListActivity(c *gin.Context) {
	orgID, ok := middleware.GetCurrentOrgID(c)
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "forbidden",
			"message": "Organization context required",
		})
		return
	}

	var query struct {
		Page       int    `form:"page,default=1"`
		PageSize   int    `form:"page_size,default=20"`
		EventType  string `form:"event_type"`
		DocumentID string `form:"document_id"`
		UserID     string `form:"user_id"`
		StartDate  string `form:"start_date"`
		EndDate    string `form:"end_date"`
	}
	if err := c.ShouldBindQuery(&query); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_error",
			"message": err.Error(),
		})
		return
	}

	filter := services.ActivityLogFilter{
		OrganizationID: orgID,
		EventType:      query.EventType,
		Page:           query.Page,
		PageSize:       query.PageSize,
	}

	if query.DocumentID != "" {
		docID, err := uuid.Parse(query.DocumentID)
		if err == nil {
			filter.DocumentID = &docID
		}
	}

	if query.UserID != "" {
		userID, err := uuid.Parse(query.UserID)
		if err == nil {
			filter.UserID = &userID
		}
	}

	if query.StartDate != "" {
		filter.StartDate = &query.StartDate
	}
	if query.EndDate != "" {
		filter.EndDate = &query.EndDate
	}

	result, err := h.auditService.GetFilteredLogs(filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "list_failed",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, result)
}
