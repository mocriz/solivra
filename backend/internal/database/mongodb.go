package database

import (
"context"
"log"
"time"

"go.mongodb.org/mongo-driver/mongo"
"go.mongodb.org/mongo-driver/mongo/options"
"go.mongodb.org/mongo-driver/x/mongo/driver/connstring"
)

var client *mongo.Client
var databaseName string

// ConnectDB initializes the MongoDB connection
// FIXED: Diberi nama ConnectDB (Kapital) agar bisa diakses dari main.go
func ConnectDB(uri string, dbName string) {
ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
defer cancel()

var err error
// OPTIMIZATION: Limit connection pool for low-spec VPS (0.1 vCPU, 512MB RAM)
client, err = mongo.Connect(ctx, options.Client().
ApplyURI(uri).
SetMinPoolSize(1).
SetMaxPoolSize(10).
SetMaxConnIdleTime(30*time.Second))
if err != nil {
log.Fatalf("Failed to connect to MongoDB: %v", err)
}

// Ping the primary to verify connection
if err := client.Ping(ctx, nil); err != nil {
log.Fatalf("Failed to ping MongoDB: %v", err)
}

if dbName == "" {
if parsed, parseErr := connstring.ParseAndValidate(uri); parseErr == nil {
dbName = parsed.Database
}
}

if dbName == "" {
log.Fatal("Failed to determine MongoDB database name. Set MONGO_DB_NAME or include the database name in MONGO_URI.")
}

databaseName = dbName

log.Println("MongoDB Connected...")
}

// GetCollection returns a collection handle
func GetCollection(collectionName string) *mongo.Collection {
if databaseName == "" {
log.Fatal("MongoDB database name is not set. Call ConnectDB first.")
}
return client.Database(databaseName).Collection(collectionName)
}

