package handlers

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"

	"solivra-go/backend/internal/database"
	"solivra-go/backend/internal/models"
	"solivra-go/backend/pkg/utils"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// RelapsePayload mirrors the expected input for creating/syncing a relapse
type RelapsePayload struct {
	RelapseTimeRaw string `json:"relapse_time"`
	RelapseNoteRaw string `json:"relapse_note"`
}

// recordRelapse encapsulates the logic for logging the relapse and activity
func recordRelapse(c *fiber.Ctx, user *models.User, relapseDate time.Time, note string, source string, purgedCount int, streakStartUpdated bool) (*models.RelapseLog, error) {
	relapseColl := database.GetCollection("relapselogs")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	sanitizedNote := utils.SanitizeString(note, 2048)
	var relapseNote *string
	if sanitizedNote != "" {
		noteCopy := sanitizedNote
		relapseNote = &noteCopy
	}

	relapse := models.RelapseLog{
		ID:          primitive.NewObjectID(),
		UserID:      user.ID,
		RelapseTime: relapseDate,
		RelapseNote: relapseNote,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	_, err := relapseColl.InsertOne(ctx, relapse)
	if err != nil {
		return nil, err
	}

	// Log Activity (MERN logic replication)
	logDetails := fiber.Map{
		"relapse_id":             relapse.ID.Hex(),
		"relapse_time":           relapseDate,
		"relapse_note":           relapseNote,
		"source":                 source,
		"streak_start_updated":   streakStartUpdated,
		"purged_future_relapses": purgedCount,
	}

	utils.LogActivity(c, "relapse_recorded", logDetails, nil)
	return &relapse, nil
}

// CreateRelapse handles POST /api/relapses
func CreateRelapse(c *fiber.Ctx) error {
	var payload RelapsePayload
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"msg": "Input tidak valid."})
	}

	if payload.RelapseTimeRaw == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"msg": "Waktu relapse wajib diisi."})
	}

	relapseDate, err := time.Parse(time.RFC3339, payload.RelapseTimeRaw)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"msg": "Format waktu relapse tidak valid."})
	}

	now := time.Now()
	// Allow slight variance but block future time
	if relapseDate.After(now.Add(time.Second)) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"msg": "Waktu relapse tidak boleh di masa depan."})
	}

	userIDHex := c.Locals("userId").(string)
	userID, _ := primitive.ObjectIDFromHex(userIDHex)

	userColl := database.GetCollection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user models.User
	if err := userColl.FindOne(ctx, bson.M{"_id": userID}).Decode(&user); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"msg": "User not found"})
		}
		log.Printf("Error fetching user: %v", err)
		return c.Status(fiber.StatusInternalServerError).SendString("Server Error")
	}

	var currentStart *time.Time = nil
	if user.StreakStartDate != nil {
		currentStart = user.StreakStartDate
	}

	shouldUpdateStreakStart := currentStart == nil || currentStart.After(relapseDate)

	// Hapus relapse yang tercatat di masa depan setelah relapse yang baru
	relapseColl := database.GetCollection("relapselogs")
	purgeResult, err := relapseColl.DeleteMany(ctx, bson.M{
		"user":         user.ID,
		"relapse_time": bson.M{"$gt": relapseDate},
	})
	if err != nil {
		log.Printf("Error purging relapses: %v", err)
	}
	purgedCount := int(purgeResult.DeletedCount)

	// Update streak_start_date jika perlu
	streakStartUpdated := false
	if shouldUpdateStreakStart {
		update := bson.M{"$set": bson.M{"streak_start_date": relapseDate}}
		filter := bson.M{
			"_id": user.ID,
			"$or": bson.A{
				bson.M{"streak_start_date": bson.M{"$exists": false}},
				bson.M{"streak_start_date": nil},
				bson.M{"streak_start_date": bson.M{"$gt": relapseDate}},
			},
		}

		updateResult, err := userColl.UpdateOne(ctx, filter, update)
		if err != nil {
			log.Printf("Error updating streak start date: %v", err)
		}
		if updateResult.ModifiedCount > 0 {
			streakStartUpdated = true
			user.StreakStartDate = &relapseDate
		}
	}

	// Catat relapse baru
	relapse, err := recordRelapse(c, &user, relapseDate, payload.RelapseNoteRaw, "manual", purgedCount, streakStartUpdated)
	if err != nil {
		log.Printf("Error recording relapse: %v", err)
		return c.Status(fiber.StatusInternalServerError).SendString("Server Error")
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"relapse": relapse})
}

// SyncRelapse handles POST /api/relapses/sync
func SyncRelapse(c *fiber.Ctx) error {
	var payload RelapsePayload
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"msg": "Input tidak valid."})
	}

	if payload.RelapseTimeRaw == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"msg": "Data relapse tidak valid."})
	}

	relapseDate, err := time.Parse(time.RFC3339, payload.RelapseTimeRaw)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"msg": "Data relapse tidak valid."})
	}

	now := time.Now()
	if relapseDate.After(now.Add(time.Second)) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"msg": "Data relapse tidak valid."})
	}

	userIDHex := c.Locals("userId").(string)
	userID, _ := primitive.ObjectIDFromHex(userIDHex)

	userColl := database.GetCollection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user models.User
	if err := userColl.FindOne(ctx, bson.M{"_id": userID}).Decode(&user); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"msg": "User not found"})
		}
		log.Printf("Error fetching user: %v", err)
		return c.Status(fiber.StatusInternalServerError).SendString("Server Error")
	}

	var currentStart *time.Time = nil
	if user.StreakStartDate != nil {
		currentStart = user.StreakStartDate
	}
	shouldUpdateStreakStart := currentStart == nil || currentStart.After(relapseDate)

	relapseColl := database.GetCollection("relapselogs")
	purgeResult, err := relapseColl.DeleteMany(ctx, bson.M{
		"user":         user.ID,
		"relapse_time": bson.M{"$gt": relapseDate},
	})
	if err != nil {
		log.Printf("Error purging relapses during sync: %v", err)
	}
	purgedCount := int(purgeResult.DeletedCount)

	streakStartUpdated := false
	if shouldUpdateStreakStart {
		update := bson.M{"$set": bson.M{"streak_start_date": relapseDate}}
		filter := bson.M{
			"_id": user.ID,
			"$or": bson.A{
				bson.M{"streak_start_date": bson.M{"$exists": false}},
				bson.M{"streak_start_date": nil},
				bson.M{"streak_start_date": bson.M{"$gt": relapseDate}},
			},
		}

		updateResult, err := userColl.UpdateOne(ctx, filter, update)
		if err != nil {
			log.Printf("Error updating streak start date during sync: %v", err)
		}
		if updateResult.ModifiedCount > 0 {
			streakStartUpdated = true
			user.StreakStartDate = &relapseDate
		}
	}

	_, err = recordRelapse(c, &user, relapseDate, payload.RelapseNoteRaw, "sync", purgedCount, streakStartUpdated)
	if err != nil {
		log.Printf("Error recording sync relapse: %v", err)
		return c.Status(fiber.StatusInternalServerError).SendString("Server Error")
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"ok": true, "msg": "Data relapse berhasil disinkronisasi."})
}

// GetRelapses handles GET /api/relapses
func GetRelapses(c *fiber.Ctx) error {
	userIDHex := c.Locals("userId").(string)
	userID, _ := primitive.ObjectIDFromHex(userIDHex)

	relapseColl := database.GetCollection("relapselogs")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	opts := options.Find().SetSort(bson.D{{Key: "relapse_time", Value: -1}})
	cursor, err := relapseColl.Find(ctx, bson.M{"user": userID}, opts)
	if err != nil {
		log.Printf("Error getting relapses: %v", err)
		return c.Status(fiber.StatusInternalServerError).SendString("Server Error")
	}
	defer cursor.Close(ctx)

	var relapses []models.RelapseLog
	if err := cursor.All(ctx, &relapses); err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString("Server Error")
	}

	return c.JSON(relapses)
}

// UpdateRelapse handles PUT /api/relapses/:id
func UpdateRelapse(c *fiber.Ctx) error {
	relapseIDHex := c.Params("id")
	relapseID, err := primitive.ObjectIDFromHex(relapseIDHex)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"msg": "ID Relapse tidak valid."})
	}

	userIDHex := c.Locals("userId").(string)
	userID, _ := primitive.ObjectIDFromHex(userIDHex)

	var payload struct {
		RelapseNoteRaw string `json:"relapse_note"`
	}
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"msg": "Input tidak valid."})
	}

	note := utils.SanitizeString(payload.RelapseNoteRaw, 2048)

	relapseColl := database.GetCollection("relapselogs")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var existingRelapse models.RelapseLog
	filter := bson.M{"_id": relapseID, "user": userID}
	if err := relapseColl.FindOne(ctx, filter).Decode(&existingRelapse); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"msg": "Relapse tidak ditemukan."})
		}
		log.Printf("Error finding relapse for update: %v", err)
		return c.Status(fiber.StatusInternalServerError).SendString("Server Error")
	}

	oldNote := existingRelapse.RelapseNote

	var noteValue interface{}
	if note == "" {
		noteValue = nil
	} else {
		noteValue = note
	}

	update := bson.M{
		"$set": bson.M{
			"relapse_note": noteValue,
			"updatedAt":    time.Now(),
		},
	}

	updateResult, err := relapseColl.UpdateOne(ctx, filter, update)
	if err != nil || updateResult.ModifiedCount == 0 {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"msg": "Gagal memperbarui catatan relapse."})
	}

	// Fetch updated relapse (to return to client)
	var updatedRelapse models.RelapseLog
	// FindOneAndUpdate is more efficient but this is clearer.
	relapseColl.FindOne(ctx, filter).Decode(&updatedRelapse)

	// Log Activity
	logDetails := fiber.Map{
		"relapse_id": relapseIDHex,
		"old_note":   oldNote,
		"new_note":   noteValue,
	}
	utils.LogActivity(c, "relapse_updated", logDetails, nil)

	return c.JSON(fiber.Map{"relapse": updatedRelapse, "msg": "Catatan relapse berhasil diperbarui."})
}

// DeleteRelapse handles DELETE /api/relapses/:id
func DeleteRelapse(c *fiber.Ctx) error {
	relapseIDHex := c.Params("id")
	relapseID, err := primitive.ObjectIDFromHex(relapseIDHex)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"msg": "ID Relapse tidak valid."})
	}

	userIDHex := c.Locals("userId").(string)
	userID, _ := primitive.ObjectIDFromHex(userIDHex)

	relapseColl := database.GetCollection("relapselogs")
	userColl := database.GetCollection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var relapseToDelete models.RelapseLog
	filter := bson.M{"_id": relapseID, "user": userID}
	if err := relapseColl.FindOne(ctx, filter).Decode(&relapseToDelete); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"msg": "Relapse tidak ditemukan."})
		}
		log.Printf("Error finding relapse for delete: %v", err)
		return c.Status(fiber.StatusInternalServerError).SendString("Server Error")
	}

	deleteResult, err := relapseColl.DeleteOne(ctx, filter)
	if err != nil || deleteResult.DeletedCount == 0 {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"msg": "Gagal menghapus relapse."})
	}

	// Check if this was the last relapse
	remainingCount, err := relapseColl.CountDocuments(ctx, bson.M{"user": userID})
	if err != nil {
		log.Printf("Error counting relapses: %v", err)
	}

	streakReset := false
	if remainingCount == 0 {
		// Reset streak_start_date dan longest_streak_seconds
		_, err := userColl.UpdateOne(ctx, bson.M{"_id": userID}, bson.M{
			// $set: nil tidak bekerja. Kita set ke null BSON untuk menghapus/mereset field.
			"$set": bson.M{"streak_start_date": nil, "longest_streak_seconds": 0},
		})
		if err != nil {
			log.Printf("Error resetting user streak data: %v", err)
		}
		streakReset = true
	}

	// Log Activity
	logDetails := fiber.Map{
		"relapse_id":   relapseIDHex,
		"relapse_time": relapseToDelete.RelapseTime,
		"relapse_note": relapseToDelete.RelapseNote,
		"streak_reset": streakReset,
	}
	utils.LogActivity(c, "relapse_deleted", logDetails, nil)

	return c.JSON(fiber.Map{"msg": "Relapse berhasil dihapus."})
}

// DeleteAllRelapses handles DELETE /api/relapses
func DeleteAllRelapses(c *fiber.Ctx) error {
	userIDHex := c.Locals("userId").(string)
	userID, _ := primitive.ObjectIDFromHex(userIDHex)

	relapseColl := database.GetCollection("relapselogs")
	userColl := database.GetCollection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	relapseCount, err := relapseColl.CountDocuments(ctx, bson.M{"user": userID})
	if err != nil {
		log.Printf("Error counting relapses: %v", err)
		return c.Status(fiber.StatusInternalServerError).SendString("Server Error")
	}

	if relapseCount == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"msg": "Tidak ada riwayat relapse yang ditemukan."})
	}

	deleteResult, err := relapseColl.DeleteMany(ctx, bson.M{"user": userID})
	if err != nil {
		log.Printf("Error deleting all relapses: %v", err)
		return c.Status(fiber.StatusInternalServerError).SendString("Server Error")
	}

	// Reset streak_start_date dan longest_streak_seconds
	_, err = userColl.UpdateOne(ctx, bson.M{"_id": userID}, bson.M{
		"$set": bson.M{"streak_start_date": nil, "longest_streak_seconds": 0},
	})
	if err != nil {
		log.Printf("Error resetting user streak data after mass delete: %v", err)
	}

	// Log Activity
	logDetails := fiber.Map{
		"deleted_count": deleteResult.DeletedCount,
		"streak_reset":  true,
	}
	utils.LogActivity(c, "all_relapses_deleted", logDetails, nil)

	return c.JSON(fiber.Map{
		// Match MERN's dynamic message format
		"msg":           fmt.Sprintf("%d riwayat relapse berhasil dihapus.", deleteResult.DeletedCount),
		"deleted_count": deleteResult.DeletedCount,
	})
}
