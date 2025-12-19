package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
)

// JSONB is a custom type for PostgreSQL JSONB columns
type JSONB map[string]interface{}

// Value implements the driver.Valuer interface
func (j JSONB) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}
	return json.Marshal(j)
}

// Scan implements the sql.Scanner interface
func (j *JSONB) Scan(value interface{}) error {
	if value == nil {
		*j = nil
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}

	return json.Unmarshal(bytes, j)
}

// IntArray is a custom type for storing integer arrays as JSONB
type IntArray []int

// Value implements the driver.Valuer interface
func (a IntArray) Value() (driver.Value, error) {
	if a == nil {
		return "[]", nil
	}
	return json.Marshal(a)
}

// Scan implements the sql.Scanner interface
func (a *IntArray) Scan(value interface{}) error {
	if value == nil {
		*a = []int{}
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed for IntArray")
	}

	return json.Unmarshal(bytes, a)
}

// UserRole defines the roles available in the system
type UserRole string

const (
	RoleSuperAdmin UserRole = "super_admin"
	RoleOrgAdmin   UserRole = "org_admin"
	RoleManager    UserRole = "manager"
	RoleMember     UserRole = "member"
	RoleViewer     UserRole = "viewer"
)

// IsValid checks if the role is valid
func (r UserRole) IsValid() bool {
	switch r {
	case RoleSuperAdmin, RoleOrgAdmin, RoleManager, RoleMember, RoleViewer:
		return true
	}
	return false
}

// CanUpload returns true if the role can upload documents
func (r UserRole) CanUpload() bool {
	return r == RoleSuperAdmin || r == RoleOrgAdmin || r == RoleManager || r == RoleMember
}

// CanInvite returns true if the role can invite users
func (r UserRole) CanInvite() bool {
	return r == RoleSuperAdmin || r == RoleOrgAdmin
}

// CanManageUsers returns true if the role can manage users
func (r UserRole) CanManageUsers() bool {
	return r == RoleSuperAdmin || r == RoleOrgAdmin
}

// CanCreateGroups returns true if the role can create groups
func (r UserRole) CanCreateGroups() bool {
	return r == RoleSuperAdmin || r == RoleOrgAdmin
}

// AccessLevel defines document access levels
type AccessLevel string

const (
	AccessLevelView    AccessLevel = "view"
	AccessLevelReshare AccessLevel = "reshare"
)

// EventType defines audit log event types
type EventType string

const (
	EventDocumentOpened      EventType = "document_opened"
	EventDocumentClosed      EventType = "document_closed"
	EventDocumentUploaded    EventType = "document_uploaded"
	EventDocumentDeleted     EventType = "document_deleted"
	EventAccessDenied        EventType = "access_denied"
	EventPermissionGranted   EventType = "permission_granted"
	EventPermissionRevoked   EventType = "permission_revoked"
	EventAccessRequested     EventType = "access_requested"
	EventDevtoolsDetected    EventType = "devtools_detected"
	EventScreenshotAttempt   EventType = "screenshot_attempt"
	EventUserLogin           EventType = "user_login"
	EventUserLogout          EventType = "user_logout"
	EventPINVerified         EventType = "pin_verified"
	EventInvitationSent      EventType = "invitation_sent"
	EventInvitationAccepted  EventType = "invitation_accepted"
)

// NotificationType defines notification types
type NotificationType string

const (
	NotificationDocumentViewed    NotificationType = "document_viewed"
	NotificationAccessRequested   NotificationType = "access_requested"
	NotificationAccessGranted     NotificationType = "access_granted"
	NotificationAccessDenied      NotificationType = "access_denied"
	NotificationDocumentShared    NotificationType = "document_shared"
	NotificationInvitationAccepted NotificationType = "invitation_accepted"
)

// InvitationStatus defines invitation statuses
type InvitationStatus string

const (
	InvitationPending  InvitationStatus = "pending"
	InvitationAccepted InvitationStatus = "accepted"
	InvitationExpired  InvitationStatus = "expired"
)

// AccessRequestStatus defines access request statuses
type AccessRequestStatus string

const (
	AccessRequestPending  AccessRequestStatus = "pending"
	AccessRequestApproved AccessRequestStatus = "approved"
	AccessRequestDenied   AccessRequestStatus = "denied"
)
