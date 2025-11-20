// pkg/utils/jwt.go
package utils

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"solivra-go/backend/internal/config"
	"solivra-go/backend/internal/models"
)

// UserClaims represents JWT claims for user
type UserClaims struct {
	User UserPayload `json:"user"`
	jwt.RegisteredClaims
}

// UserPayload represents user data in JWT
type UserPayload struct {
	ID       string `json:"id"`
	Role     string `json:"role"`
	Username string `json:"username"`
}

// RefreshClaims represents JWT claims for refresh token
type RefreshClaims struct {
	UserID     string `json:"userId"`
	RememberMe bool   `json:"rememberMe"`
	jwt.RegisteredClaims
}

// GenerateAccessToken generates a new access token
func GenerateAccessToken(user *models.User) (string, error) {
	cfg := config.Get()

	claims := UserClaims{
		User: UserPayload{
			ID:       user.ID.Hex(),
			Role:     user.Role,
			Username: user.Username,
		},
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(15 * time.Minute)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(cfg.JWTAccessSecret))
}

// GenerateRefreshToken generates a new refresh token
func GenerateRefreshToken(userID primitive.ObjectID, rememberMe bool) (string, error) {
	cfg := config.Get()

	expiry := 7 * 24 * time.Hour // 7 days
	if rememberMe {
		expiry = 30 * 24 * time.Hour // 30 days
	}

	claims := RefreshClaims{
		UserID:     userID.Hex(),
		RememberMe: rememberMe,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(cfg.JWTRefreshSecret))
}

// ValidateAccessToken validates and parses an access token
func ValidateAccessToken(tokenString string) (*UserClaims, error) {
	cfg := config.Get()

	token, err := jwt.ParseWithClaims(tokenString, &UserClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(cfg.JWTAccessSecret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*UserClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, fmt.Errorf("invalid token")
}

// ValidateRefreshToken validates and parses a refresh token
func ValidateRefreshToken(tokenString string) (*RefreshClaims, error) {
	cfg := config.Get()

	token, err := jwt.ParseWithClaims(tokenString, &RefreshClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(cfg.JWTRefreshSecret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*RefreshClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, fmt.Errorf("invalid token")
}
