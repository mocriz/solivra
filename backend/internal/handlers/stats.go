package handlers

import (
	"context"
	"log"
	"math"
	"sort"
	"time"

	"solivra-go/backend/internal/database"
	"solivra-go/backend/internal/models"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Helper function to calculate streak durations
// Replicates logic from backend/routes/stats.js
func calculateStreaks(streakStart time.Time, relapses []models.RelapseLog, now time.Time) (currentStreak int64, computedLongest int64, historicalStreaks []int64) {

	relapseTimes := make([]time.Time, len(relapses))
	for i, r := range relapses {
		relapseTimes[i] = r.RelapseTime
	}

	var currentStreakStartTime time.Time
	if len(relapseTimes) > 0 {
		// Waktu mulai adalah waktu relapse PALING BARU (MAX)
		latestRelapse := relapseTimes[0]
		for _, t := range relapseTimes {
			if t.After(latestRelapse) {
				latestRelapse = t
			}
		}
		currentStreakStartTime = latestRelapse
	} else {
		// Jika belum ada relapse, waktu mulai adalah tanggal streak dimulai
		currentStreakStartTime = streakStart
	}

	// Current Streak (in seconds)
	duration := now.Sub(currentStreakStartTime)
	currentStreak = int64(math.Max(0, duration.Seconds()))

	// Historical Streaks (using timeline)
	timeline := []time.Time{streakStart}
	timeline = append(timeline, relapseTimes...)

	// Sort timeline
	sort.Slice(timeline, func(i, j int) bool {
		return timeline[i].Before(timeline[j])
	})

	for i := 0; i < len(timeline)-1; i++ {
		duration := timeline[i+1].Sub(timeline[i])
		historicalStreaks = append(historicalStreaks, int64(duration.Seconds()))
	}

	// Find Longest Streak
	allStreaksForLongest := make([]int64, 0, len(historicalStreaks)+1)
	allStreaksForLongest = append(allStreaksForLongest, historicalStreaks...)
	allStreaksForLongest = append(allStreaksForLongest, currentStreak)

	computedLongest = 0
	if len(allStreaksForLongest) > 0 {
		for _, streak := range allStreaksForLongest {
			if streak > computedLongest {
				computedLongest = streak
			}
		}
	}

	return currentStreak, computedLongest, historicalStreaks
}

// GetStats handles GET /api/stats
func GetStats(c *fiber.Ctx) error {
	userIDHex := c.Locals("userId").(string)
	userID, _ := primitive.ObjectIDFromHex(userIDHex)

	userColl := database.GetCollection("users")
	relapseColl := database.GetCollection("relapselogs")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var user models.User
	if err := userColl.FindOne(ctx, bson.M{"_id": userID}).Decode(&user); err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"msg": "User not found"})
	}

	storedLongest := user.LongestStreakSeconds

	// JIKA PENGGUNA BELUM MEMULAI STREAK
	if user.StreakStartDate == nil {
		return c.JSON(fiber.Map{
			"currentStreak": int64(0),
			"longestStreak": storedLongest,
			"relapse_dates": []string{},
			"streakStarted": false, // Flag penting untuk frontend
		})
	}

	streakStartDate := *user.StreakStartDate
	now := time.Now()

	// Ambil semua relapse logs, urutkan berdasarkan relapse_time (asc)
	var relapseLogs []models.RelapseLog
	opts := options.Find().SetSort(bson.D{{Key: "relapse_time", Value: 1}})
	cursor, err := relapseColl.Find(ctx, bson.M{"user": userID}, opts)
	if err != nil {
		log.Printf("Error fetching relapse logs: %v", err)
		return c.Status(fiber.StatusInternalServerError).SendString("Server Error")
	}
	defer cursor.Close(ctx)
	if err := cursor.All(ctx, &relapseLogs); err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString("Server Error")
	}

	currentStreak, computedLongest, _ := calculateStreaks(streakStartDate, relapseLogs, now)
	finalLongest := int64(math.Max(float64(storedLongest), float64(computedLongest)))

	// Update longest_streak_seconds jika computedLongest > storedLongest
	if finalLongest > storedLongest {
		_, err := userColl.UpdateOne(ctx, bson.M{"_id": userID}, bson.M{"$set": bson.M{"longest_streak_seconds": finalLongest}})
		if err != nil {
			log.Printf("Error updating longest streak: %v", err)
			// Lanjut eksekusi, ini bukan kegagalan fatal
		}
	}

	// Format relapse dates ke YYYY-MM-DD UTC (Sesuai output MERN: new Date(...).toISOString().split("T")[0])
	relapseDatesSet := make(map[string]struct{}, len(relapseLogs))
	relapseDates := make([]string, 0, len(relapseLogs))
	for _, r := range relapseLogs {
		dateKey := r.RelapseTime.UTC().Format("2006-01-02")
		if _, exists := relapseDatesSet[dateKey]; exists {
			continue
		}
		relapseDatesSet[dateKey] = struct{}{}
		relapseDates = append(relapseDates, dateKey)
	}

	return c.JSON(fiber.Map{
		"currentStreak": currentStreak,
		"longestStreak": finalLongest,
		"relapse_dates": relapseDates,
		"streakStarted": true,
	})
}

// RankingUser represents the data needed for public/admin rankings
type RankingUser struct {
	ID              primitive.ObjectID `json:"user_id,omitempty"`
	Username        string             `json:"username"`
	Nickname        string             `json:"nickname"`
	CurrentStreak   int64              `json:"current_streak"`
	LongestStreak   int64              `json:"longest_streak"`
	TotalRelapses   int                `json:"total_relapses"`
	AverageStreak   int64              `json:"average_streak,omitempty"`
	StreakStartDate *time.Time         `json:"streak_start_date,omitempty"`
	LanguagePref    string             `json:"language_pref,omitempty"`
	CreatedAt       time.Time          `json:"created_at,omitempty"`
	IsCurrentUser   bool               `json:"is_current_user"`
	Rank            int                `json:"rank"`
}

// processUserRankings calculates all streak metrics for a single user.
// Replicates logic from both backend/routes/stats.js and backend/routes/admin.js ranking logic
func processUserRankings(ctx context.Context, user models.User, currentUserID primitive.ObjectID, isAdmin bool) (RankingUser, error) {
	relapseColl := database.GetCollection("relapselogs")
	now := time.Now()

	ranking := RankingUser{
		Username:      user.Username,
		Nickname:      user.Nickname,
		LongestStreak: user.LongestStreakSeconds,
		IsCurrentUser: user.ID == currentUserID,
	}

	if isAdmin {
		ranking.ID = user.ID
		ranking.StreakStartDate = user.StreakStartDate
		ranking.LanguagePref = user.LanguagePref
		ranking.CreatedAt = user.CreatedAt
	}

	if user.StreakStartDate == nil {
		ranking.CurrentStreak = 0
		ranking.TotalRelapses = 0
		ranking.AverageStreak = 0
		return ranking, nil
	}

	streakStartDate := *user.StreakStartDate

	// Ambil semua relapse logs, urutkan berdasarkan relapse_time (asc)
	var relapses []models.RelapseLog
	opts := options.Find().SetSort(bson.D{{Key: "relapse_time", Value: 1}})
	cursor, err := relapseColl.Find(ctx, bson.M{"user": user.ID}, opts)
	if err != nil {
		log.Printf("Error fetching relapses for ranking user %s: %v", user.Username, err)
		return ranking, err
	}
	defer cursor.Close(ctx)
	if err := cursor.All(ctx, &relapses); err != nil {
		log.Printf("Error decoding relapses for ranking user %s: %v", user.Username, err)
		return ranking, err
	}

	ranking.TotalRelapses = len(relapses)

	currentStreak := int64(0)
	longestStreak := user.LongestStreakSeconds
	averageStreak := float64(0)

	if len(relapses) == 0 {
		currentStreak = int64(math.Max(0, now.Sub(streakStartDate).Seconds()))
		longestStreak = int64(math.Max(float64(longestStreak), float64(currentStreak)))
		averageStreak = float64(currentStreak)
	} else {
		// Calculate streaks between relapses
		streaks := make([]int64, 0)
		streakStart := streakStartDate
		var totalDuration int64 = 0

		for i := 0; i < len(relapses); i++ {
			relapseDate := relapses[i].RelapseTime
			streakDuration := int64(math.Max(0, relapseDate.Sub(streakStart).Seconds()))
			streaks = append(streaks, streakDuration)
			totalDuration += streakDuration
			streakStart = relapseDate
		}

		// Current streak from last relapse to now
		lastRelapseDate := relapses[len(relapses)-1].RelapseTime
		currentStreak = int64(math.Max(0, now.Sub(lastRelapseDate).Seconds()))

		// Find longest streak
		computedLongest := currentStreak
		for _, s := range streaks {
			if s > computedLongest {
				computedLongest = s
			}
		}
		longestStreak = int64(math.Max(float64(user.LongestStreakSeconds), float64(computedLongest)))

		// Calculate average streak
		if len(streaks) > 0 {
			averageStreak = float64(totalDuration) / float64(len(streaks))
		}
	}

	ranking.CurrentStreak = currentStreak
	ranking.LongestStreak = longestStreak
	// Admin ranking stores floor(averageStreak)
	ranking.AverageStreak = int64(math.Floor(averageStreak))

	return ranking, nil
}

// GetRankings handles GET /api/stats/rankings (Public)
func GetRankings(c *fiber.Ctx) error {
	return getRankingsHandler(c, false)
}

// getRankingsHandler is the core logic for both public and admin rankings
func getRankingsHandler(c *fiber.Ctx, isAdmin bool) error {
	userIDHex := c.Locals("userId").(string)
	currentUserID, _ := primitive.ObjectIDFromHex(userIDHex)

	userColl := database.GetCollection("users")
	// Diberi batas waktu yang lebih panjang karena operasi ini berat
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	// Select fields based on access role
	projection := bson.M{
		"username":               1,
		"nickname":               1,
		"streak_start_date":      1,
		"longest_streak_seconds": 1,
	}
	if isAdmin {
		projection["language_pref"] = 1
		projection["created_at"] = 1
	}

	filter := bson.M{"streak_start_date": bson.M{"$ne": nil}}

	opts := options.Find().SetProjection(projection)
	cursor, err := userColl.Find(ctx, filter, opts)
	if err != nil {
		log.Printf("Error fetching users for rankings: %v", err)
		return c.Status(fiber.StatusInternalServerError).SendString("Server Error")
	}
	defer cursor.Close(ctx)

	var users []models.User
	if err := cursor.All(ctx, &users); err != nil {
		log.Printf("Error decoding users for rankings: %v", err)
		return c.Status(fiber.StatusInternalServerError).SendString("Server Error")
	}

	rankings := make([]RankingUser, 0, len(users))

	// Perhitungan metrik loop: N+1 query pattern yang sama dengan MERN
	for _, user := range users {
		ranking, err := processUserRankings(ctx, user, currentUserID, isAdmin)
		if err != nil {
			log.Printf("Skipping user %s in ranking due to error: %v", user.Username, err)
			continue
		}
		rankings = append(rankings, ranking)
	}

	// Sort by current streak descending
	sort.Slice(rankings, func(i, j int) bool {
		return rankings[i].CurrentStreak > rankings[j].CurrentStreak
	})

	// Add ranking positions
	for i := range rankings {
		rankings[i].Rank = i + 1
	}

	response := fiber.Map{
		"rankings":    rankings,
		"total_users": len(rankings),
	}

	if isAdmin {
		response["generated_at"] = time.Now()
	} else {
		// Logika mencari peringkat user saat ini (untuk publik)
		response["current_user_rank"] = nil
		currentUserRank := -1
		for _, r := range rankings {
			if r.IsCurrentUser {
				currentUserRank = r.Rank
				break
			}
		}
		if currentUserRank != -1 {
			response["current_user_rank"] = currentUserRank
		}
	}

	return c.JSON(response)
}
