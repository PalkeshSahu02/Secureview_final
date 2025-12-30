// Package api defines the API routes for the SecureView application.
package api

import (
	"secureview/internal/config"
	"secureview/internal/handlers"
	"secureview/internal/middleware"
	"secureview/internal/models"
	"secureview/internal/services"
	"secureview/internal/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// SetupRoutes configures all API routes
func SetupRoutes(router *gin.Engine, db *gorm.DB, cfg *config.Config) {
	// Initialize JWT manager
	jwtManager := utils.NewJWTManager(
		cfg.JWT.Secret,
		cfg.JWT.AccessExpiresIn,
		cfg.JWT.RefreshExpiresIn,
	)

	// Initialize services
	auditService := services.NewAuditService(db)
	authService := services.NewAuthService(db, cfg, jwtManager)
	emailService := services.NewEmailService(cfg)
	userService := services.NewUserService(db, cfg, emailService)
	docService := services.NewDocumentService(db, cfg, auditService)
	viewerService := services.NewViewerService(db, cfg, docService, auditService)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService)
	userHandler := handlers.NewUserHandler(userService)
	docHandler := handlers.NewDocumentHandler(docService)
	viewerHandler := handlers.NewViewerHandler(viewerService)
	activityHandler := handlers.NewActivityHandler(auditService)

	// API v1 routes
	v1 := router.Group("/api/v1")

	// Health check
	v1.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "healthy",
			"version": "1.0.0",
		})
	})

	// Public authentication routes
	auth := v1.Group("/auth")
	{
		auth.POST("/register", authHandler.Register)
		auth.POST("/login", authHandler.Login)
		auth.POST("/refresh", authHandler.RefreshToken)
		auth.GET("/invitations/:token", authHandler.GetInvitation)
		auth.POST("/invitations/accept", authHandler.AcceptInvitation)
	}

	// Protected routes (require authentication)
	protected := v1.Group("")
	protected.Use(middleware.AuthMiddleware(jwtManager, db))
	{
		// Auth routes that require authentication
		protected.POST("/auth/verify-pin", authHandler.VerifyPIN)
		protected.POST("/auth/logout", authHandler.Logout)
		protected.GET("/auth/me", authHandler.GetCurrentUser)

		// Profile routes
		protected.GET("/profile", userHandler.GetProfile)
		protected.PUT("/profile", userHandler.UpdateProfile)
		protected.POST("/profile/password", userHandler.ChangePassword)
		protected.POST("/profile/pin", userHandler.ChangePIN)
	}

	// Routes that require PIN verification
	pinProtected := v1.Group("")
	pinProtected.Use(middleware.AuthMiddleware(jwtManager, db))
	pinProtected.Use(middleware.RequirePIN(db))
	{
		// Activity logs (org members can view)
		activity := pinProtected.Group("/activity")
		activity.Use(middleware.RequireOrgMember())
		{
			activity.GET("", activityHandler.ListActivity)
		}

		// User management (admin only)
		users := pinProtected.Group("/users")
		users.Use(middleware.RequireOrgAdmin())
		{
			users.GET("", userHandler.ListUsers)
			users.GET("/:id", userHandler.GetUser)
			users.PUT("/:id", userHandler.UpdateUser)
			users.DELETE("/:id", userHandler.DeactivateUser)
		}

		// Invitations (admin only)
		invitations := pinProtected.Group("/invitations")
		invitations.Use(middleware.RequireOrgAdmin())
		{
			invitations.GET("", userHandler.ListInvitations)
			invitations.POST("", userHandler.CreateInvitation)
			invitations.DELETE("/:id", userHandler.CancelInvitation)
		}

		// Documents (users with upload permission)
		documents := pinProtected.Group("/documents")
		documents.Use(middleware.RequireOrgMember())
		{
			documents.GET("", docHandler.ListDocuments)
			documents.GET("/:id", docHandler.GetDocument)

			// Upload requires specific roles
			uploadGroup := documents.Group("")
			uploadGroup.Use(middleware.RequireRole(
				models.RoleSuperAdmin,
				models.RoleOrgAdmin,
				models.RoleManager,
				models.RoleMember,
			))
			{
				uploadGroup.POST("", docHandler.UploadDocument)
				uploadGroup.PUT("/:id", docHandler.UpdateDocument)
				uploadGroup.DELETE("/:id", docHandler.DeleteDocument)
				uploadGroup.GET("/:id/access", docHandler.GetAccessList)
				uploadGroup.POST("/:id/access", docHandler.GrantAccess)
				uploadGroup.DELETE("/:id/access/:accessId", docHandler.RevokeAccess)
				uploadGroup.GET("/:id/logs", docHandler.GetDocumentLogs)
			}
		}

		// Secure document viewer
		viewer := pinProtected.Group("/viewer")
		viewer.Use(middleware.RequireOrgMember())
		{
			viewer.POST("/:id/init", viewerHandler.InitViewingSession)
			viewer.GET("/:id/page/:pageNum", viewerHandler.GetPage)
			viewer.POST("/:id/heartbeat", viewerHandler.Heartbeat)
			viewer.POST("/:id/close", viewerHandler.EndSession)
			viewer.POST("/:id/security-event", viewerHandler.ReportSecurityEvent)
		}
	}
}
