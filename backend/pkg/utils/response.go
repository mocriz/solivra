// pkg/utils/response.go
package utils

import "github.com/gofiber/fiber/v2"

// ErrorResponse sends a standardized error response consistent with MERN frontend
// MERN frontend usually expects { ok: false, msg: "Error message" }
func ErrorResponse(c *fiber.Ctx, status int, message string) error {
	return c.Status(status).JSON(fiber.Map{
		"ok":  false,
		"msg": message,
	})
}

// SuccessResponse sends a standardized success response
func SuccessResponse(c *fiber.Ctx, message string, data interface{}) error {
	response := fiber.Map{
		"ok":  true,
		"msg": message,
	}

	// Add data if provided
	if data != nil {
		// If data is a map, merge it with response (useful for login returning {ok: true, user: ...})
		if dataMap, ok := data.(map[string]interface{}); ok {
			for k, v := range dataMap {
				response[k] = v
			}
		} else if dataFiberMap, ok := data.(fiber.Map); ok {
			for k, v := range dataFiberMap {
				response[k] = v
			}
		} else {
			// Default fallback
			response["data"] = data
		}
	}

	return c.JSON(response)
}

// GetClientIP extracts client IP from request
func GetClientIP(c *fiber.Ctx) string {
	// Check X-Forwarded-For header first (for proxy/cloud deployment)
	if xff := c.Get("X-Forwarded-For"); xff != "" {
		return xff
	}
	// Fall back to RemoteIP
	return c.IP()
}