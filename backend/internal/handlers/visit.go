package handlers

import (
	"github.com/gofiber/fiber/v2"
	"solivra-go/backend/pkg/utils"
)

// TrackVisit handles POST /api/track-visit
// Mereplikasi logika dari backend/server.js untuk mencatat page_view ke ActivityLog
func TrackVisit(c *fiber.Ctx) error {
	var req struct {
		Path     string `json:"path"`
		Username string `json:"username"`
	}
	// Logika Node.js mengabaikan parsing error dan menganggap path="/"
	if err := c.BodyParser(&req); err != nil {
		req.Path = "/"
	}

	// Sanitasi input (Mirip dengan logic Node.js)
	path := utils.SanitizeString(req.Path, 240)
	clientUsername := utils.SanitizeString(req.Username, 120)

	details := fiber.Map{"path": path}
	metadata := make(map[string]interface{})
	
	if clientUsername != "" {
		details["username"] = clientUsername
		// Username akan digunakan sebagai fallback di logger jika tidak ada sesi user
		metadata["defaultUsername"] = clientUsername 
	} else {
		metadata["defaultUsername"] = "guest"
	}

	// Catat aktivitas page_view (LogActivity handles goroutine dan context)
	utils.LogActivity(c, "page_view", details, metadata)
	
	// Respons cepat
	return c.JSON(fiber.Map{"ok": true})
}