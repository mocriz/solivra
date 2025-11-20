package handlers

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	
	"solivra-go/backend/internal/database"
	"solivra-go/backend/internal/models"
	"solivra-go/backend/internal/services" // Digunakan untuk ClearAuthCookies
	"solivra-go/backend/pkg/utils"
)

// GetMe returns current user profile (Sudah Ada)
func GetMe(c *fiber.Ctx) error {
	userID := c.Locals("userObjectID").(primitive.ObjectID)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// 1. Get User
	usersColl := database.GetCollection("users")
	var user models.User
	err := usersColl.FindOne(ctx, bson.M{"_id": userID}).Decode(&user)
	if err != nil {
		return utils.ErrorResponse(c, 404, "User not found")
	}

	// 2. Get Relapses 
	relapsesColl := database.GetCollection("relapselogs")
	cursor, err := relapsesColl.Find(ctx, bson.M{"user": userID})
	var relapses []models.RelapseLog
	if err == nil {
		cursor.All(ctx, &relapses)
	}
	if relapses == nil {
		relapses = []models.RelapseLog{}
	}

	// Return combined struct similar to MERN's fetchUserProfile response
	response := fiber.Map{
		"_id":                    user.ID,
		"nickname":               user.Nickname,
		"username":               user.Username,
		"role":                   user.Role,
		"language_pref":          user.LanguagePref,
		"profile_picture":        user.ProfilePicture,
		"streak_start_date":      user.StreakStartDate,
		"longest_streak_seconds": user.LongestStreakSeconds,
		"created_at":             user.CreatedAt,
		"relapses":               relapses, // Include relapses in user object
	}

	return c.JSON(response)
}

// CheckUsername checks availability (Sudah Ada)
func CheckUsername(c *fiber.Ctx) error {
	rawUsername := c.Params("username")
	username := strings.ToLower(utils.SanitizeString(rawUsername, 30))

	if !utils.ValidateUsername(username) {
		return c.JSON(fiber.Map{"available": false, "message": "Username hanya boleh mengandung huruf latin kecil, angka, titik, underscore, atau @ (1-30 karakter)."})
	}
	
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	usersColl := database.GetCollection("users")
	count, err := usersColl.CountDocuments(ctx, bson.M{"username": username})
	
	if err != nil {
		return utils.ErrorResponse(c, 500, "Error saat memeriksa username.")
	}

	if count > 0 {
		return c.JSON(fiber.Map{"available": false, "message": "Username sudah digunakan."})
	}

	return c.JSON(fiber.Map{"available": true, "message": "Username tersedia!"})
}

// UpdateProfile handles profile updates including image upload (Sudah Ada)
func UpdateProfile(c *fiber.Ctx) error {
	userID := c.Locals("userObjectID").(primitive.ObjectID)
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second) // Longer timeout for upload
	defer cancel()

	usersColl := database.GetCollection("users")
	var user models.User
	if err := usersColl.FindOne(ctx, bson.M{"_id": userID}).Decode(&user); err != nil {
		return utils.ErrorResponse(c, 404, "User not found")
	}

	updateFields := bson.M{"updated_at": time.Now()}
	changes := fiber.Map{} // Menyimpan perubahan untuk log
	
	// Handle form values (text fields)
	form, _ := c.MultipartForm()
	
	// NICKNAME
	if nicknameInput := c.FormValue("nickname"); nicknameInput != "" {
		nickname := utils.SanitizeString(nicknameInput, 120)
		if nickname != user.Nickname {
			updateFields["nickname"] = nickname
			changes["nickname"] = fiber.Map{"from": user.Nickname, "to": nickname}
		}
	}

	// USERNAME
	if usernameInput := c.FormValue("username"); usernameInput != "" {
		newUsername := strings.ToLower(utils.SanitizeString(usernameInput, 30))
		if newUsername != user.Username {
			if !utils.ValidateUsername(newUsername) {
				return utils.ErrorResponse(c, 400, "Username hanya boleh mengandung huruf latin kecil, angka, titik, underscore, atau @ (1-30 karakter).")
			}
			
			// Check uniqueness
			count, _ := usersColl.CountDocuments(ctx, bson.M{"username": newUsername, "_id": bson.M{"$ne": userID}})
			if count > 0 {
				return utils.ErrorResponse(c, 400, "Username sudah digunakan pengguna lain.")
			}
			updateFields["username"] = newUsername
			changes["username"] = fiber.Map{"from": user.Username, "to": newUsername}
		}
	}
	
	// PROFILE PICTURE
	if form != nil && len(form.File["profile_picture"]) > 0 {
		fileHeader := form.File["profile_picture"][0]
		file, err := fileHeader.Open() // file sekarang bertipe io.Reader/multipart.File
		if err == nil {
			defer file.Close()
			
			// 1. Upload to Cloudinary
			url, uploadErr := utils.UploadToCloudinary(file, "profile_pictures") 
			if uploadErr == nil {
				updateFields["profile_picture"] = url
				changes["profile_picture"] = fiber.Map{"from": user.ProfilePicture, "to": url}
				
				// 2. Delete old image (if not default)
				if user.ProfilePicture != "/default.png" {
					utils.DeleteFromCloudinary(user.ProfilePicture)
				}
			} else {
				// Handle case where upload fails
				return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mengunggah foto profil ke Cloudinary.")
			}
		}
	}

	if len(changes) > 0 { // Check if any meaningful field (beyond updated_at) was changed
		// Melakukan update ke DB
		_, err := usersColl.UpdateOne(ctx, bson.M{"_id": userID}, bson.M{"$set": updateFields})
		if err != nil {
			return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Gagal memperbarui profil.")
		}
		
		utils.LogActivity(c, "user_profile_update", fiber.Map{"changes": changes}, nil)
	}
	
	return GetMe(c)
}

// UpdatePassword handles PUT /api/users/password (Implementasi Lengkap)
func UpdatePassword(c *fiber.Ctx) error {
	var req struct {
		CurrentPassword string `json:"current_password"`
		NewPassword     string `json:"new_password"`
	}
	if err := c.BodyParser(&req); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Input tidak valid.")
	}

	userID := c.Locals("userObjectID").(primitive.ObjectID)
	sessionHash := c.Locals("sessionHash").(string) // Diperoleh dari Protected middleware
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	
	usersColl := database.GetCollection("users")
	var user models.User
	if err := usersColl.FindOne(ctx, bson.M{"_id": userID}).Decode(&user); err != nil {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "User not found")
	}

	if len(req.NewPassword) < 6 {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Password baru minimal 6 karakter.")
	}
	if req.CurrentPassword == req.NewPassword {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Password baru tidak boleh sama dengan password lama.")
	}

	// 1. Check current password
	isMatch := utils.CheckPasswordHash(req.CurrentPassword, user.Password)
	if !isMatch {
		utils.LogActivity(c, "user_password_change_failed", fiber.Map{"reason": "invalid_current_password"}, nil)
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Password saat ini salah.")
	}

	// 2. Hash and Save new password
	newHashedPassword, _ := utils.HashPassword(req.NewPassword)
	
	update := bson.M{"$set": bson.M{
		"password": newHashedPassword,
		"updated_at": time.Now(),
	}}
	_, err := usersColl.UpdateOne(ctx, bson.M{"_id": userID}, update)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mengubah password.")
	}

	// 3. Revoke all sessions except the current one (MERN Logic: Revoke all other active sessions)
	sessionColl := database.GetCollection("usersessions")
	now := time.Now()
	
	// Query untuk mencabut sesi: user = ID, revoked_at = null, token != currentHash
	revokeQuery := bson.M{
		"user": user.ID,
		"revoked_at": nil,
		"token": bson.M{"$ne": sessionHash},
	}
	revokeUpdate := bson.M{"$set": bson.M{"revoked_at": now, "last_active_time": now}}
	
	revokeResult, err := sessionColl.UpdateMany(ctx, revokeQuery, revokeUpdate)
	revokedCount := 0
	if err == nil {
		revokedCount = int(revokeResult.ModifiedCount)
	}

	utils.LogActivity(c, "user_password_change", fiber.Map{"revoked_sessions": revokedCount}, nil)

	return c.JSON(fiber.Map{"msg": "Password berhasil diubah."})
}

// UpdateLanguage handles PUT /api/users/language (Implementasi Lengkap)
func UpdateLanguage(c *fiber.Ctx) error {
	var req struct {
		Language string `json:"language"`
	}
	if err := c.BodyParser(&req); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Input tidak valid.")
	}

	rawLanguage := strings.ToLower(utils.SanitizeString(req.Language, 5))
	allowedLanguages := []string{"id", "en"}
	
	isValid := false
	for _, lang := range allowedLanguages {
		if lang == rawLanguage {
			isValid = true
			break
		}
	}
	if !isValid {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Bahasa tidak didukung.")
	}

	userID := c.Locals("userObjectID").(primitive.ObjectID)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	usersColl := database.GetCollection("users")
	
	update := bson.M{"$set": bson.M{"language_pref": rawLanguage, "updated_at": time.Now()}}
	result, err := usersColl.UpdateOne(ctx, bson.M{"_id": userID}, update)
	
	if err != nil || result.ModifiedCount == 0 {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Gagal memperbarui bahasa.")
	}

	// Ambil data user yang sudah diupdate (tanpa password)
	var updatedUser models.User
	usersColl.FindOne(ctx, bson.M{"_id": userID}).Decode(&updatedUser)
	
	utils.LogActivity(c, "user_language_change", fiber.Map{"language": rawLanguage}, nil)

	// Update Fiber Locals (opsional, tapi bagus untuk logger berikutnya)
	c.Locals("language_pref", rawLanguage)
	
	return c.JSON(updatedUser.ToPublic())
}

// RemoveProfilePicture handles DELETE /api/users/profile-picture (Implementasi Lengkap)
func RemoveProfilePicture(c *fiber.Ctx) error {
	userID := c.Locals("userObjectID").(primitive.ObjectID)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	
	usersColl := database.GetCollection("users")
	var user models.User
	if err := usersColl.FindOne(ctx, bson.M{"_id": userID}).Decode(&user); err != nil {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "User not found")
	}
	
	previousPicture := user.ProfilePicture
	
	if previousPicture != "/default.png" {
		utils.DeleteFromCloudinary(previousPicture)
	}
	
	update := bson.M{"$set": bson.M{"profile_picture": "/default.png", "updated_at": time.Now()}}
	_, err := usersColl.UpdateOne(ctx, bson.M{"_id": userID}, update)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menghapus foto profil.")
	}

	// Log Activity
	utils.LogActivity(c, "user_profile_picture_removed", fiber.Map{
		"from": previousPicture,
		"to": "/default.png",
	}, nil)
	
	return GetMe(c)
}


// DeleteAccount handles DELETE /api/users/ (Implementasi Lengkap)
func DeleteAccount(c *fiber.Ctx) error {
	var req struct {
		Password string `json:"password"`
	}
	if err := c.BodyParser(&req); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Input tidak valid.")
	}
	password := req.Password

	userID := c.Locals("userObjectID").(primitive.ObjectID)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	usersColl := database.GetCollection("users")
	var user models.User
	if err := usersColl.FindOne(ctx, bson.M{"_id": userID}).Decode(&user); err != nil {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "User not found")
	}

	// 1. Check Password
	isMatch := utils.CheckPasswordHash(password, user.Password)
	if !isMatch {
		utils.LogActivity(c, "user_account_delete_failed", fiber.Map{"reason": "invalid_password"}, nil)
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Password yang Anda masukkan salah.")
	}

	// 2. Cleanup: Profile Picture
	removedProfilePicture := false
	if user.ProfilePicture != "/default.png" {
		utils.DeleteFromCloudinary(user.ProfilePicture)
		removedProfilePicture = true
	}

	// 3. Cleanup: Relapses
	relapsesColl := database.GetCollection("relapselogs")
	relapsesResult, _ := relapsesColl.DeleteMany(ctx, bson.M{"user": user.ID})
	relapsesRemoved := int(relapsesResult.DeletedCount)

	// 4. Cleanup: Sessions (Revoke All)
	sessionColl := database.GetCollection("usersessions")
	now := time.Now()
	revokeResult, _ := sessionColl.UpdateMany(ctx, bson.M{"user": user.ID, "revoked_at": nil}, bson.M{"$set": bson.M{"revoked_at": now, "last_active_time": now}})
	sessionsRevoked := int(revokeResult.ModifiedCount)

	// 5. Delete User
	usersColl.DeleteOne(ctx, bson.M{"_id": user.ID})

	// 6. Log Activity
	utils.LogActivity(c, "user_account_deleted", fiber.Map{
		"removed_profile_picture": removedProfilePicture,
		"relapses_deleted": relapsesRemoved,
		"sessions_revoked": sessionsRevoked,
	}, nil)

	// 7. Clear Cookies
	services.ClearAuthCookies(c)
	
	return c.JSON(fiber.Map{"msg": "Akun berhasil dihapus."})
}

// GetSessions handles GET /api/users/sessions (Implementasi Lengkap)
func GetSessions(c *fiber.Ctx) error {
	userID := c.Locals("userObjectID").(primitive.ObjectID)
	// sessionHash berisi hash token saat ini dari cookie.
	currentHash := c.Locals("sessionHash").(string) 
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	sessionColl := database.GetCollection("usersessions")
	
	// Ambil sesi yang belum dicabut, diurutkan dari yang paling aktif
	opts := options.Find().SetSort(bson.D{{Key: "last_active_time", Value: -1}})
	cursor, err := sessionColl.Find(ctx, bson.M{"user": userID, "revoked_at": nil}, opts)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mengambil sesi.")
	}
	defer cursor.Close(ctx)

	var sessions []models.UserSession
	if err := cursor.All(ctx, &sessions); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mendekode sesi.")
	}

	mappedSessions := make([]fiber.Map, len(sessions))
	for i, session := range sessions {
		// Session.Token adalah hash yang disimpan di DB
		sessionHash := session.Token 
		
		mappedSessions[i] = fiber.Map{
			"id": session.ID.Hex(), // Kembalikan ID sebagai string Hex
			"ip_address": session.IPAddress,
			"user_agent": session.UserAgent,
			"login_time": session.LoginTime,
			"last_active_time": session.LastActiveTime,
			"revoked_at": session.RevokedAt,
			"is_current": currentHash != "" && sessionHash == currentHash,
		}
	}

	return c.JSON(fiber.Map{"sessions": mappedSessions})
}

// RevokeSession handles DELETE /api/users/sessions/:id (Implementasi Lengkap)
func RevokeSession(c *fiber.Ctx) error {
	sessionIDHex := c.Params("id")
	sessionID, err := primitive.ObjectIDFromHex(sessionIDHex)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "ID Sesi tidak valid.")
	}

	userID := c.Locals("userObjectID").(primitive.ObjectID)
	currentHash := c.Locals("sessionHash").(string) // Diperoleh dari Protected middleware
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	sessionColl := database.GetCollection("usersessions")
	
	var session models.UserSession
	filter := bson.M{"_id": sessionID, "user": userID}
	if err := sessionColl.FindOne(ctx, filter).Decode(&session); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return utils.ErrorResponse(c, fiber.StatusNotFound, "Sesi tidak ditemukan.")
		}
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Server Error.")
	}

	// Hanya cabut jika belum dicabut
	if session.RevokedAt == nil {
		now := time.Now()
		update := bson.M{"$set": bson.M{"revoked_at": now, "last_active_time": now}}
		sessionColl.UpdateOne(ctx, filter, update)
	}

	sessionHash := session.Token
	isCurrent := currentHash != "" && sessionHash == currentHash

	// Log Activity
	utils.LogActivity(c, "user_session_revoked", fiber.Map{
		"target_session_id": sessionIDHex,
		"is_current": isCurrent,
	}, nil)

	if isCurrent {
		services.ClearAuthCookies(c) // Clear cookies jika mencabut sesi saat ini
	}

	msg := "Sesi berhasil diakhiri."
	if isCurrent {
		msg = "Sesi ini ditutup. Anda perlu login kembali."
	}

	return c.JSON(fiber.Map{"ok": true, "isCurrent": isCurrent, "msg": msg})
}

// StartStreak sets the initial streak start date (Sudah Ada)
func StartStreak(c *fiber.Ctx) error {
	var req struct {
		StartTime string `json:"start_time"`
	}
	if err := c.BodyParser(&req); err != nil {
		return utils.ErrorResponse(c, 400, "Invalid body")
	}

	parsedTime, err := time.Parse(time.RFC3339, req.StartTime)
	if err != nil {
		return utils.ErrorResponse(c, 400, "Format waktu tidak valid.")
	}

	userID := c.Locals("userObjectID").(primitive.ObjectID)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	usersColl := database.GetCollection("users")
	
	// Hanya update jika belum di-set (null)
	res, err := usersColl.UpdateOne(ctx, 
		bson.M{"_id": userID, "streak_start_date": bson.M{"$in": []interface{}{nil, primitive.Null{}}}}, 
		bson.M{"$set": bson.M{"streak_start_date": parsedTime}},
	)

	if err != nil {
		return utils.ErrorResponse(c, 500, "Gagal memulai streak")
	}
	
	if res.ModifiedCount == 0 {
		return utils.ErrorResponse(c, 400, "Streak sudah dimulai sebelumnya.")
	}

	utils.LogActivity(c, "user_streak_started", fiber.Map{
		"streak_start_date": parsedTime,
	}, nil)

	return GetMe(c)
}