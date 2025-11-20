package utils

import (
	"context"
	"errors"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
	"github.com/gofiber/fiber/v2/log"
)

// Inisialisasi Cloudinary Client (pastikan di-set di config/env)
var cld *cloudinary.Cloudinary

func InitCloudinary(cloudName, apiKey, apiSecret string) {
	var err error
	cld, err = cloudinary.NewFromParams(cloudName, apiKey, apiSecret)
	if err != nil {
		log.Fatalf("Gagal inisialisasi Cloudinary: %v", err)
	}
	// Samakan dengan konfigurasi MERN: selalu gunakan HTTPS agar SecureURL terisi.
	// Struktur URL pada SDK Go tidak berupa pointer, jadi cukup set flag Secure.
	cld.Config.URL.Secure = true
}

// UploadToCloudinary mengunggah file yang di-stream ke Cloudinary
// Menggunakan io.Reader agar kompatibel dengan multipart.File
func UploadToCloudinary(file io.Reader, folder string) (string, error) {
	if cld == nil {
		return "", errors.New("Cloudinary not initialized")
	}

	// Tangani nilai ganda dari GenerateRandomToken
	uniqueFilename, err := GenerateRandomToken(10)
	if err != nil {
		return "", errors.New("Gagal menghasilkan nama file unik")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	uploadResult, err := cld.Upload.Upload(
		ctx,
		file,
		uploader.UploadParams{
			Folder: folder,
			// FIXED: Menggunakan PublicID untuk memberikan nama unik yang kita buat.
			PublicID: uniqueFilename,
		},
	)
	if err != nil {
		log.Errorf("Cloudinary upload error: %v", err)
		return "", err
	}
	if uploadResult.Error.Message != "" {
		log.Errorf("Cloudinary upload API error: %v", uploadResult.Error.Message)
		return "", errors.New(uploadResult.Error.Message)
	}

	// Cloudinary Go SDK hanya mengisi SecureURL jika mode secure aktif.
	secureURL := uploadResult.SecureURL
	if secureURL == "" {
		secureURL = uploadResult.URL
	}

	if secureURL == "" && cld != nil {
		resourceType := uploadResult.ResourceType
		if resourceType == "" {
			resourceType = "image"
		}

		versionSegment := ""
		if uploadResult.Version > 0 {
			versionSegment = fmt.Sprintf("v%d/", uploadResult.Version)
		}

		if cloudName := cld.Config.Cloud.CloudName; cloudName != "" && uploadResult.PublicID != "" {
			secureURL = fmt.Sprintf(
				"https://res.cloudinary.com/%s/%s/upload/%s%s",
				cloudName,
				resourceType,
				versionSegment,
				uploadResult.PublicID,
			)
		}
	}

	if secureURL == "" {
		return "", errors.New("Cloudinary tidak mengembalikan URL file")
	}

	return secureURL, nil
}

// DeleteFromCloudinary menghapus gambar dari Cloudinary berdasarkan URL
func DeleteFromCloudinary(url string) error {
	if cld == nil {
		return errors.New("Cloudinary not initialized")
	}

	// Helper untuk mendapatkan Public ID dari URL (Mirip MERN's getPublicId)
	getPublicId := func(url string) string {
		parts := strings.Split(url, "/")
		if len(parts) < 2 {
			return ""
		}
		// Cari 'profile_pictures' dan ambil bagian setelahnya
		for i, part := range parts {
			if part == "profile_pictures" && i < len(parts)-1 {
				filenameWithExt := parts[len(parts)-1]
				filename := strings.Split(filenameWithExt, ".")[0]
				return "profile_pictures/" + filename
			}
		}
		return ""
	}

	publicID := getPublicId(url)
	if publicID == "" || strings.Contains(url, "/default.png") {
		return nil // Abaikan jika URL default
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := cld.Upload.Destroy(ctx, uploader.DestroyParams{
		PublicID:     publicID,
		ResourceType: "image",
	})
	return err
}
