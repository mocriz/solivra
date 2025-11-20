package main

import (
	"context"
	"log"
	"os"
	"time"

	"solivra-go/backend/internal/config"
	"solivra-go/backend/internal/database"

	"go.mongodb.org/mongo-driver/bson"
)

// runDowngrade mengandung logika utama skrip
func runDowngrade(cfg *config.Config) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	usersColl := database.GetCollection("users")

	// Filter logika dari backend/scripts/downgrade_admins.js
	whitelist := cfg.AdminEmails

	var filter bson.M
	// Jika whitelist ada, cari admin yang TIDAK termasuk dalam whitelist
	if len(whitelist) > 0 {
		filter = bson.M{
			"role":     "admin",
			"username": bson.M{"$nin": whitelist}, // $nin: not in
		}
	} else {
		// Jika whitelist kosong, downgrade SEMUA admin (MERN logic fallback)
		filter = bson.M{"role": "admin"}
	}

	update := bson.M{"$set": bson.M{"role": "user"}}

	result, err := usersColl.UpdateMany(ctx, filter, update)
	if err != nil {
		log.Printf("FATAL: Failed to downgrade admins: %v", err)
		os.Exit(1)
	}

	log.Printf("Downgraded %d admin(s) not in ADMIN_EMAILS.", result.ModifiedCount)
}

func main() {
	// 1. Init Config
	cfg := config.Load()

	// 2. Connect Database
	database.ConnectDB(cfg.MongoURI, cfg.MongoDBName)

	// 3. Run Downgrade
	runDowngrade(cfg)
}
