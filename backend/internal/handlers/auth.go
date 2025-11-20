package handlers

import (
	"context"
	"regexp"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"

	"solivra-go/backend/internal/config"
	"solivra-go/backend/internal/database"
	"solivra-go/backend/internal/models"
	"solivra-go/backend/internal/services"
	"solivra-go/backend/pkg/utils"
)

// Regex untuk validasi username (huruf kecil, angka, ., _, @)
var usernameRegex = regexp.MustCompile(`^[a-z0-9](?:[a-z0-9._@]{0,29})$`)

type LoginRequest struct {
	Username   string `json:"username"`
	Password   string `json:"password"`
	RememberMe bool   `json:"rememberMe"`
}

type RegisterRequest struct {
	Nickname     string `json:"nickname"`
	Username     string `json:"username"`
	Password     string `json:"password"`
	LanguagePref string `json:"language_pref"`
}

// Login handles user login
func Login(c *fiber.Ctx) error {
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.ErrorResponse(c, 400, "Invalid request body")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	ip := utils.GetClientIP(c)
	userAgent := c.Get("User-Agent")
	now := time.Now()

	// Sanitize and validate
	username := utils.SanitizeString(req.Username, 120)
	username = strings.ToLower(username)
	password := req.Password

	if username == "" || password == "" {
		utils.LogActivity(c, "auth_login_failed", map[string]interface{}{
			"reason":          "missing_credentials",
			"usernameAttempt": username,
		}, map[string]interface{}{"username": "guest"})
		return utils.ErrorResponse(c, 400, "Username dan password wajib diisi")
	}

	// 1. Cek IP Lock (Brute Force Protection)
	loginAttemptsColl := database.GetCollection("loginattempts")
	var activeIpLock models.LoginAttempt
	err := loginAttemptsColl.FindOne(ctx, bson.M{
		"ip_address":    ip,
		"outcome":       "ip_locked",
		"lockout_until": bson.M{"$gt": now},
	}, options.FindOne().SetSort(bson.D{{Key: "attempt_time", Value: -1}})).Decode(&activeIpLock)

	if err == nil {
		utils.LogActivity(c, "security_ip_lock", map[string]interface{}{
			"lockout_until": activeIpLock.LockoutUntil,
			"ip":            ip,
		}, map[string]interface{}{"username": "guest"})

		return c.Status(429).JSON(fiber.Map{
			"ok":  false,
			"msg": "Form login sementara dinonaktifkan untuk IP ini. Coba lagi nanti.",
			"lockout": fiber.Map{
				"type":  "ip",
				"until": activeIpLock.LockoutUntil,
			},
		})
	}

	// 2. Cari User di Database
	usersColl := database.GetCollection("users")
	var user models.User

	err = usersColl.FindOne(ctx, bson.M{
		"username": username, // Username sudah di-lowercase
	}).Decode(&user)

	// Jika User Tidak Ditemukan
	if err != nil {
		// Catat kegagalan
		loginAttemptsColl.InsertOne(ctx, models.LoginAttempt{
			Username:    username,
			IPAddress:   ip,
			UserAgent:   userAgent,
			Outcome:     "user_not_found",
			AttemptTime: now,
		})

		// Cek apakah IP ini sering mencoba user acak (IP Lock Logic)
		oneHourAgo := now.Add(-1 * time.Hour)
		unknownAttempts, _ := loginAttemptsColl.CountDocuments(ctx, bson.M{
			"ip_address":   ip,
			"outcome":      "user_not_found",
			"attempt_time": bson.M{"$gte": oneHourAgo},
		})

		if unknownAttempts >= 5 {
			lockoutUntil := now.Add(1 * time.Hour)
			loginAttemptsColl.InsertOne(ctx, models.LoginAttempt{
				Username:     username,
				IPAddress:    ip,
				UserAgent:    userAgent,
				Outcome:      "ip_locked",
				LockoutUntil: &lockoutUntil,
				AttemptTime:  now,
			})

			utils.LogActivity(c, "security_ip_lock", map[string]interface{}{
				"lockout_until": lockoutUntil,
				"attempts":      unknownAttempts,
			}, map[string]interface{}{"username": "guest"})

			return c.Status(429).JSON(fiber.Map{
				"ok":  false,
				"msg": "Form login dinonaktifkan selama 1 jam untuk IP ini.",
				"lockout": fiber.Map{
					"type":  "ip",
					"until": lockoutUntil,
				},
			})
		}

		utils.LogActivity(c, "auth_login_failed", map[string]interface{}{
			"reason":          "user_not_found",
			"usernameAttempt": username,
		}, map[string]interface{}{"username": "guest"})

		return utils.ErrorResponse(c, 401, "Username atau password salah")
	}

	// 3. Cek User Lock (Jika akun dikunci karena terlalu banyak gagal password)
	if user.LockoutUntil != nil && user.LockoutUntil.After(now) {
		loginAttemptsColl.InsertOne(ctx, models.LoginAttempt{
			UserID:       &user.ID,
			Username:     user.Username,
			IPAddress:    ip,
			UserAgent:    userAgent,
			Outcome:      "locked",
			LockoutUntil: user.LockoutUntil,
			AttemptTime:  now,
		})

		utils.LogActivity(c, "auth_login_blocked", map[string]interface{}{
			"reason":       "user_locked",
			"locked_until": user.LockoutUntil,
		}, map[string]interface{}{"userId": user.ID.Hex(), "username": user.Username})

		return c.Status(423).JSON(fiber.Map{
			"ok":  false,
			"msg": "Akun Anda sedang dikunci. Coba lagi beberapa menit lagi.",
			"lockout": fiber.Map{
				"type":  "user",
				"until": user.LockoutUntil,
			},
		})
	}

	// 4. Cek Password
	if !utils.CheckPasswordHash(password, user.Password) {
		user.FailedLoginAttempts++
		attemptsRemaining := 10 - user.FailedLoginAttempts
		if attemptsRemaining < 0 {
			attemptsRemaining = 0
		}

		var lockoutUntil *time.Time
		statusCode := 401
		msg := "Username atau password salah."

		// Jika gagal 10x, kunci akun 10 menit
		if user.FailedLoginAttempts >= 10 {
			t := now.Add(10 * time.Minute)
			lockoutUntil = &t
			user.LockoutUntil = lockoutUntil
			user.FailedLoginAttempts = 0
			attemptsRemaining = 0
			statusCode = 423
			msg = "Akun dikunci selama 10 menit karena terlalu banyak percobaan gagal."
		}

		// Update user di DB
		usersColl.UpdateOne(ctx, bson.M{"_id": user.ID}, bson.M{
			"$set": bson.M{
				"failed_login_attempts": user.FailedLoginAttempts,
				"lockout_until":         user.LockoutUntil,
			},
		})

		// Log attempt
		loginAttemptsColl.InsertOne(ctx, models.LoginAttempt{
			UserID:            &user.ID,
			Username:          user.Username,
			IPAddress:         ip,
			UserAgent:         userAgent,
			Outcome:           "invalid_password",
			LockoutUntil:      lockoutUntil,
			AttemptsRemaining: &attemptsRemaining,
			AttemptTime:       now,
		})

		utils.LogActivity(c, "auth_login_failed", map[string]interface{}{
			"reason":             "invalid_password",
			"attempts_remaining": attemptsRemaining,
			"locked_until":       lockoutUntil,
		}, map[string]interface{}{"userId": user.ID.Hex(), "username": user.Username})

		return c.Status(statusCode).JSON(fiber.Map{
			"ok":                false,
			"msg":               msg,
			"attemptsRemaining": attemptsRemaining,
			"lockout":           lockoutUntil,
		})
	}

	// 5. Login Sukses
	// Reset failed attempts
	usersColl.UpdateOne(ctx, bson.M{"_id": user.ID}, bson.M{
		"$set": bson.M{
			"failed_login_attempts": 0,
			"lockout_until":         nil,
		},
	})

	// Generate tokens
	accessToken, err := utils.GenerateAccessToken(&user)
	if err != nil {
		return utils.ErrorResponse(c, 500, "Failed to generate access token")
	}

	refreshToken, err := utils.GenerateRefreshToken(user.ID, req.RememberMe)
	if err != nil {
		return utils.ErrorResponse(c, 500, "Failed to generate refresh token")
	}

	// Generate Session Token
	sessionToken, err := utils.GenerateRandomToken(48)
	if err != nil {
		return utils.ErrorResponse(c, 500, "Failed to create session token")
	}

	// Simpan Sesi ke DB
	sessionsColl := database.GetCollection("usersessions")
	session := models.UserSession{
		UserID:         user.ID,
		Token:          utils.HashToken(sessionToken),
		IPAddress:      ip,
		UserAgent:      userAgent,
		LoginTime:      now,
		LastActiveTime: now,
	}

	insertResult, err := sessionsColl.InsertOne(ctx, session)
	if err != nil {
		return utils.ErrorResponse(c, 500, "Failed to save session")
	}

	// Log sukses di LoginAttempt
	loginAttemptsColl.InsertOne(ctx, models.LoginAttempt{
		UserID:      &user.ID,
		Username:    user.Username,
		IPAddress:   ip,
		UserAgent:   userAgent,
		Outcome:     "success",
		AttemptTime: now,
	})

	// Set Cookies di Browser
	services.SetAuthCookies(c, accessToken, refreshToken, sessionToken, req.RememberMe)

	// Log aktivitas umum
	utils.LogActivity(c, "auth_login_success", map[string]interface{}{
		"session_id":  insertResult.InsertedID.(primitive.ObjectID).Hex(),
		"ip_address":  ip,
		"user_agent":  userAgent,
		"remember_me": req.RememberMe,
	}, map[string]interface{}{
		"userId":   user.ID.Hex(),
		"username": user.Username,
	})

	// Response JSON ke Frontend
	return c.JSON(fiber.Map{
		"ok":            true,
		"msg":           "Login berhasil",
		"access_token":  accessToken,
		"refresh_token": refreshToken,
		"session_token": sessionToken,
		"user": fiber.Map{
			"id":            user.ID.Hex(),
			"username":      user.Username,
			"role":          user.Role,
			"language_pref": user.LanguagePref,
		},
	})
}

// Register handles user registration
func Register(c *fiber.Ctx) error {
	var req RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.ErrorResponse(c, 400, "Invalid request body")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	ip := utils.GetClientIP(c)
	userAgent := c.Get("User-Agent")
	now := time.Now()

	// Sanitize inputs
	nickname := utils.SanitizeString(req.Nickname, 120)
	username := utils.SanitizeString(req.Username, 30)
	username = strings.ToLower(username)
	password := req.Password
	languagePref := utils.SanitizeString(req.LanguagePref, 10)

	if nickname == "" || username == "" || password == "" {
		return utils.ErrorResponse(c, 400, "Semua kolom wajib diisi")
	}

	// Validasi Username dengan Regex
	if !usernameRegex.MatchString(username) {
		return utils.ErrorResponse(c, 400, "Username hanya boleh mengandung huruf latin kecil, angka, titik, underscore, atau @ (1-30 karakter)")
	}

	if len(password) < 8 {
		return utils.ErrorResponse(c, 400, "Password minimal 8 karakter")
	}

	// 1. Cek Blokir Registrasi (IP Lock)
	regAttemptsColl := database.GetCollection("registrationattempts")
	var block models.RegistrationAttempt
	err := regAttemptsColl.FindOne(ctx, bson.M{
		"ip_address":    ip,
		"status":        "blocked",
		"blocked_until": bson.M{"$gt": now},
	}, options.FindOne().SetSort(bson.D{{Key: "attempt_time", Value: -1}})).Decode(&block)

	if err == nil {
		return c.Status(429).JSON(fiber.Map{
			"ok":  false,
			"msg": "Form registrasi dinonaktifkan sementara untuk IP ini.",
			"lockout": fiber.Map{
				"type":  "registration",
				"until": block.BlockedUntil,
			},
		})
	}

	// 2. Cek Batas Harian (Daily Limit)
	dayAgo := now.Add(-24 * time.Hour)
	recentRegistrations, _ := regAttemptsColl.CountDocuments(ctx, bson.M{
		"ip_address":   ip,
		"status":       "success",
		"attempt_time": bson.M{"$gte": dayAgo},
	})

	if recentRegistrations >= 5 {
		lockoutUntil := now.Add(24 * time.Hour)
		regAttemptsColl.InsertOne(ctx, models.RegistrationAttempt{
			IPAddress:    ip,
			Username:     username,
			AttemptTime:  now,
			Status:       "blocked",
			BlockedUntil: &lockoutUntil,
		})

		utils.LogActivity(c, "security_registration_block", map[string]interface{}{
			"lockout_until": lockoutUntil,
			"attempts":      recentRegistrations,
		}, map[string]interface{}{"username": "guest"})

		return c.Status(429).JSON(fiber.Map{
			"ok":  false,
			"msg": "Batas pembuatan akun tercapai untuk hari ini.",
			"lockout": fiber.Map{
				"type":  "registration",
				"until": lockoutUntil,
			},
		})
	}

	// 3. Cek Username Tersedia
	usersColl := database.GetCollection("users")
	count, err := usersColl.CountDocuments(ctx, bson.M{
		"username": username,
	})
	if err != nil {
		return utils.ErrorResponse(c, 500, "Server error checking username")
	}

	if count > 0 {
		return utils.ErrorResponse(c, 400, "Username sudah digunakan")
	}

	// 4. Hash Password & Create User
	hashedPassword, err := utils.HashPassword(password)
	if err != nil {
		return utils.ErrorResponse(c, 500, "Failed to hash password")
	}

	role := "user"
	if config.CanAutoAdmin(username) {
		role = "admin"
	}

	user := models.User{
		ID:             primitive.NewObjectID(),
		Nickname:       nickname,
		Username:       username,
		Password:       hashedPassword,
		Role:           role,
		LanguagePref:   languagePref,
		ProfilePicture: "/default.png",
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	result, err := usersColl.InsertOne(ctx, user)
	if err != nil {
		return utils.ErrorResponse(c, 500, "Failed to create user")
	}

	// Catat Registrasi Sukses
	regAttemptsColl.InsertOne(ctx, models.RegistrationAttempt{
		IPAddress:   ip,
		Username:    username,
		AttemptTime: now,
		Status:      "success",
	})

	utils.LogActivity(c, "auth_register", map[string]interface{}{
		"username":   username,
		"nickname":   nickname,
		"ip_address": ip,
		"user_agent": userAgent,
	}, map[string]interface{}{
		"userId":   result.InsertedID.(primitive.ObjectID).Hex(),
		"username": username,
	})

	return c.JSON(fiber.Map{
		"ok":  true,
		"msg": "Registrasi berhasil!",
	})
}

// Refresh handles token refresh
func Refresh(c *fiber.Ctx) error {
	refreshToken := c.Cookies("refresh_token")
	if refreshToken == "" {
		refreshToken = c.Get("X-Refresh-Token")
	}
	if refreshToken == "" {
		return utils.ErrorResponse(c, 401, "Tidak ada refresh token")
	}

	claims, err := utils.ValidateRefreshToken(refreshToken)
	if err != nil {
		return utils.ErrorResponse(c, 401, "Refresh token tidak valid")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	userID, err := primitive.ObjectIDFromHex(claims.UserID)
	if err != nil {
		return utils.ErrorResponse(c, 401, "Invalid user ID")
	}

	// Cek User
	usersColl := database.GetCollection("users")
	var user models.User
	err = usersColl.FindOne(ctx, bson.M{"_id": userID}).Decode(&user)
	if err != nil {
		return utils.ErrorResponse(c, 401, "Pengguna tidak ditemukan")
	}

	// Cek Validitas Session
	sessionToken := c.Cookies("session_token")
	if sessionToken == "" {
		sessionToken = c.Get("X-Session-Token")
		if sessionToken == "" {
			services.ClearAuthCookies(c)
			return utils.ErrorResponse(c, 401, "Session token tidak ditemukan")
		}
	}

	sessionHash := utils.HashToken(sessionToken)
	sessionsColl := database.GetCollection("usersessions")

	var session models.UserSession
	err = sessionsColl.FindOne(ctx, bson.M{
		"user":       user.ID,
		"token":      sessionHash,
		"revoked_at": nil, // Session harus belum revoked
	}).Decode(&session)

	if err != nil {
		services.ClearAuthCookies(c)
		return utils.ErrorResponse(c, 401, "Session sudah tidak berlaku (Revoked or Invalid)")
	}

	// Generate Token Baru
	newAccessToken, err := utils.GenerateAccessToken(&user)
	if err != nil {
		return utils.ErrorResponse(c, 500, "Failed to generate access token")
	}

	newRefreshToken, err := utils.GenerateRefreshToken(user.ID, claims.RememberMe)
	if err != nil {
		return utils.ErrorResponse(c, 500, "Failed to generate refresh token")
	}

	// Update Activity Session
	sessionsColl.UpdateOne(ctx, bson.M{"_id": session.ID}, bson.M{
		"$set": bson.M{"last_active_time": time.Now()},
	})

	services.SetAuthCookies(c, newAccessToken, newRefreshToken, sessionToken, claims.RememberMe)

	return c.JSON(fiber.Map{
		"ok":            true,
		"access_token":  newAccessToken,
		"refresh_token": newRefreshToken,
	})
}

// Logout handles user logout
func Logout(c *fiber.Ctx) error {
	sessionToken := c.Cookies("session_token")

	if sessionToken != "" {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		sessionHash := utils.HashToken(sessionToken)
		sessionsColl := database.GetCollection("usersessions")

		// Tandai sesi sebagai revoked
		now := time.Now()
		sessionsColl.UpdateOne(ctx, bson.M{
			"token":      sessionHash,
			"revoked_at": nil,
		}, bson.M{
			"$set": bson.M{
				"revoked_at":       now,
				"last_active_time": now,
			},
		})
	} else {
		// Support header session token fallback
		if headerToken := c.Get("X-Session-Token"); headerToken != "" {
			sessionToken = headerToken
			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()

			sessionHash := utils.HashToken(sessionToken)
			sessionsColl := database.GetCollection("usersessions")

			now := time.Now()
			sessionsColl.UpdateOne(ctx, bson.M{
				"token":      sessionHash,
				"revoked_at": nil,
			}, bson.M{
				"$set": bson.M{
					"revoked_at":       now,
					"last_active_time": now,
				},
			})
		}
	}

	userID := c.Locals("userID")
	if strID, ok := userID.(string); ok && strID != "" {
		utils.LogActivity(c, "auth_logout", nil, map[string]interface{}{
			"userId": strID,
		})
	}

	services.ClearAuthCookies(c)

	return c.JSON(fiber.Map{
		"ok": true,
	})
}
