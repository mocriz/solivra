// internal/models/honeypot.go
package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// HoneypotLog represents a honeypot incident record (HoneypotLogs.js in MERN)
type HoneypotLog struct {
	ID            primitive.ObjectID `bson:"_id,omitempty" json:"_id"`
	IncidentTime  time.Time          `bson:"incident_time" json:"incident_time"`
	IPAddress     string             `bson:"ip_address" json:"ip_address"`
	UserAgent     string             `bson:"user_agent" json:"user_agent"`
	HoneypotType  string             `bson:"honeypot_type" json:"honeypot_type"` // e.g., 'fake_admin_login', 'honeypot_registration_field'
	SubmittedData interface{}        `bson:"submitted_data" json:"submitted_data"`
}