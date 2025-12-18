package services

import (
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	"secureview/internal/config"
	"secureview/internal/models"
	"secureview/internal/utils"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

var (
	ErrDocumentNotFound      = errors.New("document not found")
	ErrAccessDenied          = errors.New("access denied")
	ErrInvalidFileType       = errors.New("invalid file type")
	ErrFileTooLarge          = errors.New("file too large")
	ErrAccessExpired         = errors.New("access has expired")
	ErrOneTimeAccessUsed     = errors.New("one-time access has been used")
	ErrAccessAlreadyGranted  = errors.New("access already granted")
)

// DocumentService handles document-related business logic
type DocumentService struct {
	db           *gorm.DB
	cfg          *config.Config
	auditService *AuditService
}

// NewDocumentService creates a new DocumentService
func NewDocumentService(db *gorm.DB, cfg *config.Config, auditService *AuditService) *DocumentService {
	return &DocumentService{
		db:           db,
		cfg:          cfg,
		auditService: auditService,
	}
}

// UploadDocumentInput represents the input for uploading a document
type UploadDocumentInput struct {
	Title       string                `form:"title" binding:"required"`
	Description string                `form:"description"`
	File        *multipart.FileHeader `form:"file" binding:"required"`
}

// UploadDocument handles document upload
func (s *DocumentService) UploadDocument(input UploadDocumentInput, orgID uuid.UUID, userID uuid.UUID) (*models.Document, error) {
	// Validate file type
	ext := strings.ToLower(filepath.Ext(input.File.Filename))
	if !utils.IsAllowedFileType(ext) {
		return nil, ErrInvalidFileType
	}

	// Check file size (100MB limit)
	maxSize := int64(100 * 1024 * 1024)
	if input.File.Size > maxSize {
		return nil, ErrFileTooLarge
	}

	// Generate storage path
	storagePath := filepath.Join(s.cfg.Storage.LocalPath, orgID.String(), uuid.New().String()+ext)

	// Ensure directory exists
	if err := os.MkdirAll(filepath.Dir(storagePath), 0755); err != nil {
		return nil, fmt.Errorf("failed to create storage directory: %w", err)
	}

	// Open uploaded file
	src, err := input.File.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open uploaded file: %w", err)
	}
	defer src.Close()

	// Create destination file
	dst, err := os.Create(storagePath)
	if err != nil {
		return nil, fmt.Errorf("failed to create destination file: %w", err)
	}
	defer dst.Close()

	// Copy file
	if _, err := io.Copy(dst, src); err != nil {
		os.Remove(storagePath)
		return nil, fmt.Errorf("failed to save file: %w", err)
	}

	// Determine file type
	fileType := strings.TrimPrefix(ext, ".")

	// Create document record
	doc := &models.Document{
		OrganizationID:   orgID,
		UploadedBy:       userID,
		Title:            input.Title,
		Description:      input.Description,
		OriginalFilename: input.File.Filename,
		FileType:         fileType,
		FileSize:         input.File.Size,
		StoragePath:      storagePath,
		IsActive:         true,
	}

	if err := s.db.Create(doc).Error; err != nil {
		os.Remove(storagePath)
		return nil, fmt.Errorf("failed to create document record: %w", err)
	}

	// Log the upload
	s.auditService.LogEvent(models.EventDocumentUploaded, &doc.ID, &userID, &orgID, nil)

	return doc, nil
}

// ListDocumentsOptions contains options for listing documents
type ListDocumentsOptions struct {
	OrganizationID uuid.UUID
	UserID         uuid.UUID
	UploadedByMe   bool
	SharedWithMe   bool
	Search         string
	Page           int
	PageSize       int
}

// ListDocumentsResult contains the result of listing documents
type ListDocumentsResult struct {
	Documents  []models.Document `json:"documents"`
	Total      int64             `json:"total"`
	Page       int               `json:"page"`
	PageSize   int               `json:"page_size"`
	TotalPages int               `json:"total_pages"`
}

// ListDocuments returns a paginated list of documents
func (s *DocumentService) ListDocuments(opts ListDocumentsOptions) (*ListDocumentsResult, error) {
	if opts.Page < 1 {
		opts.Page = 1
	}
	if opts.PageSize < 1 || opts.PageSize > 100 {
		opts.PageSize = 20
	}

	var documents []models.Document
	var total int64

	query := s.db.Model(&models.Document{}).Where("organization_id = ? AND is_active = ?", opts.OrganizationID, true)

	if opts.UploadedByMe {
		query = query.Where("uploaded_by = ?", opts.UserID)
	} else if opts.SharedWithMe {
		// Documents shared with the user (not uploaded by them)
		subQuery := s.db.Model(&models.DocumentAccess{}).
			Select("document_id").
			Where("user_id = ?", opts.UserID)
		query = query.Where("uploaded_by != ? AND id IN (?)", opts.UserID, subQuery)
	}

	if opts.Search != "" {
		search := "%" + opts.Search + "%"
		query = query.Where("title ILIKE ? OR description ILIKE ?", search, search)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, fmt.Errorf("failed to count documents: %w", err)
	}

	offset := (opts.Page - 1) * opts.PageSize
	if err := query.Preload("Uploader").Offset(offset).Limit(opts.PageSize).Order("created_at DESC").Find(&documents).Error; err != nil {
		return nil, fmt.Errorf("failed to list documents: %w", err)
	}

	totalPages := int(total) / opts.PageSize
	if int(total)%opts.PageSize > 0 {
		totalPages++
	}

	return &ListDocumentsResult{
		Documents:  documents,
		Total:      total,
		Page:       opts.Page,
		PageSize:   opts.PageSize,
		TotalPages: totalPages,
	}, nil
}

// GetDocument retrieves a document by ID
func (s *DocumentService) GetDocument(docID uuid.UUID, orgID uuid.UUID) (*models.Document, error) {
	var doc models.Document
	if err := s.db.Preload("Uploader").Preload("AccessList").Where("id = ? AND organization_id = ? AND is_active = ?", docID, orgID, true).First(&doc).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrDocumentNotFound
		}
		return nil, fmt.Errorf("failed to get document: %w", err)
	}
	return &doc, nil
}

// UpdateDocumentInput represents the input for updating a document
type UpdateDocumentInput struct {
	Title       string `json:"title"`
	Description string `json:"description"`
}

// UpdateDocument updates a document's metadata
func (s *DocumentService) UpdateDocument(docID uuid.UUID, userID uuid.UUID, orgID uuid.UUID, input UpdateDocumentInput) (*models.Document, error) {
	var doc models.Document
	if err := s.db.Where("id = ? AND organization_id = ? AND is_active = ?", docID, orgID, true).First(&doc).Error; err != nil {
		return nil, ErrDocumentNotFound
	}

	// Check ownership
	if doc.UploadedBy != userID {
		return nil, ErrAccessDenied
	}

	updates := make(map[string]interface{})
	if input.Title != "" {
		updates["title"] = input.Title
	}
	if input.Description != "" {
		updates["description"] = input.Description
	}

	if len(updates) > 0 {
		if err := s.db.Model(&doc).Updates(updates).Error; err != nil {
			return nil, fmt.Errorf("failed to update document: %w", err)
		}
	}

	return &doc, nil
}

// DeleteDocument soft-deletes a document
func (s *DocumentService) DeleteDocument(docID uuid.UUID, userID uuid.UUID, orgID uuid.UUID) error {
	var doc models.Document
	if err := s.db.Where("id = ? AND organization_id = ? AND is_active = ?", docID, orgID, true).First(&doc).Error; err != nil {
		return ErrDocumentNotFound
	}

	// Check ownership
	if doc.UploadedBy != userID {
		return ErrAccessDenied
	}

	// Soft delete
	doc.IsActive = false
	if err := s.db.Save(&doc).Error; err != nil {
		return fmt.Errorf("failed to delete document: %w", err)
	}

	// Log deletion
	s.auditService.LogEvent(models.EventDocumentDeleted, &docID, &userID, &orgID, nil)

	return nil
}

// GrantAccessInput represents the input for granting document access
type GrantAccessInput struct {
	UserID      *uuid.UUID          `json:"user_id"`
	GroupID     *uuid.UUID          `json:"group_id"`
	RoleAccess  string              `json:"role_access"` // all_managers, all_members, entire_org
	AccessLevel models.AccessLevel  `json:"access_level"`
	ExpiresAt   *time.Time          `json:"expires_at"`
	IsOneTime   bool                `json:"is_one_time"`
}

// GrantAccess grants access to a document
func (s *DocumentService) GrantAccess(docID uuid.UUID, userID uuid.UUID, orgID uuid.UUID, input GrantAccessInput) (*models.DocumentAccess, error) {
	var doc models.Document
	if err := s.db.Where("id = ? AND organization_id = ? AND is_active = ?", docID, orgID, true).First(&doc).Error; err != nil {
		return nil, ErrDocumentNotFound
	}

	// Check ownership
	if doc.UploadedBy != userID {
		return nil, ErrAccessDenied
	}

	// Validate input
	if input.UserID == nil && input.GroupID == nil && input.RoleAccess == "" {
		return nil, errors.New("must specify user_id, group_id, or role_access")
	}

	// Check if access already exists
	existingQuery := s.db.Model(&models.DocumentAccess{}).Where("document_id = ?", docID)
	if input.UserID != nil {
		existingQuery = existingQuery.Where("user_id = ?", *input.UserID)
	}
	if input.GroupID != nil {
		existingQuery = existingQuery.Where("group_id = ?", *input.GroupID)
	}
	if input.RoleAccess != "" {
		existingQuery = existingQuery.Where("role_access = ?", input.RoleAccess)
	}

	var existingCount int64
	existingQuery.Count(&existingCount)
	if existingCount > 0 {
		return nil, ErrAccessAlreadyGranted
	}

	access := &models.DocumentAccess{
		DocumentID:  docID,
		UserID:      input.UserID,
		GroupID:     input.GroupID,
		RoleAccess:  input.RoleAccess,
		GrantedBy:   userID,
		AccessLevel: input.AccessLevel,
		ExpiresAt:   input.ExpiresAt,
		IsOneTime:   input.IsOneTime,
	}

	if err := s.db.Create(access).Error; err != nil {
		return nil, fmt.Errorf("failed to grant access: %w", err)
	}

	// Log access grant
	s.auditService.LogEvent(models.EventPermissionGranted, &docID, &userID, &orgID, models.JSONB{
		"target_user_id":  input.UserID,
		"target_group_id": input.GroupID,
		"role_access":     input.RoleAccess,
	})

	return access, nil
}

// RevokeAccess revokes document access
func (s *DocumentService) RevokeAccess(docID uuid.UUID, accessID uuid.UUID, userID uuid.UUID, orgID uuid.UUID) error {
	var doc models.Document
	if err := s.db.Where("id = ? AND organization_id = ? AND is_active = ?", docID, orgID, true).First(&doc).Error; err != nil {
		return ErrDocumentNotFound
	}

	// Check ownership
	if doc.UploadedBy != userID {
		return ErrAccessDenied
	}

	result := s.db.Where("id = ? AND document_id = ?", accessID, docID).Delete(&models.DocumentAccess{})
	if result.Error != nil {
		return fmt.Errorf("failed to revoke access: %w", result.Error)
	}

	// Log access revocation
	s.auditService.LogEvent(models.EventPermissionRevoked, &docID, &userID, &orgID, models.JSONB{
		"access_id": accessID,
	})

	return nil
}

// GetDocumentAccessList returns the access list for a document
func (s *DocumentService) GetDocumentAccessList(docID uuid.UUID, userID uuid.UUID, orgID uuid.UUID) ([]models.DocumentAccess, error) {
	var doc models.Document
	if err := s.db.Where("id = ? AND organization_id = ? AND is_active = ?", docID, orgID, true).First(&doc).Error; err != nil {
		return nil, ErrDocumentNotFound
	}

	// Check ownership
	if doc.UploadedBy != userID {
		return nil, ErrAccessDenied
	}

	var accessList []models.DocumentAccess
	if err := s.db.Preload("User").Preload("Group").Where("document_id = ?", docID).Find(&accessList).Error; err != nil {
		return nil, fmt.Errorf("failed to get access list: %w", err)
	}

	return accessList, nil
}

// CheckAccess verifies if a user has access to a document
func (s *DocumentService) CheckAccess(docID uuid.UUID, userID uuid.UUID, orgID uuid.UUID) (*models.DocumentAccess, error) {
	var doc models.Document
	if err := s.db.Where("id = ? AND organization_id = ? AND is_active = ?", docID, orgID, true).First(&doc).Error; err != nil {
		return nil, ErrDocumentNotFound
	}

	// Owner always has access
	if doc.UploadedBy == userID {
		return &models.DocumentAccess{
			DocumentID:  docID,
			UserID:      &userID,
			AccessLevel: models.AccessLevelReshare,
		}, nil
	}

	// Check direct user access
	var access models.DocumentAccess
	if err := s.db.Where("document_id = ? AND user_id = ?", docID, userID).First(&access).Error; err == nil {
		if !access.IsValid() {
			if access.IsExpired() {
				return nil, ErrAccessExpired
			}
			if access.IsOneTime && access.OneTimeUsed {
				return nil, ErrOneTimeAccessUsed
			}
		}
		return &access, nil
	}

	// Check group access
	var groupIDs []uuid.UUID
	s.db.Model(&models.GroupMember{}).Where("user_id = ?", userID).Pluck("group_id", &groupIDs)
	if len(groupIDs) > 0 {
		if err := s.db.Where("document_id = ? AND group_id IN ?", docID, groupIDs).First(&access).Error; err == nil {
			if access.IsValid() {
				return &access, nil
			}
		}
	}

	// Check role-based access
	var user models.User
	if err := s.db.Where("id = ?", userID).First(&user).Error; err != nil {
		return nil, ErrAccessDenied
	}

	roleAccess := []string{"entire_org"}
	if user.Role == models.RoleManager {
		roleAccess = append(roleAccess, "all_managers")
	}
	if user.Role == models.RoleMember || user.Role == models.RoleManager {
		roleAccess = append(roleAccess, "all_members")
	}

	if err := s.db.Where("document_id = ? AND role_access IN ?", docID, roleAccess).First(&access).Error; err == nil {
		if access.IsValid() {
			return &access, nil
		}
	}

	return nil, ErrAccessDenied
}

// GetDocumentLogs returns audit logs for a document
func (s *DocumentService) GetDocumentLogs(docID uuid.UUID, userID uuid.UUID, orgID uuid.UUID, page, pageSize int) ([]models.AuditLog, int64, error) {
	var doc models.Document
	if err := s.db.Where("id = ? AND organization_id = ? AND is_active = ?", docID, orgID, true).First(&doc).Error; err != nil {
		return nil, 0, ErrDocumentNotFound
	}

	// Check ownership
	if doc.UploadedBy != userID {
		return nil, 0, ErrAccessDenied
	}

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	var total int64
	s.db.Model(&models.AuditLog{}).Where("document_id = ?", docID).Count(&total)

	var logs []models.AuditLog
	offset := (page - 1) * pageSize
	if err := s.db.Preload("User").Where("document_id = ?", docID).Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&logs).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to get logs: %w", err)
	}

	return logs, total, nil
}
