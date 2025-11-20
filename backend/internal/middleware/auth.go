// internal/middleware/auth.go
package middleware

import (
	"context"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"solivra-go/backend/internal/database"
	"solivra-go/backend/internal/models"
	"solivra-go/backend/internal/services"
	"solivra-go/backend/pkg/utils"
)

// Protected protects routes ensuring a valid access token and active session
func Protected() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// 1. Ambil Access Token (Prioritas: Header -> Cookie)
		var tokenString string
		authHeader := c.Get("Authorization")

		if len(authHeader) > 7 && strings.ToUpper(authHeader[:6]) == "BEARER" {
			tokenString = authHeader[7:]
		} else {
			tokenString = c.Cookies("access_token")
		}

		if tokenString == "" {
			return utils.ErrorResponse(c, 401, "Unauthorized: No access token")
		}

		// 2. Validasi JWT Access Token
		claims, err := utils.ValidateAccessToken(tokenString)
		if err != nil {
			return utils.ErrorResponse(c, 401, "Unauthorized: Invalid token")
		}

		// 3. Ambil Session Token dari Cookie
		sessionToken := c.Cookies("session_token")
		// Jika session token tidak ada di cookie, coba ambil dari header (untuk klien non-browser opsional)
		if sessionToken == "" {
			sessionToken = c.Get("X-Session-Token")
		}

		if sessionToken == "" {
			// Jika login via browser (ada cookie access_token), session_token wajib ada.
			// Kita clear cookie untuk memaksa login ulang.
			services.ClearAuthCookies(c)
			return utils.ErrorResponse(c, 401, "Unauthorized: No session token")
		}

		// 4. Verifikasi Session di Database (PENTING UNTUK SECURITY)
		// Kita hash token yang diterima dari klien untuk dicocokkan dengan hash di DB
		sessionHash := utils.HashToken(sessionToken)

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		sessionsColl := database.GetCollection("usersessions")
		var session models.UserSession

		// Convert UserID dari claims ke ObjectID
		userObjID, _ := primitive.ObjectIDFromHex(claims.User.ID)

		// Cari sesi yang cocok, milik user ini, dan BELUM di-revoke
		err = sessionsColl.FindOne(ctx, bson.M{
			"user":       userObjID,
			"token":      sessionHash,
			"revoked_at": nil, // Session harus aktif
		}).Decode(&session)

		if err != nil {
			// Sesi tidak ditemukan atau sudah di-revoke -> Logout paksa
			services.ClearAuthCookies(c)
			return utils.ErrorResponse(c, 401, "Unauthorized: Session revoked or invalid")
		}

		// 5. Update Last Active Time (Async agar cepat)
		go func(sessID primitive.ObjectID) {
			bgCtx, bgCancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer bgCancel()
			sessionsColl.UpdateOne(bgCtx, bson.M{"_id": sessID}, bson.M{
				"$set": bson.M{"last_active_time": time.Now()},
			})
		}(session.ID)

		// 6. Set User Info ke Locals (Context) agar bisa dipakai di handler lain
		c.Locals("userID", claims.User.ID)
		// Maintain backward compatibility with handlers expecting userId (lowercase)
		c.Locals("userId", claims.User.ID)
		c.Locals("username", claims.User.Username)
		c.Locals("role", claims.User.Role)

		// Simpan juga UserID dalam bentuk ObjectID untuk query DB yang lebih mudah
		c.Locals("userObjectID", userObjID)
		// Simpan hash sesi agar handler lain (password change, session revoke, dsb) tidak perlu menghitung ulang
		c.Locals("sessionHash", sessionHash)

		return c.Next()
	}
}

// AdminOnly ensures the user has 'admin' role
func AdminOnly() fiber.Handler {
	return func(c *fiber.Ctx) error {
		role := c.Locals("role")
		if role != "admin" {
			return utils.ErrorResponse(c, 403, "Forbidden: Admin access required")
		}
		return c.Next()
	}
}
