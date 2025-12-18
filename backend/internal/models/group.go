package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Group represents a collection of users within an organization.
// Groups can be used for bulk document access permissions.
type Group struct {
	ID             uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	OrganizationID uuid.UUID      `gorm:"type:uuid;not null;index" json:"organization_id"`
	Name           string         `gorm:"size:255;not null" json:"name"`
	Description    string         `gorm:"type:text" json:"description,omitempty"`
	CreatedBy      uuid.UUID      `gorm:"type:uuid;not null" json:"created_by"`
	CreatedAt      time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt      time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	Organization *Organization   `gorm:"foreignKey:OrganizationID" json:"organization,omitempty"`
	Creator      *User           `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	Members      []GroupMember   `gorm:"foreignKey:GroupID" json:"members,omitempty"`
	MemberCount  int             `gorm:"-" json:"member_count,omitempty"`
}

// BeforeCreate generates a UUID if not set
func (g *Group) BeforeCreate(tx *gorm.DB) error {
	if g.ID == uuid.Nil {
		g.ID = uuid.New()
	}
	return nil
}

// TableName returns the table name for Group
func (Group) TableName() string {
	return "groups"
}

// GroupMember represents a user's membership in a group
type GroupMember struct {
	GroupID   uuid.UUID `gorm:"type:uuid;primaryKey" json:"group_id"`
	UserID    uuid.UUID `gorm:"type:uuid;primaryKey" json:"user_id"`
	AddedBy   uuid.UUID `gorm:"type:uuid;not null" json:"added_by"`
	AddedAt   time.Time `gorm:"autoCreateTime" json:"added_at"`

	// Relations
	Group *Group `gorm:"foreignKey:GroupID" json:"group,omitempty"`
	User  *User  `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Adder *User  `gorm:"foreignKey:AddedBy" json:"adder,omitempty"`
}

// TableName returns the table name for GroupMember
func (GroupMember) TableName() string {
	return "group_members"
}
