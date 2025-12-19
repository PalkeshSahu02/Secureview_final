package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Document represents a file uploaded to the system.
// Documents are owned by users within an organization.
type Document struct {
	ID               uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	OrganizationID   uuid.UUID      `gorm:"type:uuid;not null;index" json:"organization_id"`
	UploadedBy       uuid.UUID      `gorm:"type:uuid;not null;index" json:"uploaded_by"`
	Title            string         `gorm:"size:500;not null" json:"title"`
	Description      string         `gorm:"type:text" json:"description,omitempty"`
	OriginalFilename string         `gorm:"size:500" json:"original_filename,omitempty"`
	FileType         string         `gorm:"size:50;not null" json:"file_type"`
	FileSize         int64          `gorm:"not null" json:"file_size"`
	StoragePath      string         `gorm:"size:500;not null" json:"-"`
	PageCount        int            `json:"page_count,omitempty"`
	ThumbnailPath    string         `gorm:"size:500" json:"-"`
	IsActive         bool           `gorm:"default:true" json:"is_active"`
	Settings         JSONB          `gorm:"type:jsonb;default:'{}'" json:"settings"`
	CreatedAt        time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt        time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	Organization   *Organization    `gorm:"foreignKey:OrganizationID" json:"organization,omitempty"`
	Uploader       *User            `gorm:"foreignKey:UploadedBy" json:"uploader,omitempty"`
	AccessList     []DocumentAccess `gorm:"foreignKey:DocumentID" json:"access_list,omitempty"`
	AuditLogs      []AuditLog       `gorm:"foreignKey:DocumentID" json:"-"`
	AccessRequests []AccessRequest  `gorm:"foreignKey:DocumentID" json:"-"`
}

// BeforeCreate generates a UUID if not set
func (d *Document) BeforeCreate(tx *gorm.DB) error {
	if d.ID == uuid.Nil {
		d.ID = uuid.New()
	}
	return nil
}

// TableName returns the table name for Document
func (Document) TableName() string {
	return "documents"
}

// DocumentSettings holds configurable settings for a document
type DocumentSettings struct {
	WatermarkEnabled bool   `json:"watermark_enabled"`
	AllowDownload    bool   `json:"allow_download"`
	AllowPrint       bool   `json:"allow_print"`
	MaxViewsPerUser  int    `json:"max_views_per_user"`
	ViewMode         string `json:"view_mode"` // continuous, single-page
}

// GetSettings parses and returns document settings
func (d *Document) GetSettings() DocumentSettings {
	settings := DocumentSettings{
		WatermarkEnabled: true,
		AllowDownload:    false,
		AllowPrint:       false,
		MaxViewsPerUser:  0, // unlimited
		ViewMode:         "continuous",
	}
	return settings
}

// IsOwner checks if the given user is the document owner
func (d *Document) IsOwner(userID uuid.UUID) bool {
	return d.UploadedBy == userID
}

// DocumentAccess defines access permissions for a document.
// Access can be granted to individual users, groups, or roles.
type DocumentAccess struct {
	ID           uuid.UUID    `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	DocumentID   uuid.UUID    `gorm:"type:uuid;not null;index" json:"document_id"`
	UserID       *uuid.UUID   `gorm:"type:uuid;index" json:"user_id,omitempty"`
	GroupID      *uuid.UUID   `gorm:"type:uuid;index" json:"group_id,omitempty"`
	RoleAccess   string       `gorm:"size:50" json:"role_access,omitempty"` // all_managers, all_members, entire_org
	GrantedBy    uuid.UUID    `gorm:"type:uuid;not null" json:"granted_by"`
	AccessLevel  AccessLevel  `gorm:"size:50;default:'view'" json:"access_level"`
	ExpiresAt    *time.Time   `json:"expires_at,omitempty"`
	IsOneTime    bool         `gorm:"default:false" json:"is_one_time"`
	OneTimeUsed  bool         `gorm:"default:false" json:"one_time_used"`
	OneTimeUsedAt *time.Time  `json:"one_time_used_at,omitempty"`
	CreatedAt    time.Time    `gorm:"autoCreateTime" json:"created_at"`

	// Relations
	Document *Document `gorm:"foreignKey:DocumentID" json:"-"`
	User     *User     `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Group    *Group    `gorm:"foreignKey:GroupID" json:"group,omitempty"`
	Granter  *User     `gorm:"foreignKey:GrantedBy" json:"granter,omitempty"`
}

// BeforeCreate generates a UUID if not set
func (da *DocumentAccess) BeforeCreate(tx *gorm.DB) error {
	if da.ID == uuid.Nil {
		da.ID = uuid.New()
	}
	return nil
}

// TableName returns the table name for DocumentAccess
func (DocumentAccess) TableName() string {
	return "document_access"
}

// IsExpired checks if the access has expired
func (da *DocumentAccess) IsExpired() bool {
	if da.ExpiresAt == nil {
		return false
	}
	return time.Now().After(*da.ExpiresAt)
}

// IsValid checks if the access is still valid
func (da *DocumentAccess) IsValid() bool {
	if da.IsExpired() {
		return false
	}
	if da.IsOneTime && da.OneTimeUsed {
		return false
	}
	return true
}

// MarkUsed marks one-time access as used
func (da *DocumentAccess) MarkUsed() {
	if da.IsOneTime {
		da.OneTimeUsed = true
		now := time.Now()
		da.OneTimeUsedAt = &now
	}
}

// AccessRequest represents a request to access a document
type AccessRequest struct {
	ID           uuid.UUID            `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	DocumentID   uuid.UUID            `gorm:"type:uuid;not null;index" json:"document_id"`
	RequestedBy  uuid.UUID            `gorm:"type:uuid;not null;index" json:"requested_by"`
	Status       AccessRequestStatus  `gorm:"size:50;default:'pending'" json:"status"`
	Message      string               `gorm:"type:text" json:"message,omitempty"`
	RespondedBy  *uuid.UUID           `gorm:"type:uuid" json:"responded_by,omitempty"`
	RespondedAt  *time.Time           `json:"responded_at,omitempty"`
	ResponseNote string               `gorm:"type:text" json:"response_note,omitempty"`
	CreatedAt    time.Time            `gorm:"autoCreateTime" json:"created_at"`

	// Relations
	Document  *Document `gorm:"foreignKey:DocumentID" json:"document,omitempty"`
	Requester *User     `gorm:"foreignKey:RequestedBy" json:"requester,omitempty"`
	Responder *User     `gorm:"foreignKey:RespondedBy" json:"responder,omitempty"`
}

// BeforeCreate generates a UUID if not set
func (ar *AccessRequest) BeforeCreate(tx *gorm.DB) error {
	if ar.ID == uuid.Nil {
		ar.ID = uuid.New()
	}
	return nil
}

// TableName returns the table name for AccessRequest
func (AccessRequest) TableName() string {
	return "access_requests"
}

// IsPending checks if the request is still pending
func (ar *AccessRequest) IsPending() bool {
	return ar.Status == AccessRequestPending
}

// ViewingSession tracks active document viewing sessions
type ViewingSession struct {
	ID              uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	DocumentID      uuid.UUID  `gorm:"type:uuid;not null;index" json:"document_id"`
	UserID          uuid.UUID  `gorm:"type:uuid;not null;index" json:"user_id"`
	SessionToken    string     `gorm:"size:255;uniqueIndex;not null" json:"-"`
	IPAddress       string     `gorm:"size:45" json:"ip_address"`
	City            string     `gorm:"size:100" json:"city,omitempty"`
	Country         string     `gorm:"size:100" json:"country,omitempty"`
	Browser         string     `gorm:"size:500" json:"browser,omitempty"`
	OS              string     `gorm:"size:100" json:"os,omitempty"`
	DeviceType      string     `gorm:"size:50" json:"device_type,omitempty"`
	StartedAt       time.Time  `gorm:"not null" json:"started_at"`
	LastActivityAt  time.Time  `gorm:"not null" json:"last_activity_at"`
	EndedAt         *time.Time `json:"ended_at,omitempty"`
	DurationSeconds int        `json:"duration_seconds"`
	PagesViewed     IntArray   `gorm:"type:jsonb;default:'[]'" json:"pages_viewed,omitempty"`
	IsActive        bool       `gorm:"default:true" json:"is_active"`

	// Relations
	Document *Document `gorm:"foreignKey:DocumentID" json:"-"`
	User     *User     `gorm:"foreignKey:UserID" json:"-"`
}

// BeforeCreate generates a UUID if not set
func (vs *ViewingSession) BeforeCreate(tx *gorm.DB) error {
	if vs.ID == uuid.Nil {
		vs.ID = uuid.New()
	}
	return nil
}

// TableName returns the table name for ViewingSession
func (ViewingSession) TableName() string {
	return "viewing_sessions"
}

// End marks the viewing session as ended
func (vs *ViewingSession) End() {
	now := time.Now()
	vs.EndedAt = &now
	vs.IsActive = false
	vs.DurationSeconds = int(now.Sub(vs.StartedAt).Seconds())
}
