// controllers/fund_api.go
package controllers

import (
	"encoding/json"
	"fmt"
	"fund-management-api/config"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// GetFundStructure - API ใหม่ที่จัดกลุ่มข้อมูลให้พร้อมใช้งาน
func GetFundStructure(c *gin.Context) {
	yearIDParam := c.Query("year_id")
	categoryID := c.Query("category_id")

	userIDValue, _ := c.Get("userID")
	roleIDValue, _ := c.Get("roleID")

	userID := 0
	if uid, ok := userIDValue.(int); ok {
		userID = uid
	}

	roleID := 0
	if rid, ok := roleIDValue.(int); ok {
		roleID = rid
	}

	var yearFilter *int
	if yearIDParam != "" {
		if parsed, err := strconv.Atoi(yearIDParam); err == nil {
			yearFilter = &parsed
		}
	}

	filterParam := c.DefaultQuery("eligible_only", "")
	if filterParam == "" {
		filterParam = c.DefaultQuery("filter_ineligible", "")
	}
	filterIneligible := strings.EqualFold(filterParam, "true") || filterParam == "1" || strings.EqualFold(filterParam, "yes")

	// Build query สำหรับดึง categories และ subcategories
	categoriesQuery := `
        SELECT DISTINCT
            fc.category_id,
            fc.category_name,
            fc.status as category_status,
            fc.year_id
        FROM fund_categories fc
        WHERE fc.delete_at IS NULL 
            AND fc.status = 'active'`

	var categoryArgs []interface{}

	if yearIDParam != "" {
		categoriesQuery += " AND fc.year_id = ?"
		categoryArgs = append(categoryArgs, yearIDParam)
	}

	if categoryID != "" {
		categoriesQuery += " AND fc.category_id = ?"
		categoryArgs = append(categoryArgs, categoryID)
	}

	categoriesQuery += " ORDER BY fc.category_id"

	// Execute categories query
	categoryRows, err := config.DB.Raw(categoriesQuery, categoryArgs...).Rows()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch categories",
		})
		return
	}
	defer categoryRows.Close()

	var categories []map[string]interface{}

	for categoryRows.Next() {
		var (
			catID     int
			catName   string
			catStatus string
			catYearID *int
		)

		err := categoryRows.Scan(&catID, &catName, &catStatus, &catYearID)
		if err != nil {
			continue
		}

		// Get subcategories for this category (grouped)
		subcategories := getGroupedSubcategories(catID, roleID, userID, yearFilter, filterIneligible)

		// Only add category if it has visible subcategories
		if len(subcategories) > 0 {
			category := map[string]interface{}{
				"category_id":   catID,
				"category_name": catName,
				"status":        catStatus,
				"year_id":       catYearID,
				"subcategories": subcategories,
			}
			categories = append(categories, category)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success":       true,
		"categories":    categories,
		"total":         len(categories),
		"user_id":       userID,
		"role_id":       roleID,
		"eligible_only": filterIneligible,
	})
}

// getGroupedSubcategories - Helper function to get subcategories grouped by subcategory_id
func getGroupedSubcategories(categoryID int, roleID int, userID int, yearFilter *int, filterIneligible bool) []map[string]interface{} {
	query := `
        SELECT
            fs.subcategory_id,
            fs.subcategory_name,
            fs.fund_condition,
            fs.target_roles,
            fs.form_type,
            fs.form_url,
            fs.status,
            (SELECT sb1.allocated_amount
             FROM subcategory_budgets sb1
             WHERE sb1.subcategory_id = fs.subcategory_id
                AND sb1.delete_at IS NULL
                AND sb1.status = 'active'
             LIMIT 1) as allocated_amount,
            (SELECT sb2.remaining_budget
             FROM subcategory_budgets sb2
             WHERE sb2.subcategory_id = fs.subcategory_id
                AND sb2.delete_at IS NULL
                AND sb2.status = 'active'
             LIMIT 1) as remaining_budget,
            COUNT(DISTINCT sb.subcategory_budget_id) as budget_count,
            GROUP_CONCAT(DISTINCT sb.level) as levels,
            GROUP_CONCAT(DISTINCT sb.fund_description) as descriptions,
            ufe.user_fund_eligibility_id,
            ufe.remaining_quota,
            ufe.max_allowed_amount,
            ufe.remaining_applications,
            ufe.is_eligible,
            ufe.restriction_reason,
            ufe.calculated_at,
            ufe.update_at
        FROM fund_subcategories fs
        LEFT JOIN subcategory_budgets sb ON fs.subcategory_id = sb.subcategory_id
            AND sb.delete_at IS NULL
            AND sb.status = 'active'
        LEFT JOIN user_fund_eligibilities ufe ON ufe.category_id = fs.category_id
            AND ufe.user_id = ?
            AND ufe.delete_at IS NULL
            AND (ufe.subcategory_id IS NULL OR ufe.subcategory_id = fs.subcategory_id)`

	args := []interface{}{userID}
	if yearFilter != nil {
		query += " AND ufe.year_id = ?"
		args = append(args, *yearFilter)
	}

	query += `
        WHERE fs.delete_at IS NULL
            AND fs.status = 'active'
            AND fs.category_id = ?`

	args = append(args, categoryID)

	if roleID != 3 { // Not admin
		roleIDStr := fmt.Sprintf("%d", roleID)
		query += " AND (fs.target_roles IS NULL OR fs.target_roles = '' OR JSON_CONTAINS(fs.target_roles, ?))"
		args = append(args, fmt.Sprintf(`"%s"`, roleIDStr))
	}

	query += ` GROUP BY fs.subcategory_id, fs.subcategory_name,
               fs.fund_condition, fs.target_roles, fs.form_type,
               fs.form_url, fs.status,
               ufe.user_fund_eligibility_id, ufe.remaining_quota,
               ufe.max_allowed_amount, ufe.remaining_applications,
               ufe.is_eligible, ufe.restriction_reason,
               ufe.calculated_at, ufe.update_at
               ORDER BY fs.subcategory_id`

	rows, err := config.DB.Raw(query, args...).Rows()
	if err != nil {
		return []map[string]interface{}{}
	}
	defer rows.Close()

	var subcategories []map[string]interface{}

	for rows.Next() {
		var (
			subID            int
			subName          string
			fundCondition    *string
			targetRoles      *string
			formType         *string
			formURL          *string
			status           string
			allocatedAmount  *float64 // เปลี่ยนเป็น pointer เพราะอาจเป็น NULL
			remainingBudget  *float64 // เปลี่ยนเป็น pointer เพราะอาจเป็น NULL
			budgetCount      int
			levels           *string
			descriptions     *string
			eligibilityID    *int
			userQuota        *float64
			userMaxAmount    *float64
			userApplications *int
			userEligible     *string
			userRestriction  *string
			userCalculated   *time.Time
			userUpdated      *time.Time
		)

		err := rows.Scan(
			&subID,
			&subName,
			&fundCondition,
			&targetRoles,
			&formType,
			&formURL,
			&status,
			&allocatedAmount,
			&remainingBudget,
			&budgetCount,
			&levels,
			&descriptions,
			&eligibilityID,
			&userQuota,
			&userMaxAmount,
			&userApplications,
			&userEligible,
			&userRestriction,
			&userCalculated,
			&userUpdated,
		)
		if err != nil {
			continue
		}

		// Parse target roles
		var targetRolesList []string
		if targetRoles != nil && *targetRoles != "" {
			json.Unmarshal([]byte(*targetRoles), &targetRolesList)
		}

		// ใช้ค่า default ถ้า budget เป็น NULL
		allocatedVal := float64(0)
		remainingVal := float64(0)
		if allocatedAmount != nil {
			allocatedVal = *allocatedAmount
		}
		if remainingBudget != nil {
			remainingVal = *remainingBudget
		}

		eligibilityExists := eligibilityID != nil
		eligibleFlag := true
		if eligibilityExists && userEligible != nil {
			normalized := strings.TrimSpace(strings.ToLower(*userEligible))
			if normalized == "no" || normalized == "false" || normalized == "0" {
				eligibleFlag = false
			}
		}

		hasQuota := true
		if eligibilityExists && userQuota != nil {
			hasQuota = *userQuota > 0
		}

		hasApplications := true
		if eligibilityExists && userApplications != nil {
			hasApplications = *userApplications > 0
		}

		userCanApply := true
		if eligibilityExists {
			userCanApply = eligibleFlag && hasQuota && hasApplications
		}

		if filterIneligible && roleID != 3 && eligibilityExists && !userCanApply {
			continue
		}

		subcategory := map[string]interface{}{
			"subcategory_id":      subID,
			"subcategory_name":    subName,
			"fund_condition":      fundCondition,
			"target_roles":        targetRolesList,
			"form_type":           formType,
			"form_url":            formURL,
			"status":              status,
			"allocated_amount":    allocatedVal, // ใช้เงินก้อนเดียวกัน ไม่รวม
			"remaining_budget":    remainingVal, // ใช้เงินก้อนเดียวกัน ไม่รวม
			"budget_count":        budgetCount,
			"has_multiple_levels": budgetCount > 1,
		}

		// Add budget breakdown info if needed
		if budgetCount > 1 && (levels != nil || descriptions != nil) {
			subcategory["budget_levels"] = levels
			subcategory["budget_descriptions"] = descriptions
		}

		if eligibilityExists {
			var eligibilityIDVal interface{}
			if eligibilityID != nil {
				eligibilityIDVal = *eligibilityID
			}

			var remainingQuotaVal interface{}
			if userQuota != nil {
				remainingQuotaVal = *userQuota
			}

			var maxAllowedVal interface{}
			if userMaxAmount != nil {
				maxAllowedVal = *userMaxAmount
			}

			var remainingAppsVal interface{}
			if userApplications != nil {
				remainingAppsVal = *userApplications
			}

			var eligibleValue interface{}
			if userEligible != nil {
				eligibleValue = *userEligible
			}

			var restrictionVal interface{}
			if userRestriction != nil {
				restrictionVal = *userRestriction
			}

			subcategory["user_eligibility"] = map[string]interface{}{
				"user_fund_eligibility_id": eligibilityIDVal,
				"remaining_quota":          remainingQuotaVal,
				"max_allowed_amount":       maxAllowedVal,
				"remaining_applications":   remainingAppsVal,
				"is_eligible":              eligibleValue,
				"restriction_reason":       restrictionVal,
				"calculated_at":            userCalculated,
				"updated_at":               userUpdated,
				"has_quota":                hasQuota,
				"has_applications":         hasApplications,
				"is_eligible_flag":         eligibleFlag,
				"can_apply":                userCanApply,
			}
		}

		subcategory["user_can_apply"] = userCanApply

		subcategories = append(subcategories, subcategory)
	}

	return subcategories
}

// GetFundStructureAlternative - Alternative approach using single query
func GetFundStructureAlternative(c *gin.Context) {
	yearID := c.Query("year_id")
	categoryID := c.Query("category_id")
	userID, _ := c.Get("userID")
	roleID, _ := c.Get("roleID")

	// Single comprehensive query
	query := `
        SELECT DISTINCT
            fc.category_id,
            fc.category_name,
            fc.status as category_status,
            fc.year_id,
            fs.subcategory_id,
            fs.subcategory_name,
            fs.fund_condition,
            fs.target_roles,
            fs.form_type,
            fs.form_url,
            fs.status as subcategory_status,
            -- ใช้ MIN หรือ MAX เพื่อเอาค่าเดียว (เพราะทุก budget ของ subcategory_id เดียวกันใช้เงินก้อนเดียวกัน)
            MIN(sb.allocated_amount) as allocated_amount,
            MIN(sb.remaining_budget) as remaining_budget,
            COUNT(DISTINCT sb.subcategory_budget_id) as budget_count,
            GROUP_CONCAT(DISTINCT sb.level) as levels
        FROM fund_categories fc
        INNER JOIN fund_subcategories fs ON fc.category_id = fs.category_id
            AND fs.delete_at IS NULL
            AND fs.status = 'active'
        LEFT JOIN subcategory_budgets sb ON fs.subcategory_id = sb.subcategory_id
            AND sb.delete_at IS NULL
            AND sb.status = 'active'
        WHERE fc.delete_at IS NULL 
            AND fc.status = 'active'`

	var args []interface{}

	if yearID != "" {
		query += " AND fc.year_id = ?"
		args = append(args, yearID)
	}

	if categoryID != "" {
		query += " AND fc.category_id = ?"
		args = append(args, categoryID)
	}

	// Role-based filtering
	if roleID != 3 {
		roleIDStr := fmt.Sprintf("%d", roleID)
		query += " AND (fs.target_roles IS NULL OR fs.target_roles = '' OR JSON_CONTAINS(fs.target_roles, ?))"
		args = append(args, fmt.Sprintf(`"%s"`, roleIDStr))
	}

	query += ` GROUP BY fc.category_id, fc.category_name, fc.status, fc.year_id,
               fs.subcategory_id, fs.subcategory_name, fs.fund_condition, 
               fs.target_roles, fs.form_type, fs.form_url, fs.status
               ORDER BY fc.category_id, fs.subcategory_id`

	rows, err := config.DB.Raw(query, args...).Rows()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch fund structure",
			"debug": err.Error(),
		})
		return
	}
	defer rows.Close()

	// Process results into structured format
	categoriesMap := make(map[int]map[string]interface{})

	for rows.Next() {
		var (
			catID           int
			catName         string
			catStatus       string
			yearID          *int
			subID           int
			subName         string
			fundCondition   *string
			targetRoles     *string
			formType        *string
			formURL         *string
			subStatus       string
			allocatedAmount *float64
			remainingBudget *float64
			budgetCount     int
			levels          *string
		)

		err := rows.Scan(
			&catID, &catName, &catStatus, &yearID,
			&subID, &subName, &fundCondition, &targetRoles,
			&formType, &formURL, &subStatus,
			&allocatedAmount, &remainingBudget,
			&budgetCount, &levels,
		)
		if err != nil {
			continue
		}

		// Create category if not exists
		if _, exists := categoriesMap[catID]; !exists {
			categoriesMap[catID] = map[string]interface{}{
				"category_id":   catID,
				"category_name": catName,
				"status":        catStatus,
				"year_id":       yearID,
				"subcategories": []map[string]interface{}{},
			}
		}

		// Parse target roles
		var targetRolesList []string
		if targetRoles != nil && *targetRoles != "" {
			json.Unmarshal([]byte(*targetRoles), &targetRolesList)
		}

		// Default values for NULL budgets
		allocatedVal := float64(0)
		remainingVal := float64(0)
		if allocatedAmount != nil {
			allocatedVal = *allocatedAmount
		}
		if remainingBudget != nil {
			remainingVal = *remainingBudget
		}

		// Add subcategory
		subcategory := map[string]interface{}{
			"subcategory_id":      subID,
			"subcategory_name":    subName,
			"fund_condition":      fundCondition,
			"target_roles":        targetRolesList,
			"form_type":           formType,
			"form_url":            formURL,
			"status":              subStatus,
			"allocated_amount":    allocatedVal,
			"remaining_budget":    remainingVal,
			"budget_count":        budgetCount,
			"has_multiple_levels": budgetCount > 1,
		}

		if budgetCount > 1 && levels != nil {
			subcategory["budget_levels"] = levels
		}

		// Append subcategory to category
		subs := categoriesMap[catID]["subcategories"].([]map[string]interface{})
		categoriesMap[catID]["subcategories"] = append(subs, subcategory)
	}

	// Convert map to slice
	var categories []map[string]interface{}
	for _, cat := range categoriesMap {
		categories = append(categories, cat)
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"categories": categories,
		"total":      len(categories),
		"user_id":    userID,
		"role_id":    roleID,
	})
}
