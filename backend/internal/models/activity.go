// internal/models/activity.go
package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ActivityLog represents an activity log entry (ActivityLog.js in MERN)
type ActivityLog struct {
	ID        primitive.ObjectID     `bson:"_id,omitempty" json:"_id"`
	UserID    *primitive.ObjectID    `bson:"user,omitempty" json:"user,omitempty"`
	Username  string                 `bson:"username,omitempty" json:"username,omitempty"`
	Action    string                 `bson:"action" json:"action"`
	IPAddress string                 `bson:"ip_address" json:"ip_address"`
	UserAgent string                 `bson:"user_agent" json:"user_agent"`
	Details   map[string]interface{} `bson:"details,omitempty" json:"details,omitempty"`
	Timestamp time.Time              `bson:"timestamp" json:"timestamp"`
}