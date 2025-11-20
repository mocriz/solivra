package main

import (
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/helmet"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"

	"solivra-go/backend/internal/config"
	"solivra-go/backend/internal/database"
	"solivra-go/backend/internal/handlers"
	"solivra-go/backend/internal/middleware"
	"solivra-go/backend/pkg/utils"
)

func main() {
	// 1. Init Config
	cfg := config.Load() // FIXED: cfg sekarang menerima return dari Load()

	// 2. Connect Database
	database.ConnectDB(cfg.MongoURI, cfg.MongoDBName) // FIXED: ConnectDB sekarang huruf kapital

	// 3. Init Cloudinary (Wajib untuk upload file)
	utils.InitCloudinary(cfg.CloudinaryCloudName, cfg.CloudinaryAPIKey, cfg.CloudinaryAPISecret)

	// 4. Setup Fiber App
	app := fiber.New(fiber.Config{
		AppName:   "Solivra Go Backend",
		BodyLimit: 10 * 1024 * 1024,
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			// PASTIKAN MENGEMBALIKAN "msg" UNTUK KONSISTENSI DENGAN NODE.JS
			return c.Status(code).JSON(fiber.Map{
				"ok":  false,
				"msg": err.Error(),
			})
		},
	})

	// 5. Middlewares Global
	app.Use(logger.New())
	app.Use(recover.New())
	app.Use(helmet.New())

	app.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.CorsAllowedOrigins,
		AllowCredentials: true,
		AllowMethods:     "GET,POST,HEAD,PUT,DELETE,PATCH,OPTIONS",
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization, X-Requested-With, X-Session-Token",
	}))

	app.Use(limiter.New(limiter.Config{
		Max:        200,
		Expiration: 1 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			return utils.GetClientIP(c)
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"ok":  false,
				"msg": "Too many requests, please try again later.",
			})
		},
	}))

	app.Use(middleware.ActivityLoggerMiddleware)

	// 6. Routes
	api := app.Group("/api")

	// Health Check
	api.Get("/health", handlers.HealthCheck)
	api.Post("/track-visit", handlers.TrackVisit)

	// Auth Routes
	auth := api.Group("/auth")
	auth.Post("/login", handlers.Login)
	auth.Post("/register", handlers.Register)
	auth.Post("/refresh", handlers.Refresh)
	auth.Post("/logout", handlers.Logout)

	// Honeypot (Public)
	honeypot := api.Group("/honeypot")
	honeypot.Post("/admin-login", handlers.FakeAdminLogin) // FIXED: Nama handler Kapital
	honeypot.Get("/admin-access", handlers.LogAdminAccess) // FIXED: Nama handler Kapital

	// Public user utilities
	publicUsers := api.Group("/users")
	publicUsers.Get("/check-username/:username", handlers.CheckUsername)

	// Protected Routes (Need Valid Session)
	api.Use(middleware.Protected())

	// User Routes
	users := api.Group("/users")
	users.Get("/me", handlers.GetMe)
	users.Put("/profile", handlers.UpdateProfile)
	users.Put("/password", handlers.UpdatePassword)
	users.Put("/language", handlers.UpdateLanguage)
	users.Delete("/profile-picture", handlers.RemoveProfilePicture)
	users.Delete("/", handlers.DeleteAccount)
	users.Get("/sessions", handlers.GetSessions)
	users.Delete("/sessions/:id", handlers.RevokeSession)
	users.Post("/start-streak", handlers.StartStreak)

	// Relapse Routes
	relapses := api.Group("/relapses")
	relapses.Get("/", handlers.GetRelapses)
	relapses.Post("/", handlers.CreateRelapse)
	relapses.Post("/sync", handlers.SyncRelapse)
	relapses.Put("/:id", handlers.UpdateRelapse)
	relapses.Delete("/:id", handlers.DeleteRelapse)
	relapses.Delete("/", handlers.DeleteAllRelapses)

	// Stats Routes
	stats := api.Group("/stats")
	stats.Get("/", handlers.GetStats)
	stats.Get("/rankings", handlers.GetRankings)

	// Admin Routes (Protected + Admin Role Check)
	admin := api.Group("/admin", middleware.AdminOnly())
	admin.Get("/dashboard", handlers.GetAdminDashboard)
	admin.Get("/logs", handlers.GetAdminLogs)
	admin.Get("/rankings", handlers.GetAdminRankings)

	// Honeypot Stats (Admin only)
	honeypotAdmin := api.Group("/honeypot", middleware.AdminOnly())
	honeypotAdmin.Get("/stats", handlers.GetHoneypotStats)

	// 7. Start Server
	log.Fatal(app.Listen(":" + cfg.Port))
}
