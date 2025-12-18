package services

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"time"

	"secureview/internal/config"
	"secureview/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

var (
	ErrSessionInvalid     = errors.New("viewing session is invalid")
	ErrSessionExpired     = errors.New("viewing session has expired")
	ErrConcurrentSession  = errors.New("document is already open in another session")
)

// ViewerService handles secure document viewing
type ViewerService struct {
	db           *gorm.DB
	cfg          *config.Config
	docService   *DocumentService
	auditService *AuditService
}

// NewViewerService creates a new ViewerService
func NewViewerService(db *gorm.DB, cfg *config.Config, docService *DocumentService, auditService *AuditService) *ViewerService {
	return &ViewerService{
		db:           db,
		cfg:          cfg,
		docService:   docService,
		auditService: auditService,
	}
}

// InitViewingSessionInput contains input for initializing a viewing session
type InitViewingSessionInput struct {
	DocumentID uuid.UUID
	UserID     uuid.UUID
	OrgID      uuid.UUID
	IPAddress  string
	Browser    string
	OS         string
	DeviceType string
}

// ViewingSessionResult contains the result of initializing a viewing session
type ViewingSessionResult struct {
	SessionToken string             `json:"session_token"`
	Document     *models.Document   `json:"document"`
	User         *models.User       `json:"user"`
	WatermarkData *WatermarkData    `json:"watermark_data"`
	PageCount    int                `json:"page_count"`
}

// WatermarkData contains information to display in the watermark
type WatermarkData struct {
	UserName     string    `json:"user_name"`
	UserEmail    string    `json:"user_email"`
	EmployeeID   string    `json:"employee_id"`
	Organization string    `json:"organization"`
	IPAddress    string    `json:"ip_address"`
	Location     string    `json:"location"`
	Timestamp    time.Time `json:"timestamp"`
}

// InitViewingSession initializes a secure viewing session
func (s *ViewerService) InitViewingSession(input InitViewingSessionInput) (*ViewingSessionResult, error) {
	// Check document access
	access, err := s.docService.CheckAccess(input.DocumentID, input.UserID, input.OrgID)
	if err != nil {
		// Log access denied
		s.auditService.LogEventWithContext(models.EventAccessDenied, &input.DocumentID, &input.UserID, &input.OrgID, &AuditContext{
			IPAddress: input.IPAddress,
			Browser:   input.Browser,
			OS:        input.OS,
		}, nil)
		return nil, err
	}

	// Check for existing active session for this document by this user
	var existingSession models.ViewingSession
	if err := s.db.Where("document_id = ? AND user_id = ? AND is_active = ?", input.DocumentID, input.UserID, true).First(&existingSession).Error; err == nil {
		// End the existing session
		existingSession.End()
		s.db.Save(&existingSession)
	}

	// Get document
	doc, err := s.docService.GetDocument(input.DocumentID, input.OrgID)
	if err != nil {
		return nil, err
	}

	// Get user
	var user models.User
	if err := s.db.Preload("Organization").Where("id = ?", input.UserID).First(&user).Error; err != nil {
		return nil, ErrUserNotFound
	}

	// Generate session token
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return nil, fmt.Errorf("failed to generate session token: %w", err)
	}
	sessionToken := hex.EncodeToString(tokenBytes)

	// Lookup IP location
	location := "Unknown"
	ipInfo, err := lookupIPLocation(input.IPAddress)
	if err == nil && ipInfo != nil {
		if ipInfo.City != "" && ipInfo.Country != "" {
			location = fmt.Sprintf("%s, %s", ipInfo.City, ipInfo.Country)
		} else if ipInfo.Country != "" {
			location = ipInfo.Country
		}
	}

	// Create viewing session
	viewingSession := &models.ViewingSession{
		DocumentID:   input.DocumentID,
		UserID:       input.UserID,
		SessionToken: sessionToken,
		IPAddress:    input.IPAddress,
		Browser:      input.Browser,
		OS:           input.OS,
		DeviceType:   input.DeviceType,
		IsActive:     true,
	}

	if ipInfo != nil {
		viewingSession.City = ipInfo.City
		viewingSession.Country = ipInfo.Country
	}

	if err := s.db.Create(viewingSession).Error; err != nil {
		return nil, fmt.Errorf("failed to create viewing session: %w", err)
	}

	// Mark one-time access as used
	if access.IsOneTime && !access.OneTimeUsed {
		access.MarkUsed()
		s.db.Save(access)
	}

	// Log document opened
	s.auditService.LogEventWithContext(models.EventDocumentOpened, &input.DocumentID, &input.UserID, &input.OrgID, &AuditContext{
		IPAddress:  input.IPAddress,
		City:       viewingSession.City,
		Country:    viewingSession.Country,
		Browser:    input.Browser,
		OS:         input.OS,
		DeviceType: input.DeviceType,
	}, nil)

	// Prepare watermark data
	orgName := ""
	if user.Organization != nil {
		orgName = user.Organization.Name
	}

	watermark := &WatermarkData{
		UserName:     user.Name,
		UserEmail:    user.Email,
		EmployeeID:   user.EmployeeID,
		Organization: orgName,
		IPAddress:    maskIP(input.IPAddress),
		Location:     location,
		Timestamp:    time.Now(),
	}

	return &ViewingSessionResult{
		SessionToken:  sessionToken,
		Document:      doc,
		User:          &user,
		WatermarkData: watermark,
		PageCount:     doc.PageCount,
	}, nil
}

// ValidateViewingSession validates a viewing session token
func (s *ViewerService) ValidateViewingSession(sessionToken string, userID uuid.UUID) (*models.ViewingSession, error) {
	var session models.ViewingSession
	if err := s.db.Where("session_token = ? AND user_id = ? AND is_active = ?", sessionToken, userID, true).First(&session).Error; err != nil {
		return nil, ErrSessionInvalid
	}

	// Check if session is too old (30 minutes of inactivity)
	if time.Since(session.LastActivityAt) > 30*time.Minute {
		session.End()
		s.db.Save(&session)
		return nil, ErrSessionExpired
	}

	return &session, nil
}

// Heartbeat updates the last activity time for a viewing session
func (s *ViewerService) Heartbeat(sessionToken string, userID uuid.UUID, pageNumber int) error {
	session, err := s.ValidateViewingSession(sessionToken, userID)
	if err != nil {
		return err
	}

	// Update last activity
	session.LastActivityAt = time.Now()

	// Track pages viewed
	if pageNumber > 0 {
		pageViewed := false
		for _, p := range session.PagesViewed {
			if p == pageNumber {
				pageViewed = true
				break
			}
		}
		if !pageViewed {
			session.PagesViewed = append(session.PagesViewed, pageNumber)
		}
	}

	return s.db.Save(session).Error
}

// EndViewingSession ends a viewing session
func (s *ViewerService) EndViewingSession(sessionToken string, userID uuid.UUID) error {
	session, err := s.ValidateViewingSession(sessionToken, userID)
	if err != nil {
		// Session might already be ended, which is okay
		return nil
	}

	session.End()
	if err := s.db.Save(session).Error; err != nil {
		return fmt.Errorf("failed to end session: %w", err)
	}

	// Log document closed
	s.auditService.LogEventWithContext(models.EventDocumentClosed, &session.DocumentID, &userID, nil, &AuditContext{
		IPAddress: session.IPAddress,
		City:      session.City,
		Country:   session.Country,
		Browser:   session.Browser,
		OS:        session.OS,
	}, models.JSONB{
		"duration_seconds": session.DurationSeconds,
		"pages_viewed":     len(session.PagesViewed),
	})

	return nil
}

// ReportSecurityEvent logs a security event during document viewing
func (s *ViewerService) ReportSecurityEvent(sessionToken string, userID uuid.UUID, eventType models.EventType, metadata models.JSONB) error {
	session, err := s.ValidateViewingSession(sessionToken, userID)
	if err != nil {
		return err
	}

	s.auditService.LogEventWithContext(eventType, &session.DocumentID, &userID, nil, &AuditContext{
		IPAddress: session.IPAddress,
		City:      session.City,
		Country:   session.Country,
		Browser:   session.Browser,
		OS:        session.OS,
	}, metadata)

	return nil
}

// GetDocumentPage returns a specific page of a document for viewing
func (s *ViewerService) GetDocumentPage(sessionToken string, userID uuid.UUID, pageNumber int) ([]byte, string, error) {
	session, err := s.ValidateViewingSession(sessionToken, userID)
	if err != nil {
		return nil, "", err
	}

	// Get document
	var doc models.Document
	if err := s.db.Where("id = ?", session.DocumentID).First(&doc).Error; err != nil {
		return nil, "", ErrDocumentNotFound
	}

	// For now, just return the entire file
	// In production, you would render specific pages as images
	content, err := os.ReadFile(doc.StoragePath)
	if err != nil {
		return nil, "", fmt.Errorf("failed to read document: %w", err)
	}

	// Update heartbeat
	s.Heartbeat(sessionToken, userID, pageNumber)

	return content, doc.FileType, nil
}

// Helper functions

func lookupIPLocation(ip string) (*struct {
	City    string
	Country string
}, error) {
	// In production, use a proper IP geolocation service
	// For now, return empty
	return &struct {
		City    string
		Country string
	}{}, nil
}

func maskIP(ip string) string {
	// Mask the last octet for privacy
	// 192.168.1.100 -> 192.168.1.xxx
	for i := len(ip) - 1; i >= 0; i-- {
		if ip[i] == '.' {
			return ip[:i+1] + "xxx"
		}
	}
	return ip
}
