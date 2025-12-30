package services

import (
	"secureview/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// AuditService handles audit logging
type AuditService struct {
	db *gorm.DB
}

// NewAuditService creates a new AuditService
func NewAuditService(db *gorm.DB) *AuditService {
	return &AuditService{db: db}
}

// AuditContext contains contextual information for audit logs
type AuditContext struct {
	IPAddress  string
	City       string
	Country    string
	Browser    string
	OS         string
	DeviceType string
}

// LogEvent creates an audit log entry
func (s *AuditService) LogEvent(eventType models.EventType, documentID, userID, orgID *uuid.UUID, metadata models.JSONB) {
	log := &models.AuditLog{
		EventType:      eventType,
		DocumentID:     documentID,
		UserID:         userID,
		OrganizationID: orgID,
		Metadata:       metadata,
	}
	s.db.Create(log)
}

// LogEventWithContext creates an audit log entry with context information
func (s *AuditService) LogEventWithContext(eventType models.EventType, documentID, userID, orgID *uuid.UUID, ctx *AuditContext, metadata models.JSONB) {
	log := &models.AuditLog{
		EventType:      eventType,
		DocumentID:     documentID,
		UserID:         userID,
		OrganizationID: orgID,
		Metadata:       metadata,
	}

	if ctx != nil {
		log.IPAddress = ctx.IPAddress
		log.City = ctx.City
		log.Country = ctx.Country
		log.Browser = ctx.Browser
		log.OS = ctx.OS
		log.DeviceType = ctx.DeviceType
	}

	s.db.Create(log)
}

// GetOrganizationLogs returns audit logs for an organization
func (s *AuditService) GetOrganizationLogs(orgID uuid.UUID, page, pageSize int) ([]models.AuditLog, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	var total int64
	s.db.Model(&models.AuditLog{}).Where("organization_id = ?", orgID).Count(&total)

	var logs []models.AuditLog
	offset := (page - 1) * pageSize
	if err := s.db.Preload("User").Preload("Document").
		Where("organization_id = ?", orgID).
		Order("created_at DESC").
		Offset(offset).Limit(pageSize).
		Find(&logs).Error; err != nil {
		return nil, 0, err
	}

	return logs, total, nil
}

// GetUserActivityLogs returns activity logs for a specific user
func (s *AuditService) GetUserActivityLogs(userID uuid.UUID, page, pageSize int) ([]models.AuditLog, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	var total int64
	s.db.Model(&models.AuditLog{}).Where("user_id = ?", userID).Count(&total)

	var logs []models.AuditLog
	offset := (page - 1) * pageSize
	if err := s.db.Preload("Document").
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Offset(offset).Limit(pageSize).
		Find(&logs).Error; err != nil {
		return nil, 0, err
	}

	return logs, total, nil
}

// ActivityLogFilter contains filter options for activity logs
type ActivityLogFilter struct {
	OrganizationID uuid.UUID
	EventType      string
	DocumentID     *uuid.UUID
	UserID         *uuid.UUID
	StartDate      *string
	EndDate        *string
	Page           int
	PageSize       int
}

// ActivityLogResult contains the paginated activity log response
type ActivityLogResult struct {
	Logs       []models.AuditLog `json:"logs"`
	Total      int64             `json:"total"`
	Page       int               `json:"page"`
	PageSize   int               `json:"page_size"`
	TotalPages int               `json:"total_pages"`
}

// GetFilteredLogs returns filtered and paginated activity logs
func (s *AuditService) GetFilteredLogs(filter ActivityLogFilter) (*ActivityLogResult, error) {
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.PageSize < 1 || filter.PageSize > 100 {
		filter.PageSize = 20
	}

	query := s.db.Model(&models.AuditLog{}).Where("organization_id = ?", filter.OrganizationID)

	// Apply filters
	if filter.EventType != "" {
		query = query.Where("event_type = ?", filter.EventType)
	}
	if filter.DocumentID != nil {
		query = query.Where("document_id = ?", *filter.DocumentID)
	}
	if filter.UserID != nil {
		query = query.Where("user_id = ?", *filter.UserID)
	}
	if filter.StartDate != nil && *filter.StartDate != "" {
		query = query.Where("created_at >= ?", *filter.StartDate)
	}
	if filter.EndDate != nil && *filter.EndDate != "" {
		query = query.Where("created_at <= ?", *filter.EndDate)
	}

	// Count total matching records
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	// Fetch paginated results
	var logs []models.AuditLog
	offset := (filter.Page - 1) * filter.PageSize
	if err := s.db.Preload("User").Preload("Document").
		Where("organization_id = ?", filter.OrganizationID).
		Scopes(func(db *gorm.DB) *gorm.DB {
			if filter.EventType != "" {
				db = db.Where("event_type = ?", filter.EventType)
			}
			if filter.DocumentID != nil {
				db = db.Where("document_id = ?", *filter.DocumentID)
			}
			if filter.UserID != nil {
				db = db.Where("user_id = ?", *filter.UserID)
			}
			if filter.StartDate != nil && *filter.StartDate != "" {
				db = db.Where("created_at >= ?", *filter.StartDate)
			}
			if filter.EndDate != nil && *filter.EndDate != "" {
				db = db.Where("created_at <= ?", *filter.EndDate)
			}
			return db
		}).
		Order("created_at DESC").
		Offset(offset).Limit(filter.PageSize).
		Find(&logs).Error; err != nil {
		return nil, err
	}

	totalPages := int(total) / filter.PageSize
	if int(total)%filter.PageSize != 0 {
		totalPages++
	}

	return &ActivityLogResult{
		Logs:       logs,
		Total:      total,
		Page:       filter.Page,
		PageSize:   filter.PageSize,
		TotalPages: totalPages,
	}, nil
}
