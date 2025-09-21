package models

import (
	"strings"
	"time"
)

// UserFundEligibility represents the per-user quota tracking for each fund
type UserFundEligibility struct {
	UserFundEligibilityID int        `gorm:"primaryKey;column:user_fund_eligibility_id" json:"user_fund_eligibility_id"`
	UserID                int        `gorm:"column:user_id" json:"user_id"`
	YearID                int        `gorm:"column:year_id" json:"year_id"`
	CategoryID            *int       `gorm:"column:category_id" json:"category_id"`
	SubcategoryID         *int       `gorm:"column:subcategory_id" json:"subcategory_id"`
	RemainingQuota        *float64   `gorm:"column:remaining_quota" json:"remaining_quota"`
	MaxAllowedAmount      *float64   `gorm:"column:max_allowed_amount" json:"max_allowed_amount"`
	RemainingApplications *int       `gorm:"column:remaining_applications" json:"remaining_applications"`
	IsEligible            *string    `gorm:"column:is_eligible" json:"is_eligible"`
	RestrictionReason     *string    `gorm:"column:restriction_reason" json:"restriction_reason"`
	CalculatedAt          *time.Time `gorm:"column:calculated_at" json:"calculated_at"`
	CreateAt              *time.Time `gorm:"column:create_at" json:"create_at"`
	UpdateAt              *time.Time `gorm:"column:update_at" json:"update_at"`
	DeleteAt              *time.Time `gorm:"column:delete_at" json:"delete_at"`
}

// TableName implements gorm's tablename interface
func (UserFundEligibility) TableName() string {
	return "user_fund_eligibilities"
}

// EligibleFlag returns true when the record marks the user as eligible for the fund
func (ufe *UserFundEligibility) EligibleFlag() bool {
	if ufe == nil {
		return false
	}
	if ufe.IsEligible == nil {
		return true
	}

	normalized := strings.TrimSpace(strings.ToLower(*ufe.IsEligible))
	return normalized != "no" && normalized != "false" && normalized != "0"
}

// HasAnyQuota reports whether the user still has quota available (nil = unlimited)
func (ufe *UserFundEligibility) HasAnyQuota() bool {
	if ufe == nil {
		return false
	}
	if ufe.RemainingQuota == nil {
		return true
	}
	return *ufe.RemainingQuota > 0
}

// HasQuotaFor verifies the user has at least the requested amount of quota left
func (ufe *UserFundEligibility) HasQuotaFor(amount float64) bool {
	if ufe == nil {
		return false
	}
	if amount <= 0 {
		return ufe.HasAnyQuota()
	}
	if ufe.RemainingQuota == nil {
		return true
	}
	return *ufe.RemainingQuota >= amount
}

// HasRemainingApplications reports whether the user can still submit another application
func (ufe *UserFundEligibility) HasRemainingApplications() bool {
	if ufe == nil {
		return false
	}
	if ufe.RemainingApplications == nil {
		return true
	}
	return *ufe.RemainingApplications > 0
}
