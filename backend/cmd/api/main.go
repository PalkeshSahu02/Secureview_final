// SecureView API Server
// A secure document viewing and management platform.
//
// This is the main entry point for the SecureView backend API.
// It initializes the database, sets up middleware, and starts the HTTP server.
package main

import (
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	"secureview/api"
	"secureview/internal/config"
	"secureview/internal/database"
	"secureview/internal/middleware"

	"github.com/gin-gonic/gin"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Set Gin mode based on environment
	if cfg.IsProduction() {
		gin.SetMode(gin.ReleaseMode)
	}

	// Connect to database
	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close(db)

	// Run migrations
	if err := database.Migrate(db); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// Create uploads directory
	if err := os.MkdirAll(cfg.Storage.LocalPath, 0755); err != nil {
		log.Fatalf("Failed to create uploads directory: %v", err)
	}

	// Initialize Gin router
	router := gin.New()

	// Global middleware
	router.Use(gin.Recovery())
	router.Use(gin.Logger())

	// CORS middleware
	if cfg.IsDevelopment() {
		router.Use(middleware.DevelopmentCORSMiddleware())
	} else {
		router.Use(middleware.CORSMiddleware(cfg.Server.AllowOrigins))
	}

	// Rate limiting
	rateLimiter := middleware.NewRateLimiter(cfg.Security.RateLimitRequests, cfg.Security.RateLimitWindow)
	router.Use(middleware.RateLimitMiddleware(rateLimiter))

	// Setup API routes
	api.SetupRoutes(router, db, cfg)

	// Start server
	addr := fmt.Sprintf(":%s", cfg.Server.Port)
	log.Printf("Starting SecureView API server on %s", addr)
	log.Printf("Environment: %s", cfg.Server.Environment)

	// Graceful shutdown handling
	go func() {
		if err := router.Run(addr); err != nil {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")
}
