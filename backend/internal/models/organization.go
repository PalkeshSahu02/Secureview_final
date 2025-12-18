// Package models defines the database models using GORM.
// These models represent the core entities in the SecureView system.
package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Organization represents a tenant in the multi-tenant system.
// Each organization has its own users, documents, and groups.
type Organization struct {
	ID        uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Name      string         `gorm:"size:255;not null" json:"name"`
	Slug      string         `gorm:"size:100;uniqueIndex;not null" json:"slug"`
	LogoURL   string         `gorm:"size:500" json:"logo_url,omitempty"`
	IsActive  bool           `gorm:"default:true" json:"is_active"`
	Settings  JSONB          `gorm:"type:jsonb;default:'{}'" json:"settings"`
	CreatedAt time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	Users     []User     `gorm:"foreignKey:OrganizationID" json:"users,omitempty"`
	Documents []Document `gorm:"foreignKey:OrganizationID" json:"documents,omitempty"`
	Groups    []Group    `gorm:"foreignKey:OrganizationID" json:"groups,omitempty"`
}

// BeforeCreate generates a UUID if not set
func (o *Organization) BeforeCreate(tx *gorm.DB) error {
	if o.ID == uuid.Nil {
		o.ID = uuid.New()
	}
	return nil
}

// TableName returns the table name for Organization
func (Organization) TableName() string {
	return "organizations"
}

// OrganizationSettings holds configurable settings for an organization
type OrganizationSettings struct {
	MaxStorageBytes     int64  `json:"max_storage_bytes"`
	MaxDocumentSizeMB   int    `json:"max_document_size_mb"`
	DefaultDocumentView string `json:"default_document_view"`
	WatermarkEnabled    bool   `json:"watermark_enabled"`
	AllowExternalSharing bool  `json:"allow_external_sharing"`
}

// GetSettings parses and returns organization settings
func (o *Organization) GetSettings() OrganizationSettings {
	settings := OrganizationSettings{
		MaxStorageBytes:     10 * 1024 * 1024 * 1024, // 10GB default
		MaxDocumentSizeMB:   100,
		DefaultDocumentView: "continuous",
		WatermarkEnabled:    true,
		AllowExternalSharing: false,
	}
	// Parse from JSONB if available
	if o.Settings != nil {
		// Settings would be parsed here
	}
	return settings
}
