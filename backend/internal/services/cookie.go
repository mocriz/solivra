package services

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"solivra-go/backend/internal/config"
)

func SetAuthCookies(c *fiber.Ctx, accessToken, refreshToken, sessionToken string, rememberMe bool) {
	isProd := config.IsProd()

	// FIXED: Menggunakan string literal "Lax" atau "None"
	sameSiteValue := "Lax" 
	if isProd {
		sameSiteValue = "None"
	}

	// Access Token (Short lived: 15m)
	c.Cookie(&fiber.Cookie{
		Name:     "access_token",
		Value:    accessToken,
		Expires:  time.Now().Add(15 * time.Minute),
		HTTPOnly: true,
		Secure:   isProd,
		SameSite: sameSiteValue, // Menggunakan string yang sudah ditentukan
		Path:     "/",
	})

	// Refresh Token (Long lived)
	refreshDuration := 7 * 24 * time.Hour
	if rememberMe {
		refreshDuration = 30 * 24 * time.Hour
	}

	// Session Duration (24h jika tidak rememberMe, sama dengan refreshDuration jika rememberMe)
	sessionDuration := refreshDuration
	if !rememberMe {
		sessionDuration = 24 * time.Hour 
	}
	
	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    refreshToken,
		Expires:  time.Now().Add(refreshDuration),
		HTTPOnly: true,
		Secure:   isProd,
		SameSite: sameSiteValue,
		Path:     "/api/auth/refresh",
	})

	// Session Token
	c.Cookie(&fiber.Cookie{
		Name:     "session_token",
		Value:    sessionToken,
		Expires:  time.Now().Add(sessionDuration),
		HTTPOnly: true,
		Secure:   isProd,
		SameSite: sameSiteValue,
		Path:     "/",
	})
}

func ClearAuthCookies(c *fiber.Ctx) {
	isProd := config.IsProd() 

	// FIXED: Menggunakan string literal "Lax" atau "None"
	sameSiteValue := "Lax" 
	if isProd {
		sameSiteValue = "None"
	}

	c.Cookie(&fiber.Cookie{
		Name:     "access_token",
		Value:    "",
		Expires:  time.Now().Add(-1 * time.Hour), // Expire immediately
		HTTPOnly: true,
		Secure:   isProd,
		SameSite: sameSiteValue,
		Path:     "/",
	})

	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    "",
		Expires:  time.Now().Add(-1 * time.Hour),
		HTTPOnly: true,
		Secure:   isProd,
		SameSite: sameSiteValue,
		Path:     "/api/auth/refresh",
	})

	c.Cookie(&fiber.Cookie{
		Name:     "session_token",
		Value:    "",
		Expires:  time.Now().Add(-1 * time.Hour),
		HTTPOnly: true,
		Secure:   isProd,
		SameSite: sameSiteValue,
		Path:     "/",
	})
}