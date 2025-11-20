package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"solivra-go/backend/internal/config"
	"solivra-go/backend/internal/models"
	"solivra-go/backend/pkg/utils"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	// Load config
	config.Load()
	cfg := config.Get() // Added line

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second) // Added line
	defer cancel()                                                           // Added line

	clientOptions := options.Client().ApplyURI(cfg.MongoURI) // Modified line
	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		log.Fatal("Failed to connect to MongoDB:", err)
	}

	// Force use of "test" database to check if users are there
	db := client.Database("test")
	usersColl := db.Collection("users")

	if len(os.Args) < 3 {
		fmt.Println("Listing all users in DB:")
		cursor, err := usersColl.Find(ctx, bson.M{})
		if err != nil {
			log.Fatal(err)
		}
		var users []models.User
		cursor.All(ctx, &users)
		for _, u := range users {
			fmt.Printf("- Username: '%s', Nickname: '%s', Role: '%s'\n", u.Username, u.Nickname, u.Role)
		}
		return
	}

	username := os.Args[1]
	password := os.Args[2]
	var user models.User

	fmt.Printf("Checking user: '%s'\n", username)
	err = usersColl.FindOne(ctx, bson.M{"username": username}).Decode(&user)
	if err != nil {
		fmt.Printf("❌ User not found in DB: %v\n", err)

		// Try case insensitive search
		fmt.Println("Trying case-insensitive search...")
		cursor, _ := usersColl.Find(ctx, bson.M{"username": bson.M{"$regex": "^" + username + "$", "$options": "i"}})
		var users []models.User
		cursor.All(ctx, &users)
		if len(users) > 0 {
			fmt.Printf("Found similar users: %d\n", len(users))
			for _, u := range users {
				fmt.Printf("- %s (Hash: %s)\n", u.Username, u.Password[:10])
			}
		}
		return
	}

	fmt.Printf("✅ User found: %s\n", user.Username)
	fmt.Printf("Stored Hash: %s\n", user.Password)

	match := utils.CheckPasswordHash(password, user.Password)
	if match {
		fmt.Println("✅ Password MATCHES!")
	} else {
		fmt.Println("❌ Password does NOT match!")
	}
}
