package handlers

import (
	"net/http"

	"secureview/internal/middleware"
	"secureview/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// DocumentHandler handles document-related requests
type DocumentHandler struct {
	docService *services.DocumentService
}

// NewDocumentHandler creates a new DocumentHandler
func NewDocumentHandler(docService *services.DocumentService) *DocumentHandler {
	return &DocumentHandler{docService: docService}
}

// UploadDocument handles document upload
// POST /api/v1/documents
func (h *DocumentHandler) UploadDocument(c *gin.Context) {
	orgID, ok := middleware.GetCurrentOrgID(c)
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "forbidden",
			"message": "Organization context required",
		})
		return
	}

	userID, _ := middleware.GetCurrentUserID(c)

	var input services.UploadDocumentInput
	if err := c.ShouldBind(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_error",
			"message": err.Error(),
		})
		return
	}

	doc, err := h.docService.UploadDocument(input, orgID, userID)
	if err != nil {
		status := http.StatusInternalServerError
		switch err {
		case services.ErrInvalidFileType:
			status = http.StatusBadRequest
		case services.ErrFileTooLarge:
			status = http.StatusRequestEntityTooLarge
		}
		c.JSON(status, gin.H{
			"error":   "upload_failed",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":  "Document uploaded successfully",
		"document": doc,
	})
}

// ListDocuments returns a paginated list of documents
// GET /api/v1/documents
func (h *DocumentHandler) ListDocuments(c *gin.Context) {
	orgID, ok := middleware.GetCurrentOrgID(c)
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "forbidden",
			"message": "Organization context required",
		})
		return
	}

	userID, _ := middleware.GetCurrentUserID(c)

	var query struct {
		UploadedByMe bool   `form:"uploaded_by_me"`
		SharedWithMe bool   `form:"shared_with_me"`
		Search       string `form:"search"`
		Page         int    `form:"page,default=1"`
		PageSize     int    `form:"page_size,default=20"`
	}
	if err := c.ShouldBindQuery(&query); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_error",
			"message": err.Error(),
		})
		return
	}

	opts := services.ListDocumentsOptions{
		OrganizationID: orgID,
		UserID:         userID,
		UploadedByMe:   query.UploadedByMe,
		SharedWithMe:   query.SharedWithMe,
		Search:         query.Search,
		Page:           query.Page,
		PageSize:       query.PageSize,
	}

	result, err := h.docService.ListDocuments(opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "list_failed",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, result)
}

// GetDocument returns a specific document's details
// GET /api/v1/documents/:id
func (h *DocumentHandler) GetDocument(c *gin.Context) {
	orgID, ok := middleware.GetCurrentOrgID(c)
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "forbidden",
			"message": "Organization context required",
		})
		return
	}

	docID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_error",
			"message": "Invalid document ID",
		})
		return
	}

	doc, err := h.docService.GetDocument(docID, orgID)
	if err != nil {
		status := http.StatusInternalServerError
		if err == services.ErrDocumentNotFound {
			status = http.StatusNotFound
		}
		c.JSON(status, gin.H{
			"error":   "get_failed",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"document": doc,
	})
}

// UpdateDocument updates a document's metadata
// PUT /api/v1/documents/:id
func (h *DocumentHandler) UpdateDocument(c *gin.Context) {
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

	var input services.UpdateDocumentInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_error",
			"message": err.Error(),
		})
		return
	}

	doc, err := h.docService.UpdateDocument(docID, userID, orgID, input)
	if err != nil {
		status := http.StatusInternalServerError
		switch err {
		case services.ErrDocumentNotFound:
			status = http.StatusNotFound
		case services.ErrAccessDenied:
			status = http.StatusForbidden
		}
		c.JSON(status, gin.H{
			"error":   "update_failed",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "Document updated successfully",
		"document": doc,
	})
}

// DeleteDocument deletes a document
// DELETE /api/v1/documents/:id
func (h *DocumentHandler) DeleteDocument(c *gin.Context) {
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

	if err := h.docService.DeleteDocument(docID, userID, orgID); err != nil {
		status := http.StatusInternalServerError
		switch err {
		case services.ErrDocumentNotFound:
			status = http.StatusNotFound
		case services.ErrAccessDenied:
			status = http.StatusForbidden
		}
		c.JSON(status, gin.H{
			"error":   "delete_failed",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Document deleted successfully",
	})
}

// GrantAccess grants access to a document
// POST /api/v1/documents/:id/access
func (h *DocumentHandler) GrantAccess(c *gin.Context) {
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

	var input services.GrantAccessInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_error",
			"message": err.Error(),
		})
		return
	}

	access, err := h.docService.GrantAccess(docID, userID, orgID, input)
	if err != nil {
		status := http.StatusInternalServerError
		switch err {
		case services.ErrDocumentNotFound:
			status = http.StatusNotFound
		case services.ErrAccessDenied:
			status = http.StatusForbidden
		case services.ErrAccessAlreadyGranted:
			status = http.StatusConflict
		}
		c.JSON(status, gin.H{
			"error":   "grant_failed",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Access granted successfully",
		"access":  access,
	})
}

// RevokeAccess revokes access to a document
// DELETE /api/v1/documents/:id/access/:accessId
func (h *DocumentHandler) RevokeAccess(c *gin.Context) {
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

	accessID, err := uuid.Parse(c.Param("accessId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_error",
			"message": "Invalid access ID",
		})
		return
	}

	if err := h.docService.RevokeAccess(docID, accessID, userID, orgID); err != nil {
		status := http.StatusInternalServerError
		switch err {
		case services.ErrDocumentNotFound:
			status = http.StatusNotFound
		case services.ErrAccessDenied:
			status = http.StatusForbidden
		}
		c.JSON(status, gin.H{
			"error":   "revoke_failed",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Access revoked successfully",
	})
}

// GetAccessList returns the access list for a document
// GET /api/v1/documents/:id/access
func (h *DocumentHandler) GetAccessList(c *gin.Context) {
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

	accessList, err := h.docService.GetDocumentAccessList(docID, userID, orgID)
	if err != nil {
		status := http.StatusInternalServerError
		switch err {
		case services.ErrDocumentNotFound:
			status = http.StatusNotFound
		case services.ErrAccessDenied:
			status = http.StatusForbidden
		}
		c.JSON(status, gin.H{
			"error":   "get_failed",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"access_list": accessList,
	})
}

// GetDocumentLogs returns audit logs for a document
// GET /api/v1/documents/:id/logs
func (h *DocumentHandler) GetDocumentLogs(c *gin.Context) {
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

	var query struct {
		Page     int `form:"page,default=1"`
		PageSize int `form:"page_size,default=20"`
	}
	c.ShouldBindQuery(&query)

	logs, total, err := h.docService.GetDocumentLogs(docID, userID, orgID, query.Page, query.PageSize)
	if err != nil {
		status := http.StatusInternalServerError
		switch err {
		case services.ErrDocumentNotFound:
			status = http.StatusNotFound
		case services.ErrAccessDenied:
			status = http.StatusForbidden
		}
		c.JSON(status, gin.H{
			"error":   "get_failed",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"logs":  logs,
		"total": total,
		"page":  query.Page,
	})
}
