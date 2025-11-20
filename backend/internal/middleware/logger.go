package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"solivra-go/backend/pkg/utils"
)

// ActivityLoggerMiddleware records general activity logs for API calls and page views.
func ActivityLoggerMiddleware(c *fiber.Ctx) error {
	// Skip logging OPTIONS requests
	if c.Method() == fiber.MethodOptions {
		return c.Next()
	}

	path := c.Path()
	
	// Skip internal logger from running if path is the public tracking endpoint
	// This endpoint is handled specifically by handlers.TrackVisit
	if path == "/api/track-visit" {
		return c.Next()
	}
	
	// Tentukan Action: Di MERN, logger default mencatat 'page_view' atau 'api_call'
	action := "api_call"
	// Check if this looks like a public page view (GET and not starting with /api/)
	if c.Method() == fiber.MethodGet && !strings.HasPrefix(path, "/api/") {
		action = "page_view"
	}

	// Log activity in a non-blocking way
	utils.LogActivity(c, action, fiber.Map{
		"path":   path,
		"method": c.Method(),
	}, nil) // Metadata (User, IP, UA) fetched inside utils.LogActivity automatically

	return c.Next()
}