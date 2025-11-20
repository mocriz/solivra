package handlers

import (
	"context"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"

	"solivra-go/backend/internal/database"
	"solivra-go/backend/internal/models"
	"solivra-go/backend/pkg/utils"
)

// FAKE_CREDENTIALS for honeypot (from MERN auth.js)
var FAKE_CREDENTIALS = map[string]string{
	"admin":         "admin",
	"admin123":      "admin123",
	"administrator": "administrator",
	"root":          "root",
	"superadmin":    "superadmin",
	"test":          "test",
	"demo":          "demo",
	"user":          "user",
	"manager":       "manager",
	"guest":         "guest",
	"password":      "password",
	"123456":        "123456",
}

// logHoneypotIncident records the incident to DB
func logHoneypotIncident(c *fiber.Ctx, typeName string, data map[string]interface{}) {
	ip := utils.GetClientIP(c)
	userAgent := c.Get("User-Agent")

	incident := models.HoneypotLog{
		IncidentTime:  time.Now(),
		IPAddress:     ip,
		UserAgent:     userAgent,
		HoneypotType:  typeName,
		SubmittedData: data,
	}

	honeypotColl := database.GetCollection("honeypotlogs")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := honeypotColl.InsertOne(ctx, incident)
	if err != nil {
		c.Context().Logger().Printf("Failed to log honeypot incident: %v", err)
	}

	// Log to main activity log (MERN Logic)
	utils.LogActivity(c, "honeypot_triggered", map[string]interface{}{
		"honeypot_type": typeName,
		"submitted_data": data,
	}, map[string]interface{}{"username": "honeypot"})
}

// FakeAdminLogin handles fake admin login attempts
// FIXED: Nama fungsi diubah menjadi Kapital (FakeAdminLogin)
func FakeAdminLogin(c *fiber.Ctx) error {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := c.BodyParser(&req); err != nil {
		// Log attempt even if parsing fails
		logHoneypotIncident(c, "fake_admin_login_attempt", map[string]interface{}{
			"error": "invalid_body",
		})
		return utils.ErrorResponse(c, 400, "Invalid request body")
	}

	username := utils.SanitizeString(req.Username, 100)
	password := utils.SanitizeString(req.Password, 100)

	// Log the honeypot incident
	logHoneypotIncident(c, "fake_admin_login_attempt", map[string]interface{}{
		"username": username,
		"password": password,
	})

	// Check if credentials match any fake ones
	usernameNormalized := strings.ToLower(username)
	isValidFakeCredential := FAKE_CREDENTIALS[usernameNormalized] == password

	if isValidFakeCredential {
		// Trigger rickroll for fake successful login
		return c.JSON(fiber.Map{
			"success":         true,
			"message":         "Login berhasil! Mengalihkan ke dashboard...",
			"triggerRickroll": true,
		})
	}

	// Return fake error for invalid credentials
	return c.Status(401).JSON(fiber.Map{
		"success":         false,
		"message":         "Username atau password salah.",
		"triggerRickroll": false,
	})
}

// LogAdminAccess handles logging unauthorized admin page access
// FIXED: Nama fungsi diubah menjadi Kapital (LogAdminAccess)
func LogAdminAccess(c *fiber.Ctx) error {
	logHoneypotIncident(c, "admin_page_access_attempt", map[string]interface{}{
		"referrer": c.Get("Referer"),
	})

	return c.JSON(fiber.Map{
		"message":      "Admin access logged",
		"showFakeLogin": true,
	})
}

// GetHoneypotStats returns honeypot statistics (Admin only)
func GetHoneypotStats(c *fiber.Ctx) error {
	honeypotColl := database.GetCollection("honeypotlogs")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	totalAttempts, _ := honeypotColl.CountDocuments(ctx, bson.M{})
	loginAttempts, _ := honeypotColl.CountDocuments(ctx, bson.M{"honeypot_type": "fake_admin_login_attempt"})
	accessAttempts, _ := honeypotColl.CountDocuments(ctx, bson.M{"honeypot_type": "admin_page_access_attempt"})

	yesterday := time.Now().Add(-24 * time.Hour)
	recentAttempts, _ := honeypotColl.CountDocuments(ctx, bson.M{"incident_time": bson.M{"$gte": yesterday}})

	uniqueIPs, _ := honeypotColl.Distinct(ctx, "ip_address", bson.M{})

	// Get top attempted usernames (Aggregation)
	topUsernamesPipeline := []bson.M{
		{"$match": bson.M{"honeypot_type": "fake_admin_login_attempt"}},
		{"$group": bson.M{"_id": "$submitted_data.username", "count": bson.M{"$sum": 1}}},
		{"$sort": bson.M{"count": -1}},
		{"$limit": 10},
	}
	cursor, err := honeypotColl.Aggregate(ctx, topUsernamesPipeline)
	var topUsernames []bson.M
	if err == nil {
		cursor.All(ctx, &topUsernames)
	}

	return c.JSON(fiber.Map{
		"totalAttempts":    totalAttempts,
		"loginAttempts":    loginAttempts,
		"accessAttempts":   accessAttempts,
		"recentAttempts":   recentAttempts,
		"uniqueIPs":        len(uniqueIPs),
		"topUsernames":     topUsernames,
	})
}