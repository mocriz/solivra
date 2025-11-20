package handlers

import (
	"context"
	"math"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"

	"solivra-go/backend/internal/database"
	"solivra-go/backend/internal/models"
	"solivra-go/backend/pkg/utils"
)

// GetDashboardStats returns admin dashboard statistics
func GetDashboardStats(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	usersColl := database.GetCollection("users")
	relapsesColl := database.GetCollection("relapselogs")

	twentyFourHoursAgo := time.Now().Add(-24 * time.Hour)

	// Total Users
	totalUsers, _ := usersColl.CountDocuments(ctx, bson.M{})

	// New Registrations (Last 24h)
	newRegistrations, _ := usersColl.CountDocuments(ctx, bson.M{
		"created_at": bson.M{"$gte": twentyFourHoursAgo},
	})

	// Total Relapses (Last 24h)
	totalRelapses24h, _ := relapsesColl.CountDocuments(ctx, bson.M{
		"relapse_time": bson.M{"$gte": twentyFourHoursAgo},
	})

	// Relapse By Hour
	relapseByHourPipeline := []bson.M{
		{"$group": bson.M{"_id": bson.M{"$hour": "$relapse_time"}, "count": bson.M{"$sum": 1}}},
		{"$sort": bson.M{"_id": 1}},
	}
	cursor, err := relapsesColl.Aggregate(ctx, relapseByHourPipeline)
	if err != nil {
		return utils.ErrorResponse(c, 500, "Failed to aggregate relapse by hour")
	}
	defer cursor.Close(ctx)

	var rawRelapseByHour []bson.M
	if err = cursor.All(ctx, &rawRelapseByHour); err != nil {
		return utils.ErrorResponse(c, 500, "Failed to decode relapse by hour")
	}

	formattedRelapseByHour := make([]int, 24)
	for _, item := range rawRelapseByHour {
		if hour, ok := item["_id"].(int32); ok {
			if hour >= 0 && hour < 24 {
				formattedRelapseByHour[hour] = int(item["count"].(int32))
			}
		}
	}

	// Language Distribution
	languageDistributionPipeline := []bson.M{
		{"$group": bson.M{"_id": "$language_pref", "count": bson.M{"$sum": 1}}},
		{"$project": bson.M{"language_pref": "$_id", "user_count": "$count", "_id": 0}},
	}
	cursor, err = usersColl.Aggregate(ctx, languageDistributionPipeline)
	if err != nil {
		return utils.ErrorResponse(c, 500, "Failed to aggregate language distribution")
	}
	defer cursor.Close(ctx)

	var languageDistribution []bson.M
	if err = cursor.All(ctx, &languageDistribution); err != nil {
		return utils.ErrorResponse(c, 500, "Failed to decode language distribution")
	}

	return c.JSON(fiber.Map{
		"summary": fiber.Map{
			"total_users": totalUsers,
		},
		"summary_24h": fiber.Map{
			"new_registrations": newRegistrations,
			"total_relapses":    totalRelapses24h,
		},
		"engagement": fiber.Map{
			"language_distribution": languageDistribution,
		},
		"patterns": fiber.Map{
			"relapse_by_hour": formattedRelapseByHour,
		},
	})
}

// GetAdminLogs returns paginated activity logs
func GetAdminLogs(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// 1. Ambil Query Params
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	searchRaw := utils.SanitizeString(c.Query("search", ""), 120)
	sortOrder := c.Query("sort", "newest")
	filter := c.Query("filter", "all")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	// 2. Buat Query Filter
	query := bson.M{
		"action": bson.M{"$ne": "api_call"},
	}

	if filter != "all" {
		query["action"] = filter
	}

	if searchRaw != "" {
		query["username"] = bson.M{"$regex": searchRaw, "$options": "i"}
	}

	// 3. Buat Sort Order
	mongoSortOrder := -1
	if sortOrder == "oldest" {
		mongoSortOrder = 1
	}
	sortBSON := bson.D{{Key: "timestamp", Value: mongoSortOrder}}

	// 4. Hitung Total Dokumen
	logsColl := database.GetCollection("activitylogs")
	count, _ := logsColl.CountDocuments(ctx, query)
	totalPages := int(math.Ceil(float64(count) / float64(limit)))

	// 5. Ambil Log
	opts := options.Find().
		SetSort(sortBSON).
		SetLimit(int64(limit)).
		SetSkip(int64((page - 1) * limit))

	cursor, err := logsColl.Find(ctx, query, opts)
	if err != nil {
		return utils.ErrorResponse(c, 500, "Failed to fetch logs")
	}
	defer cursor.Close(ctx)

	var logs []models.ActivityLog
	if err = cursor.All(ctx, &logs); err != nil {
		return utils.ErrorResponse(c, 500, "Failed to decode logs")
	}

	return c.JSON(fiber.Map{
		"logs":        logs,
		"totalPages":  totalPages,
		"currentPage": page,
	})
}

// GetAdminRankings returns full user rankings for admin and public (called from stats.go)
func GetAdminRankings(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	usersColl := database.GetCollection("users")
	relapsesColl := database.GetCollection("relapselogs")

	// 1. Ambil semua user yang memiliki streak_start_date
	cursor, err := usersColl.Find(ctx, bson.M{"streak_start_date": bson.M{"$exists": true}})
	if err != nil {
		return utils.ErrorResponse(c, 500, "Failed to fetch users for rankings")
	}

	var users []models.User
	if err = cursor.All(ctx, &users); err != nil {
		return utils.ErrorResponse(c, 500, "Failed to decode users")
	}

	type RankEntry struct {
		UserID          primitive.ObjectID `json:"user_id"`
		Username        string             `json:"username"`
		Nickname        string             `json:"nickname"`
		CurrentStreak   int64              `json:"current_streak"`
		LongestStreak   int64              `json:"longest_streak"`
		TotalRelapses   int                `json:"total_relapses"`
		AverageStreak   int64              `json:"average_streak"`
		StreakStartDate *time.Time         `json:"streak_start_date,omitempty"`
		CreatedAt       time.Time          `json:"created_at"`
		IsCurrentUser   bool               `json:"is_current_user"`
		Rank            int                `json:"rank"`
	}

	var rankings []RankEntry
	now := time.Now()
	// NOTE: Pengecekan Locals("userObjectID") ini aman karena fungsi ini dipanggil setelah middleware Protected()
	currentUserID := c.Locals("userObjectID").(primitive.ObjectID)

	// 2. Loop Users dan Hitung Streak secara Manual (Mirip Logic MERN)
	for _, user := range users {
		if user.StreakStartDate == nil {
			// User belum memulai streak - skip agar tidak panic ketika dereference
			continue
		}
		streakStartDate := *user.StreakStartDate

		// Ambil Relapses user
		relapseCursor, _ := relapsesColl.Find(ctx, bson.M{"user": user.ID}, options.Find().SetSort(bson.D{{Key: "relapse_time", Value: 1}}))
		var userRelapses []models.RelapseLog
		relapseCursor.All(ctx, &userRelapses)

		totalRelapses := len(userRelapses)

		var currentStreakSeconds int64
		var computedLongestStreak int64
		var averageStreakSeconds int64

		if totalRelapses == 0 {
			currentStreakSeconds = int64(now.Sub(streakStartDate).Seconds())
			computedLongestStreak = currentStreakSeconds
			averageStreakSeconds = computedLongestStreak
		} else {
			timeline := []time.Time{streakStartDate}
			for _, r := range userRelapses {
				timeline = append(timeline, r.RelapseTime)
			}
			sort.Slice(timeline, func(i, j int) bool {
				return timeline[i].Before(timeline[j])
			})

			var streaks []int64
			for i := 0; i < len(timeline)-1; i++ {
				diff := int64(timeline[i+1].Sub(timeline[i]).Seconds())
				streaks = append(streaks, diff)
			}

			// Current streak from last relapse to now
			lastRelapseDate := userRelapses[totalRelapses-1].RelapseTime
			currentStreakSeconds = int64(now.Sub(lastRelapseDate).Seconds())

			// Find longest streak
			allStreaks := append(streaks, currentStreakSeconds)
			computedLongestStreak = 0
			for _, s := range allStreaks {
				if s > computedLongestStreak {
					computedLongestStreak = s
				}
			}

			// Calculate average
			if len(streaks) > 0 {
				var sum int64
				for _, s := range streaks {
					sum += s
				}
				averageStreakSeconds = sum / int64(len(streaks))
			}
		}

		// Final longest is max of stored and computed
		finalLongest := int64(math.Max(float64(user.LongestStreakSeconds), float64(computedLongestStreak)))

		rankings = append(rankings, RankEntry{
			UserID:          user.ID,
			Username:        user.Username,
			Nickname:        user.Nickname,
			CurrentStreak:   currentStreakSeconds,
			LongestStreak:   finalLongest,
			TotalRelapses:   totalRelapses,
			AverageStreak:   averageStreakSeconds,
			StreakStartDate: user.StreakStartDate,
			CreatedAt:       user.CreatedAt,
			IsCurrentUser:   user.ID == currentUserID,
		})
	}

	// 3. Sort dan Beri Peringkat
	sort.Slice(rankings, func(i, j int) bool {
		return rankings[i].CurrentStreak > rankings[j].CurrentStreak
	})

	for i := range rankings {
		rankings[i].Rank = i + 1
	}

	// 4. Filter Ranking Publik (Jika dipanggil dari /api/stats/rankings)
	isPublicCall := strings.Contains(c.Path(), "/stats/rankings")

	if isPublicCall {
		// Public call should only return anonymized/limited data
		var publicRankings []fiber.Map
		var currentUserRank int
		for _, r := range rankings {
			if r.IsCurrentUser {
				currentUserRank = r.Rank
			}
			publicRankings = append(publicRankings, fiber.Map{
				"username":        r.Username,
				"nickname":        r.Nickname,
				"current_streak":  r.CurrentStreak,
				"longest_streak":  r.LongestStreak,
				"total_relapses":  r.TotalRelapses,
				"is_current_user": r.IsCurrentUser,
				"rank":            r.Rank,
			})
		}

		return c.JSON(fiber.Map{
			"rankings":          publicRankings,
			"total_users":       len(users),
			"current_user_rank": currentUserRank,
		})
	}

	// Admin call returns all detailed data
	return c.JSON(fiber.Map{
		"rankings":    rankings,
		"total_users": len(users),
	})
}

// GetAllUsers returns a list of all users (admin only)
func GetAllUsers(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	usersColl := database.GetCollection("users")

	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})

	cursor, err := usersColl.Find(ctx, bson.M{}, opts)
	if err != nil {
		return utils.ErrorResponse(c, 500, "Failed to fetch users")
	}
	defer cursor.Close(ctx)

	var users []models.User
	if err = cursor.All(ctx, &users); err != nil {
		return utils.ErrorResponse(c, 500, "Failed to decode users")
	}

	// Convert to public format
	publicUsers := make([]models.UserPublic, len(users))
	for i, user := range users {
		publicUsers[i] = *user.ToPublic()
	}

	return c.JSON(publicUsers)
}

// DeleteUser deletes a user (admin only)
func DeleteUser(c *fiber.Ctx) error {
	targetUserID := c.Params("id")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	oid, err := primitive.ObjectIDFromHex(targetUserID)
	if err != nil {
		return utils.ErrorResponse(c, 400, "Invalid user ID")
	}

	usersColl := database.GetCollection("users")

	// Delete user
	result, err := usersColl.DeleteOne(ctx, bson.M{"_id": oid})
	if err != nil {
		return utils.ErrorResponse(c, 500, "Failed to delete user")
	}

	if result.DeletedCount == 0 {
		return utils.ErrorResponse(c, 404, "User not found")
	}

	// Tambahkan logging dan clean-up jika perlu (relapses, sessions)

	return c.JSON(fiber.Map{"msg": "User deleted successfully"})
}

// GetAdminDashboard returns key admin stats (Placeholder)
func GetAdminDashboard(c *fiber.Ctx) error {
	return GetDashboardStats(c)
}
