package controllers

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"fund-management-api/config"
	"fund-management-api/models"

	"gorm.io/gorm"
)

// findUserFundEligibility fetches the best matching eligibility row for a user/year/category/subcategory combination.
// If a subcategory-specific record is not found it falls back to the category-level record (subcategory_id IS NULL).
func findUserFundEligibility(tx *gorm.DB, userID, yearID int, categoryID *int, subcategoryID *int) (*models.UserFundEligibility, error) {
	if tx == nil {
		tx = config.DB
	}

	conditions := []string{"user_id = ?", "year_id = ?", "delete_at IS NULL"}
	args := []interface{}{userID, yearID}

	if categoryID != nil {
		conditions = append(conditions, "category_id = ?")
		args = append(args, *categoryID)
	}

	baseWhere := strings.Join(conditions, " AND ")

	if subcategoryID != nil {
		subArgs := append(args, *subcategoryID)
		var eligibility models.UserFundEligibility
		if err := tx.Where(baseWhere+" AND subcategory_id = ?", subArgs...).First(&eligibility).Error; err == nil {
			return &eligibility, nil
		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
	}

	// Fallback to category level (subcategory_id is NULL/0)
	fallbackWhere := baseWhere + " AND (subcategory_id IS NULL OR subcategory_id = 0)"
	var eligibility models.UserFundEligibility
	if err := tx.Where(fallbackWhere, args...).First(&eligibility).Error; err != nil {
		return nil, err
	}

	return &eligibility, nil
}

// ensureEligibilityAllowsStart validates whether the user can start a submission/application based on the eligibility record.
// If requiredAmount is nil the check will only ensure that some quota remains; otherwise it must cover the requested amount.
func ensureEligibilityAllowsStart(eligibility *models.UserFundEligibility, requiredAmount *float64) error {
	if eligibility == nil {
		return fmt.Errorf("no eligibility record configured for this fund")
	}

	if !eligibility.EligibleFlag() {
		if eligibility.RestrictionReason != nil && strings.TrimSpace(*eligibility.RestrictionReason) != "" {
			return fmt.Errorf("user is not eligible for this fund: %s", strings.TrimSpace(*eligibility.RestrictionReason))
		}
		return fmt.Errorf("user is not eligible for this fund")
	}

	if !eligibility.HasRemainingApplications() {
		return fmt.Errorf("no remaining application quota for this fund")
	}

	if requiredAmount != nil {
		if eligibility.MaxAllowedAmount != nil && *requiredAmount > *eligibility.MaxAllowedAmount {
			return fmt.Errorf("requested amount exceeds the maximum allowed for this fund")
		}
		if !eligibility.HasQuotaFor(*requiredAmount) {
			return fmt.Errorf("requested amount exceeds your remaining quota")
		}
	} else if !eligibility.HasAnyQuota() {
		return fmt.Errorf("no remaining quota for this fund")
	}

	return nil
}

// consumeEligibilityOnApproval deducts the approved amount and/or application counter from the eligibility record.
func consumeEligibilityOnApproval(tx *gorm.DB, eligibility *models.UserFundEligibility, amount float64, decrementApplications bool) error {
	if eligibility == nil {
		return fmt.Errorf("eligibility record is required")
	}
	if tx == nil {
		tx = config.DB
	}

	updates := map[string]interface{}{}

	if eligibility.RemainingQuota != nil && amount > 0 {
		newQuota := *eligibility.RemainingQuota - amount
		if newQuota < 0 {
			newQuota = 0
		}
		updates["remaining_quota"] = newQuota
	}

	if decrementApplications && eligibility.RemainingApplications != nil && *eligibility.RemainingApplications > 0 {
		newApplications := *eligibility.RemainingApplications - 1
		if newApplications < 0 {
			newApplications = 0
		}
		updates["remaining_applications"] = newApplications
	}

	if len(updates) == 0 {
		return nil
	}

	updates["update_at"] = time.Now()

	return tx.Model(&models.UserFundEligibility{}).
		Where("user_fund_eligibility_id = ?", eligibility.UserFundEligibilityID).
		Updates(updates).Error
}

// resolveCategoryIDFromSubcategory finds the parent category for the given subcategory ID.
func resolveCategoryIDFromSubcategory(tx *gorm.DB, subcategoryID int) (int, error) {
	if tx == nil {
		tx = config.DB
	}

	var categoryID int
	if err := tx.Table("fund_subcategories").
		Select("category_id").
		Where("subcategory_id = ?", subcategoryID).
		Scan(&categoryID).Error; err != nil {
		return 0, err
	}
	if categoryID == 0 {
		return 0, fmt.Errorf("unable to determine category for subcategory %d", subcategoryID)
	}
	return categoryID, nil
}
