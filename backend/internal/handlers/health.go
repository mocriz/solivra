package handlers

import (
	"time"

	"github.com/gofiber/fiber/v2"
)

// HealthCheck handles GET /api/health
// Mirip dengan backend/server.js health check
func HealthCheck(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"status":    "ok",
		"timestamp": time.Now().Format(time.RFC3339),
		"endpoints": fiber.Map{ // Daftar endpoint utama
			"auth":     "/api/auth",
			"users":    "/api/users",
			"stats":    "/api/stats",
			"relapses": "/api/relapses",
			"admin":    "/api/admin",
		},
	})
}