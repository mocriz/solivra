package config

import (
	"strings"
)

// CanAutoAdmin checks if a username/email is privileged
// FIXED: Ini adalah lokasi tunggal (canonical) untuk fungsi CanAutoAdmin.
func CanAutoAdmin(email string) bool {
	cfg := Get()
	email = strings.ToLower(strings.TrimSpace(email))
	for _, adminEmail := range cfg.AdminEmails {
		if adminEmail == email {
			return true
		}
	}
	return false
}