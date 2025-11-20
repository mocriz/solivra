package config

import (
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

// Config holds all environment variables
type Config struct {
	Port                      string
	MongoURI                  string
	MongoDBName               string
	JWTAccessSecret           string
	JWTRefreshSecret          string
	CorsAllowedOrigins        string
	CloudinaryCloudName       string
	CloudinaryAPIKey          string
	CloudinaryAPISecret       string
	CloudflareTurnstileKey    string
	CloudflareTurnstileSecret string
	AdminEmails               []string
}

var appConfig *Config

// Load loads configuration from environment variables
func Load() *Config {
	if appConfig != nil {
		return appConfig
	}

	// ==========================================================
	// FIX ROBUSTNESS: Coba load dari dua lokasi umum .env
	// 1. Coba load .env di Parent Directory (misal: /backend/.env)
	godotenv.Load("../.env")

	// 2. Coba load .env di Current Working Directory (misal: /backend/cmd/server/.env)
	// Godotenv hanya akan memuat jika variabel belum di-set, jadi ini aman.
	godotenv.Load()

	// Godotenv.Load() tidak akan menimpa variabel yang sudah ada, jadi ini adalah cara aman
	// untuk memastikan file dimuat terlepas dari dari mana user menjalankan 'go run'.
	// ==========================================================

	mongoURI := os.Getenv("MONGO_URI")
	if mongoURI == "" {
		mongoURI = os.Getenv("MONGODB_URI") // backward compatibility with README lama
	}

	cfg := &Config{
		Port:                      os.Getenv("PORT"),
		MongoURI:                  mongoURI,
		MongoDBName:               os.Getenv("MONGO_DB_NAME"),
		JWTAccessSecret:           os.Getenv("JWT_ACCESS_SECRET"),
		JWTRefreshSecret:          os.Getenv("JWT_REFRESH_SECRET"),
		CorsAllowedOrigins:        os.Getenv("CORS_ALLOWED_ORIGINS"),
		CloudinaryCloudName:       os.Getenv("CLOUDINARY_CLOUD_NAME"),
		CloudinaryAPIKey:          os.Getenv("CLOUDINARY_API_KEY"),
		CloudinaryAPISecret:       os.Getenv("CLOUDINARY_API_SECRET"),
		CloudflareTurnstileKey:    os.Getenv("CLOUDFLARE_TURNSTILE_SITE_KEY"),
		CloudflareTurnstileSecret: os.Getenv("CLOUDFLARE_TURNSTILE_SECRET_KEY"),
	}

	if cfg.Port == "" {
		cfg.Port = "5000"
	}

	// Pengecekan Kritis
	if cfg.MongoURI == "" {
		// FIXED: Pesan error yang lebih jelas.
		log.Fatal("FATAL: Variabel MONGO_URI/MONGODB_URI TIDAK DITEMUKAN. Pastikan file .env ada di direktori /backend/ dan variabel tersebut diisi.")
	}

	// Setup Admin Emails (MERN Logic)
	adminEmails := os.Getenv("ADMIN_EMAILS")
	cfg.AdminEmails = strings.Split(adminEmails, ",")
	for i, email := range cfg.AdminEmails {
		cfg.AdminEmails[i] = strings.TrimSpace(strings.ToLower(email))
	}

	appConfig = cfg
	return cfg
}

// Get returns the loaded configuration
func Get() *Config {
	if appConfig == nil {
		return Load()
	}
	return appConfig
}

// IsProd checks if environment is production
func IsProd() bool {
	return os.Getenv("NODE_ENV") == "production"
}
