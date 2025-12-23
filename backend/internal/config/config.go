// Package config handles application configuration management.
// It loads configuration from environment variables with sensible defaults.
package config

import (
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

// Config holds all application configuration values
type Config struct {
	// Server configuration
	Server ServerConfig

	// Database configuration
	Database DatabaseConfig

	// JWT configuration
	JWT JWTConfig

	// Redis configuration
	Redis RedisConfig

	// Storage configuration
	Storage StorageConfig

	// Security settings
	Security SecurityConfig

	// Email configuration
	Email EmailConfig
}

// ServerConfig holds HTTP server settings
type ServerConfig struct {
	Port         string
	Environment  string // development, staging, production
	AllowOrigins []string
}

// DatabaseConfig holds PostgreSQL connection settings
type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	Name     string
	SSLMode  string
}

// JWTConfig holds JWT token settings
type JWTConfig struct {
	Secret           string
	AccessExpiresIn  time.Duration
	RefreshExpiresIn time.Duration
}

// RedisConfig holds Redis connection settings
type RedisConfig struct {
	Host     string
	Port     string
	Password string
	DB       int
}

// StorageConfig holds file storage settings
type StorageConfig struct {
	Type      string // local, s3
	LocalPath string
	S3Bucket  string
	S3Region  string
}

// SecurityConfig holds security-related settings
type SecurityConfig struct {
	PINLength          int
	MaxLoginAttempts   int
	LockoutDuration    time.Duration
	SessionTimeout     time.Duration
	InviteExpiry       time.Duration
	RateLimitRequests  int
	RateLimitWindow    time.Duration
}

// EmailConfig holds SMTP email settings
type EmailConfig struct {
	SMTPHost     string
	SMTPPort     int
	SMTPUsername string
	SMTPPassword string
	FromEmail    string
	FromName     string
	Enabled      bool
	AppURL       string // Frontend URL for invitation links
}

// Load reads configuration from environment variables
func Load() *Config {
	// Load .env file if it exists (ignore error if not found)
	_ = godotenv.Load()

	return &Config{
		Server: ServerConfig{
			Port:         getEnv("PORT", "8080"),
			Environment:  getEnv("ENVIRONMENT", "development"),
			AllowOrigins: getEnvSlice("CORS_ORIGINS", []string{"http://localhost:3000", "http://localhost:5173"}),
		},
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnv("DB_PORT", "5432"),
			User:     getEnv("DB_USER", "postgres"),
			Password: getEnv("DB_PASSWORD", "postgres"),
			Name:     getEnv("DB_NAME", "secureview"),
			SSLMode:  getEnv("DB_SSLMODE", "disable"),
		},
		JWT: JWTConfig{
			Secret:           getEnv("JWT_SECRET", "your-super-secret-jwt-key-change-in-production"),
			AccessExpiresIn:  getEnvDuration("JWT_ACCESS_EXPIRES", 15*time.Minute),
			RefreshExpiresIn: getEnvDuration("JWT_REFRESH_EXPIRES", 7*24*time.Hour),
		},
		Redis: RedisConfig{
			Host:     getEnv("REDIS_HOST", "localhost"),
			Port:     getEnv("REDIS_PORT", "6379"),
			Password: getEnv("REDIS_PASSWORD", ""),
			DB:       getEnvInt("REDIS_DB", 0),
		},
		Storage: StorageConfig{
			Type:      getEnv("STORAGE_TYPE", "local"),
			LocalPath: getEnv("STORAGE_LOCAL_PATH", "./uploads"),
			S3Bucket:  getEnv("S3_BUCKET", ""),
			S3Region:  getEnv("S3_REGION", "us-east-1"),
		},
		Security: SecurityConfig{
			PINLength:          getEnvInt("PIN_LENGTH", 4),
			MaxLoginAttempts:   getEnvInt("MAX_LOGIN_ATTEMPTS", 5),
			LockoutDuration:    getEnvDuration("LOCKOUT_DURATION", 15*time.Minute),
			SessionTimeout:     getEnvDuration("SESSION_TIMEOUT", 24*time.Hour),
			InviteExpiry:       getEnvDuration("INVITE_EXPIRY", 72*time.Hour),
			RateLimitRequests:  getEnvInt("RATE_LIMIT_REQUESTS", 100),
			RateLimitWindow:    getEnvDuration("RATE_LIMIT_WINDOW", time.Minute),
		},
		Email: EmailConfig{
			SMTPHost:     getEnv("SMTP_HOST", ""),
			SMTPPort:     getEnvInt("SMTP_PORT", 587),
			SMTPUsername: getEnv("SMTP_USERNAME", ""),
			SMTPPassword: getEnv("SMTP_PASSWORD", ""),
			FromEmail:    getEnv("SMTP_FROM_EMAIL", "noreply@secureview.app"),
			FromName:     getEnv("SMTP_FROM_NAME", "SecureView"),
			Enabled:      getEnvBool("SMTP_ENABLED", false),
			AppURL:       getEnv("APP_URL", "http://localhost:5173"),
		},
	}
}

// Helper functions for reading environment variables

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func getEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if boolValue, err := strconv.ParseBool(value); err == nil {
			return boolValue
		}
	}
	return defaultValue
}

func getEnvDuration(key string, defaultValue time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		if duration, err := time.ParseDuration(value); err == nil {
			return duration
		}
	}
	return defaultValue
}

func getEnvSlice(key string, defaultValue []string) []string {
	if value := os.Getenv(key); value != "" {
		// Simple comma-separated parsing
		var result []string
		start := 0
		for i := 0; i <= len(value); i++ {
			if i == len(value) || value[i] == ',' {
				if start < i {
					result = append(result, value[start:i])
				}
				start = i + 1
			}
		}
		if len(result) > 0 {
			return result
		}
	}
	return defaultValue
}

// IsDevelopment returns true if running in development mode
func (c *Config) IsDevelopment() bool {
	return c.Server.Environment == "development"
}

// IsProduction returns true if running in production mode
func (c *Config) IsProduction() bool {
	return c.Server.Environment == "production"
}

// GetDSN returns the PostgreSQL connection string
func (c *Config) GetDSN() string {
	return "host=" + c.Database.Host +
		" port=" + c.Database.Port +
		" user=" + c.Database.User +
		" password=" + c.Database.Password +
		" dbname=" + c.Database.Name +
		" sslmode=" + c.Database.SSLMode
}
