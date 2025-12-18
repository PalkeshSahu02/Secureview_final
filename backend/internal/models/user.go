package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// User represents a user in the system.
// Users belong to an organization (except super_admin) and have specific roles.
type User struct {
	ID             uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	OrganizationID *uuid.UUID     `gorm:"type:uuid;index" json:"organization_id,omitempty"`
	Email          string         `gorm:"size:255;not null;index" json:"email"`
	PasswordHash   string         `gorm:"size:255;not null" json:"-"`
	PINHash        string         `gorm:"size:255;not null" json:"-"`
	Name           string         `gorm:"size:255;not null" json:"name"`
	EmployeeID     string         `gorm:"size:100" json:"employee_id,omitempty"`
	Role           UserRole       `gorm:"size:50;not null" json:"role"`
	IsActive       bool           `gorm:"default:true" json:"is_active"`
	EmailVerified  bool           `gorm:"default:false" json:"email_verified"`
	LastLoginAt    *time.Time     `json:"last_login_at,omitempty"`
	CreatedAt      time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt      time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	Organization *Organization   `gorm:"foreignKey:OrganizationID" json:"organization,omitempty"`
	Documents    []Document      `gorm:"foreignKey:UploadedBy" json:"documents,omitempty"`
	Sessions     []Session       `gorm:"foreignKey:UserID" json:"-"`
	Devices      []UserDevice    `gorm:"foreignKey:UserID" json:"devices,omitempty"`
	GroupMembers []GroupMember   `gorm:"foreignKey:UserID" json:"-"`
}

// BeforeCreate generates a UUID if not set
func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	return nil
}

// TableName returns the table name for User
func (User) TableName() string {
	return "users"
}

// IsSuperAdmin checks if user is a super admin
func (u *User) IsSuperAdmin() bool {
	return u.Role == RoleSuperAdmin
}

// IsOrgAdmin checks if user is an organization admin
func (u *User) IsOrgAdmin() bool {
	return u.Role == RoleOrgAdmin
}

// CanManageOrganization checks if user can manage the organization
func (u *User) CanManageOrganization() bool {
	return u.Role == RoleSuperAdmin || u.Role == RoleOrgAdmin
}

// UserDevice tracks devices used by a user for session management
type UserDevice struct {
	ID                uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	UserID            uuid.UUID  `gorm:"type:uuid;not null;index" json:"user_id"`
	DeviceFingerprint string     `gorm:"size:255;not null" json:"device_fingerprint"`
	DeviceName        string     `gorm:"size:255" json:"device_name,omitempty"`
	Browser           string     `gorm:"size:100" json:"browser,omitempty"`
	OS                string     `gorm:"size:100" json:"os,omitempty"`
	LastUsedAt        time.Time  `gorm:"autoUpdateTime" json:"last_used_at"`
	CreatedAt         time.Time  `gorm:"autoCreateTime" json:"created_at"`

	// Relations
	User     *User     `gorm:"foreignKey:UserID" json:"-"`
	Sessions []Session `gorm:"foreignKey:DeviceID" json:"-"`
}

// BeforeCreate generates a UUID if not set
func (d *UserDevice) BeforeCreate(tx *gorm.DB) error {
	if d.ID == uuid.Nil {
		d.ID = uuid.New()
	}
	return nil
}

// TableName returns the table name for UserDevice
func (UserDevice) TableName() string {
	return "user_devices"
}

// Session represents an active user session
type Session struct {
	ID            uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	UserID        uuid.UUID  `gorm:"type:uuid;not null;index" json:"user_id"`
	DeviceID      *uuid.UUID `gorm:"type:uuid;index" json:"device_id,omitempty"`
	TokenHash     string     `gorm:"size:255;not null;index" json:"-"`
	PINVerified   bool       `gorm:"default:false" json:"pin_verified"`
	PINVerifiedAt *time.Time `json:"pin_verified_at,omitempty"`
	ExpiresAt     time.Time  `gorm:"not null" json:"expires_at"`
	CreatedAt     time.Time  `gorm:"autoCreateTime" json:"created_at"`

	// Relations
	User   *User       `gorm:"foreignKey:UserID" json:"-"`
	Device *UserDevice `gorm:"foreignKey:DeviceID" json:"-"`
}

// BeforeCreate generates a UUID if not set
func (s *Session) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}

// TableName returns the table name for Session
func (Session) TableName() string {
	return "sessions"
}

// IsExpired checks if the session has expired
func (s *Session) IsExpired() bool {
	return time.Now().After(s.ExpiresAt)
}

// Invitation represents a user invitation to join an organization
type Invitation struct {
	ID             uuid.UUID         `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	OrganizationID uuid.UUID         `gorm:"type:uuid;not null;index" json:"organization_id"`
	Email          string            `gorm:"size:255;not null" json:"email"`
	Name           string            `gorm:"size:255" json:"name,omitempty"`
	Role           UserRole          `gorm:"size:50;not null" json:"role"`
	InvitedBy      uuid.UUID         `gorm:"type:uuid;not null" json:"invited_by"`
	Token          string            `gorm:"size:255;uniqueIndex;not null" json:"-"`
	Status         InvitationStatus  `gorm:"size:50;default:'pending'" json:"status"`
	ExpiresAt      time.Time         `gorm:"not null" json:"expires_at"`
	AcceptedAt     *time.Time        `json:"accepted_at,omitempty"`
	CreatedAt      time.Time         `gorm:"autoCreateTime" json:"created_at"`

	// Relations
	Organization *Organization `gorm:"foreignKey:OrganizationID" json:"organization,omitempty"`
	Inviter      *User         `gorm:"foreignKey:InvitedBy" json:"inviter,omitempty"`
}

// BeforeCreate generates a UUID if not set
func (i *Invitation) BeforeCreate(tx *gorm.DB) error {
	if i.ID == uuid.Nil {
		i.ID = uuid.New()
	}
	return nil
}

// TableName returns the table name for Invitation
func (Invitation) TableName() string {
	return "invitations"
}

// IsExpired checks if the invitation has expired
func (i *Invitation) IsExpired() bool {
	return time.Now().After(i.ExpiresAt)
}

// IsValid checks if the invitation can still be used
func (i *Invitation) IsValid() bool {
	return i.Status == InvitationPending && !i.IsExpired()
}
