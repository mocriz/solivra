// internal/models/relapse.go
package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// RelapseLog represents a relapse entry (RelapseLog.js in MERN)
type RelapseLog struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"_id"` // MERN expects _id
	UserID      primitive.ObjectID `bson:"user" json:"user"`
	RelapseTime time.Time          `bson:"relapse_time" json:"relapse_time"`
	RelapseNote *string            `bson:"relapse_note,omitempty" json:"relapse_note,omitempty"` // FIXED: Changed from Notes to match MERN
	CreatedAt   time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt   time.Time          `bson:"updatedAt" json:"updatedAt"`
}
