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
