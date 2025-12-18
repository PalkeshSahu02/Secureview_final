package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// AuditLog records all significant events in the system.
// Used for security monitoring and compliance tracking.
type AuditLog struct {
	ID                    uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	DocumentID            *uuid.UUID `gorm:"type:uuid;index" json:"document_id,omitempty"`
	UserID                *uuid.UUID `gorm:"type:uuid;index" json:"user_id,omitempty"`
	OrganizationID        *uuid.UUID `gorm:"type:uuid;index" json:"organization_id,omitempty"`
	EventType             EventType  `gorm:"size:50;not null;index" json:"event_type"`
	IPAddress             string     `gorm:"size:45" json:"ip_address,omitempty"`
	City                  string     `gorm:"size:100" json:"city,omitempty"`
	Country               string     `gorm:"size:100" json:"country,omitempty"`
	Browser               string     `gorm:"size:100" json:"browser,omitempty"`
	OS                    string     `gorm:"size:100" json:"os,omitempty"`
	DeviceType            string     `gorm:"size:50" json:"device_type,omitempty"`
	SessionDurationSeconds int       `json:"session_duration_seconds,omitempty"`
	Metadata              JSONB      `gorm:"type:jsonb;default:'{}'" json:"metadata,omitempty"`
	CreatedAt             time.Time  `gorm:"autoCreateTime;index" json:"created_at"`

	// Relations (for queries, not enforced by FK)
	Document     *Document     `gorm:"foreignKey:DocumentID" json:"document,omitempty"`
	User         *User         `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Organization *Organization `gorm:"foreignKey:OrganizationID" json:"organization,omitempty"`
}

// BeforeCreate generates a UUID if not set
func (al *AuditLog) BeforeCreate(tx *gorm.DB) error {
	if al.ID == uuid.Nil {
		al.ID = uuid.New()
	}
	return nil
}

// TableName returns the table name for AuditLog
func (AuditLog) TableName() string {
	return "audit_logs"
}

// Notification represents an in-app notification for a user
type Notification struct {
	ID                uuid.UUID        `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	UserID            uuid.UUID        `gorm:"type:uuid;not null;index" json:"user_id"`
	Type              NotificationType `gorm:"size:50;not null" json:"type"`
	Title             string           `gorm:"size:255;not null" json:"title"`
	Message           string           `gorm:"type:text" json:"message,omitempty"`
	RelatedDocumentID *uuid.UUID       `gorm:"type:uuid" json:"related_document_id,omitempty"`
	RelatedUserID     *uuid.UUID       `gorm:"type:uuid" json:"related_user_id,omitempty"`
	IsRead            bool             `gorm:"default:false;index" json:"is_read"`
	ReadAt            *time.Time       `json:"read_at,omitempty"`
	CreatedAt         time.Time        `gorm:"autoCreateTime" json:"created_at"`

	// Relations
	User            *User     `gorm:"foreignKey:UserID" json:"-"`
	RelatedDocument *Document `gorm:"foreignKey:RelatedDocumentID" json:"related_document,omitempty"`
	RelatedUser     *User     `gorm:"foreignKey:RelatedUserID" json:"related_user,omitempty"`
}

// BeforeCreate generates a UUID if not set
func (n *Notification) BeforeCreate(tx *gorm.DB) error {
	if n.ID == uuid.Nil {
		n.ID = uuid.New()
	}
	return nil
}

// TableName returns the table name for Notification
func (Notification) TableName() string {
	return "notifications"
}

// MarkAsRead marks the notification as read
func (n *Notification) MarkAsRead() {
	n.IsRead = true
	now := time.Now()
	n.ReadAt = &now
}
