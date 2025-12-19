// Package database handles database connections and migrations.
package database

import (
	"fmt"
	"log"
	"time"

	"secureview/internal/config"
	"secureview/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// DB holds the database connection
var DB *gorm.DB

// Connect establishes a connection to the PostgreSQL database
func Connect(cfg *config.Config) (*gorm.DB, error) {
	dsn := cfg.GetDSN()

	// Configure GORM logger based on environment
	logLevel := logger.Silent
	if cfg.IsDevelopment() {
		logLevel = logger.Info
	}

	gormConfig := &gorm.Config{
		Logger: logger.Default.LogMode(logLevel),
		NowFunc: func() time.Time {
			return time.Now().UTC()
		},
	}

	db, err := gorm.Open(postgres.Open(dsn), gormConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Get underlying SQL DB for connection pool configuration
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get underlying database: %w", err)
	}

	// Configure connection pool
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	// Test the connection
	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	DB = db
	log.Println("Connected to PostgreSQL database")

	return db, nil
}

// Migrate runs database migrations
func Migrate(db *gorm.DB) error {
	log.Println("Running database migrations...")

	// Enable UUID extension
	if err := db.Exec("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"").Error; err != nil {
		log.Printf("Warning: Could not create uuid-ossp extension: %v", err)
	}

	// Auto-migrate all models
	err := db.AutoMigrate(
		&models.Organization{},
		&models.User{},
		&models.UserDevice{},
		&models.Session{},
		&models.Invitation{},
		&models.Group{},
		&models.GroupMember{},
		&models.Document{},
		&models.DocumentAccess{},
		&models.AccessRequest{},
		&models.ViewingSession{},
		&models.AuditLog{},
		&models.Notification{},
	)
	if err != nil {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	// Create indexes for better query performance
	if err := createIndexes(db); err != nil {
		log.Printf("Warning: Some indexes may not have been created: %v", err)
	}

	// Run manual migrations for schema changes that AutoMigrate doesn't handle
	if err := runManualMigrations(db); err != nil {
		log.Printf("Warning: Some manual migrations may have failed: %v", err)
	}

	log.Println("Database migrations completed successfully")
	return nil
}

// runManualMigrations handles schema changes that GORM AutoMigrate doesn't apply
func runManualMigrations(db *gorm.DB) error {
	migrations := []string{
		// Fix Browser column size - User-Agent strings can be very long
		`ALTER TABLE viewing_sessions ALTER COLUMN browser TYPE varchar(500)`,
	}

	for _, migration := range migrations {
		if err := db.Exec(migration).Error; err != nil {
			// Log but don't fail - the migration might already be applied
			log.Printf("Migration note: %v (this may be expected if already applied)", err)
		}
	}

	return nil
}

// createIndexes creates additional indexes for performance
func createIndexes(db *gorm.DB) error {
	indexes := []string{
		// Composite index for user email within organization
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_org_email ON users(organization_id, email) WHERE deleted_at IS NULL`,

		// Composite index for group name within organization
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_groups_org_name ON groups(organization_id, name) WHERE deleted_at IS NULL`,

		// Index for audit logs time-based queries
		`CREATE INDEX IF NOT EXISTS idx_audit_logs_created_desc ON audit_logs(created_at DESC)`,

		// Index for document access queries
		`CREATE INDEX IF NOT EXISTS idx_document_access_doc_user ON document_access(document_id, user_id)`,

		// Index for notifications unread
		`CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE is_read = false`,

		// Index for active sessions
		`CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON sessions(user_id) WHERE expires_at > NOW()`,

		// Index for pending invitations
		`CREATE INDEX IF NOT EXISTS idx_invitations_pending ON invitations(organization_id) WHERE status = 'pending' AND expires_at > NOW()`,

		// Index for active documents
		`CREATE INDEX IF NOT EXISTS idx_documents_org_active ON documents(organization_id) WHERE is_active = true AND deleted_at IS NULL`,

		// Index for viewing sessions
		`CREATE INDEX IF NOT EXISTS idx_viewing_sessions_active ON viewing_sessions(document_id) WHERE is_active = true`,
	}

	for _, idx := range indexes {
		if err := db.Exec(idx).Error; err != nil {
			log.Printf("Warning: Failed to create index: %v", err)
		}
	}

	return nil
}

// Close closes the database connection
func Close(db *gorm.DB) error {
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}

// HealthCheck performs a database health check
func HealthCheck(db *gorm.DB) error {
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Ping()
}
