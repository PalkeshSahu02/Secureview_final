package middleware

import (
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// CORSMiddleware creates a CORS middleware with the specified allowed origins
func CORSMiddleware(allowedOrigins []string) gin.HandlerFunc {
	config := cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With", "X-Device-Fingerprint"},
		ExposeHeaders:    []string{"Content-Length", "Content-Type", "X-RateLimit-Limit", "X-RateLimit-Remaining"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}

	return cors.New(config)
}

// DevelopmentCORSMiddleware creates a permissive CORS middleware for development
func DevelopmentCORSMiddleware() gin.HandlerFunc {
	config := cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"*"},
		ExposeHeaders:    []string{"*"},
		AllowCredentials: false, // Can't use credentials with wildcard origin
		MaxAge:           12 * time.Hour,
	}

	return cors.New(config)
}
