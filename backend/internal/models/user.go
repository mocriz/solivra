// internal/models/user.go
package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// RefreshTokenSchema represents a refresh token entry inside User
type RefreshTokenSchema struct {
	JTI       string    `bson:"jti" json:"jti"`
	CreatedAt time.Time `bson:"created_at" json:"created_at"`
	ExpiresAt time.Time `bson:"expires_at" json:"expires_at"`
}

// User represents a user in the system
type User struct {
	ID                   primitive.ObjectID   `bson:"_id,omitempty" json:"_id"` // Changed to _id for MERN compatibility
	Nickname             string               `bson:"nickname" json:"nickname"`
	Username             string               `bson:"username" json:"username"`
	Password             string               `bson:"password" json:"-"` // Never expose in JSON
	Role                 string               `bson:"role" json:"role"`
	LanguagePref         string               `bson:"language_pref" json:"language_pref"`
	ProfilePicture       string               `bson:"profile_picture" json:"profile_picture"`
	StreakStartDate      *time.Time           `bson:"streak_start_date,omitempty" json:"streak_start_date,omitempty"`
	LongestStreakSeconds int64                `bson:"longest_streak_seconds" json:"longest_streak_seconds"`
	FailedLoginAttempts  int                  `bson:"failed_login_attempts" json:"-"`
	LockoutUntil         *time.Time           `bson:"lockout_until,omitempty" json:"lockout_until,omitempty"`
	RefreshTokens        []RefreshTokenSchema `bson:"refreshTokens" json:"-"` // Store server-side, don't send to client
	CreatedAt            time.Time            `bson:"created_at" json:"createdAt"` // Mongoose often uses createdAt
	UpdatedAt            time.Time            `bson:"updated_at" json:"updatedAt"`
}

// UserPublic represents public user data (safe to send to client)
type UserPublic struct {
	ID              primitive.ObjectID `json:"_id"` // Changed to _id
	Nickname        string             `json:"nickname"`
	Username        string             `json:"username"`
	Role            string             `json:"role"`
	LanguagePref    string             `json:"language_pref"`
	ProfilePicture  string             `json:"profile_picture"`
	StreakStartDate *time.Time         `json:"streak_start_date,omitempty"`
	CreatedAt       time.Time          `json:"created_at"`
}

// ToPublic converts User to UserPublic (removes sensitive fields)
func (u *User) ToPublic() *UserPublic {
	return &UserPublic{
		ID:              u.ID,
		Nickname:        u.Nickname,
		Username:        u.Username,
		Role:            u.Role,
		LanguagePref:    u.LanguagePref,
		ProfilePicture:  u.ProfilePicture,
		StreakStartDate: u.StreakStartDate,
		CreatedAt:       u.CreatedAt,
	}
}

// UserSession represents a user session (UserSession.js in MERN)
type UserSession struct {
	ID             primitive.ObjectID `bson:"_id,omitempty" json:"_id"`
	UserID         primitive.ObjectID `bson:"user" json:"user"` // MERN populates this, but ID is enough for ref
	Token          string             `bson:"token" json:"-"`   // Hashed session token
	IPAddress      string             `bson:"ip_address" json:"ip_address"`
	UserAgent      string             `bson:"user_agent" json:"user_agent"`
	LoginTime      time.Time          `bson:"login_time" json:"login_time"`
	LastActiveTime time.Time          `bson:"last_active_time" json:"last_active_time"`
	RevokedAt      *time.Time         `bson:"revoked_at,omitempty" json:"revoked_at,omitempty"`
}

// LoginAttempt represents a login attempt record (LoginAttempt.js in MERN)
type LoginAttempt struct {
	ID                primitive.ObjectID  `bson:"_id,omitempty" json:"_id"`
	UserID            *primitive.ObjectID `bson:"user,omitempty" json:"user,omitempty"`
	Username          string              `bson:"username" json:"username"`
	IPAddress         string              `bson:"ip_address" json:"ip_address"`
	UserAgent         string              `bson:"user_agent" json:"user_agent"`
	Outcome           string              `bson:"outcome" json:"outcome"` // success, invalid_password, user_not_found, locked, ip_locked
	AttemptTime       time.Time           `bson:"attempt_time" json:"attempt_time"`
	LockoutUntil      *time.Time          `bson:"lockout_until,omitempty" json:"lockout_until,omitempty"`
	AttemptsRemaining *int                `bson:"attempts_remaining,omitempty" json:"attempts_remaining,omitempty"`
}

// RegistrationAttempt represents a registration attempt record (RegistrationAttempt.js in MERN)
type RegistrationAttempt struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"_id"`
	IPAddress    string             `bson:"ip_address" json:"ip_address"`
	Username     string             `bson:"username" json:"username"`
	AttemptTime  time.Time          `bson:"attempt_time" json:"attempt_time"`
	Status       string             `bson:"status" json:"status"` // success, blocked
	BlockedUntil *time.Time         `bson:"blocked_until,omitempty" json:"blocked_until,omitempty"`
}