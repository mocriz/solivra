package utils

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson/primitive"
	
	"solivra-go/backend/internal/database"
	"solivra-go/backend/internal/models"
)

// LogActivityInternal is the core function to record activities to the database.
// This function must run in a separate goroutine and handle its own context.
func LogActivityInternal(ctx context.Context, action string, details map[string]interface{}, metadata map[string]interface{}) {
	
	// Default values
	username := "system"
	if uname, ok := metadata["username"].(string); ok && uname != "" {
		username = SanitizeString(uname, 120)
	} else if defUname, ok := metadata["defaultUsername"].(string); ok && defUname != "" {
		username = defUname
	}

	// Prepare userID (can be null)
	var userID *primitive.ObjectID
	if userIDHex, ok := metadata["userId"].(string); ok {
		objID, err := primitive.ObjectIDFromHex(userIDHex)
		if err == nil {
			userID = &objID
		}
	} else if objID, ok := metadata["userId"].(*primitive.ObjectID); ok && objID != nil {
		userID = objID
	}


	// Prepare IP and UserAgent
	ipAddress := "unknown"
	if ip, ok := metadata["ip_address"].(string); ok && ip != "" {
		ipAddress = SanitizeString(ip, 45)
	}
	userAgent := ""
	if ua, ok := metadata["user_agent"].(string); ok && ua != "" {
		userAgent = SanitizeString(ua, 512)
	}

	// Create log entry
	logEntry := models.ActivityLog{
		ID:        primitive.NewObjectID(),
		UserID:    userID,
		Username:  username,
		Action:    SanitizeString(action, 255),
		Details:   details,
		IPAddress: ipAddress,
		UserAgent: userAgent,
		Timestamp: time.Now(),
	}

	// Insert into MongoDB
	activityColl := database.GetCollection("activitylogs")
	// Kita mengabaikan error di sini (swallow logging error) sesuai praktik MERN
	activityColl.InsertOne(ctx, logEntry)
}

// LogActivity is the public wrapper to log activities, usually called from handlers.
// It sets metadata from Fiber context and runs internally.
func LogActivity(c *fiber.Ctx, action string, details interface{}, metadata map[string]interface{}) {
	
	// --- EKSTRAKSI DATA AMAN DARI FIBER CTX SEBELUM GOROUTINE ---
	
	// 1. Inisialisasi metadata jika nil
	if metadata == nil {
		metadata = make(map[string]interface{})
	}

	// 2. Ekstrak IP dan User Agent
	if _, ok := metadata["ip_address"]; !ok {
		metadata["ip_address"] = GetClientIP(c) // GetClientIP should retrieve IP using c.IP() safely
	}
	if _, ok := metadata["user_agent"]; !ok {
		metadata["user_agent"] = c.Get("User-Agent")
	}

	// 3. Ekstrak Locals (User ID/Username)
	// Kita harus mengambil nilainya sebelum dilempar ke goroutine
	if _, ok := metadata["username"]; !ok {
		if uname := c.Locals("username"); uname != nil {
			metadata["username"] = uname.(string)
		}
	}
	if _, ok := metadata["userId"]; !ok {
		if userID := c.Locals("userObjectID"); userID != nil {
			// Simpan string Hex ID untuk logging context
			metadata["userId"] = userID.(primitive.ObjectID).Hex()
		}
	}
	
	// 4. Siapkan detail map
	detailMap := make(map[string]interface{})
	if d, ok := details.(map[string]interface{}); ok {
		detailMap = d
	} else if d, ok := details.(fiber.Map); ok {
		for k, v := range d {
			detailMap[k] = v
		}
	}

	// --- Jalankan LogActivityInternal di Goroutine ---
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		
		// Gunakan data yang sudah diekstrak dan disalin
		LogActivityInternal(ctx, action, detailMap, metadata)
	}()
}