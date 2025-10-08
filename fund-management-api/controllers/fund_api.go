// controllers/fund_api.go
package controllers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"fund-management-api/config"
	"net/http"

	"github.com/gin-gonic/gin"
)

// GetFundStructure - API ใหม่ที่จัดกลุ่มข้อมูลให้พร้อมใช้งาน
func GetFundStructure(c *gin.Context) {
	yearID := c.Query("year_id")
	categoryID := c.Query("category_id")
	userID, _ := c.Get("userID")
	roleID, _ := c.Get("roleID")

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

	if yearID != "" {
		categoriesQuery += " AND fc.year_id = ?"
		categoryArgs = append(categoryArgs, yearID)
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
			yearID    *int
		)

		err := categoryRows.Scan(&catID, &catName, &catStatus, &yearID)
		if err != nil {
			continue
		}

		// Get subcategories for this category (grouped)
		subcategories := getGroupedSubcategories(catID, roleID.(int))

		// Only add category if it has visible subcategories
		if len(subcategories) > 0 {
			category := map[string]interface{}{
				"category_id":   catID,
				"category_name": catName,
				"status":        catStatus,
				"year_id":       yearID,
				"subcategories": subcategories,
			}
			categories = append(categories, category)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"categories": categories,
		"total":      len(categories),
		"user_id":    userID,
		"role_id":    roleID,
	})
}

// getGroupedSubcategories - Helper function to get subcategories grouped by subcategory_id
func getGroupedSubcategories(categoryID int, roleID int) []map[string]interface{} {
	query := `
        SELECT
            fs.subcategory_id,
            fs.subcategory_name,
            fs.fund_condition,
            fs.target_roles,
            fs.form_type,
            fs.form_url,
            fs.status,
            COALESCE(vbs.allocated_amount, 0) AS allocated_amount,
            COALESCE(vbs.used_amount, 0) AS used_amount,
            COALESCE(vbs.remaining_budget, 0) AS remaining_budget,
            overall.max_grants,
            overall.max_amount_per_year,
            overall.max_amount_per_grant,
            COALESCE(usage_stats.total_grants, 0) AS used_grants,
            CASE
                WHEN overall.max_grants IS NULL THEN NULL
                ELSE CAST(GREATEST(overall.max_grants - COALESCE(usage_stats.total_grants, 0), 0) AS SIGNED)
            END AS remaining_grant,
            COALESCE(rule_stats.budget_count, 0) AS budget_count,
            rule_stats.levels,
            rule_stats.descriptions
        FROM fund_subcategories fs
        LEFT JOIN v_budget_summary vbs ON vbs.subcategory_id = fs.subcategory_id
        LEFT JOIN (
            SELECT
                sb.subcategory_id,
                sb.max_grants,
                sb.max_amount_per_year,
                sb.max_amount_per_grant
            FROM subcategory_budgets sb
            WHERE sb.delete_at IS NULL
                AND sb.status = 'active'
                AND sb.record_scope = 'overall'
        ) overall ON overall.subcategory_id = fs.subcategory_id
        LEFT JOIN (
            SELECT
                subcategory_id,
                COUNT(DISTINCT subcategory_budget_id) AS budget_count,
                GROUP_CONCAT(DISTINCT level ORDER BY level) AS levels,
                GROUP_CONCAT(DISTINCT fund_description ORDER BY level) AS descriptions
            FROM subcategory_budgets
            WHERE delete_at IS NULL
                AND status = 'active'
                AND record_scope = 'rule'
            GROUP BY subcategory_id
        ) rule_stats ON rule_stats.subcategory_id = fs.subcategory_id
        LEFT JOIN (
            SELECT
                subcategory_id,
                SUM(used_grants) AS total_grants
            FROM v_subcategory_user_usage_total
            GROUP BY subcategory_id
        ) usage_stats ON usage_stats.subcategory_id = fs.subcategory_id
        WHERE fs.delete_at IS NULL
            AND fs.status = 'active'
            AND fs.category_id = ?`

	var args []interface{}
	args = append(args, categoryID)

	if roleID != 3 {
		roleIDStr := fmt.Sprintf("%d", roleID)
		query += " AND (fs.target_roles IS NULL OR fs.target_roles = '' OR JSON_CONTAINS(fs.target_roles, ?))"
		args = append(args, fmt.Sprintf(`"%s"`, roleIDStr))
	}

	query += " ORDER BY fs.subcategory_id"

	rows, err := config.DB.Raw(query, args...).Rows()
	if err != nil {
		return []map[string]interface{}{}
	}
	defer rows.Close()

	var subcategories []map[string]interface{}

	for rows.Next() {
		var (
			subID           int
			subName         string
			fundCondition   sql.NullString
			targetRoles     sql.NullString
			formType        sql.NullString
			formURL         sql.NullString
			status          string
			allocatedAmount sql.NullFloat64
			usedAmount      sql.NullFloat64
			remainingBudget sql.NullFloat64
			maxGrants       sql.NullInt64
			maxPerYear      sql.NullFloat64
			maxPerGrant     sql.NullFloat64
			usedGrants      sql.NullInt64
			remainingGrant  sql.NullInt64
			budgetCount     sql.NullInt64
			levels          sql.NullString
			descriptions    sql.NullString
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
			&usedAmount,
			&remainingBudget,
			&maxGrants,
			&maxPerYear,
			&maxPerGrant,
			&usedGrants,
			&remainingGrant,
			&budgetCount,
			&levels,
			&descriptions,
		)
		if err != nil {
			continue
		}

		// Parse target roles
		var targetRolesList []string
		if targetRoles.Valid && targetRoles.String != "" {
			json.Unmarshal([]byte(targetRoles.String), &targetRolesList)
		}

		allocatedVal := allocatedAmount.Float64
		remainingVal := remainingBudget.Float64
		usedVal := usedAmount.Float64
		usedGrantVal := int64(0)
		if usedGrants.Valid {
			usedGrantVal = usedGrants.Int64
		}

		subcategory := map[string]interface{}{
			"subcategory_id":   subID,
			"subcategory_name": subName,
			"fund_condition": func() interface{} {
				if fundCondition.Valid {
					return fundCondition.String
				}
				return nil
			}(),
			"target_roles": targetRolesList,
			"form_type": func() interface{} {
				if formType.Valid {
					return formType.String
				}
				return nil
			}(),
			"form_url": func() interface{} {
				if formURL.Valid {
					return formURL.String
				}
				return nil
			}(),
			"status":              status,
			"allocated_amount":    allocatedVal,
			"used_amount":         usedVal,
			"remaining_budget":    remainingVal,
			"budget_count":        int(budgetCount.Int64),
			"has_multiple_levels": budgetCount.Int64 > 1,
			"used_grants":         usedGrantVal,
		}

		if maxGrants.Valid {
			subcategory["max_grants"] = int(maxGrants.Int64)
		} else {
			subcategory["max_grants"] = nil
		}

		if maxPerYear.Valid {
			subcategory["max_amount_per_year"] = maxPerYear.Float64
		}

		if maxPerGrant.Valid {
			subcategory["max_amount_per_grant"] = maxPerGrant.Float64
		}

		if remainingGrant.Valid {
			subcategory["remaining_grant"] = int(remainingGrant.Int64)
		} else {
			subcategory["remaining_grant"] = nil
		}

		if budgetCount.Int64 > 1 {
			if levels.Valid {
				subcategory["budget_levels"] = levels.String
			}
			if descriptions.Valid {
				subcategory["budget_descriptions"] = descriptions.String
			}
		}

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
            COALESCE(sb_overall.allocated_amount, 0) as allocated_amount,
            COALESCE(sb_overall.remaining_budget, 0) as remaining_budget,
            COUNT(DISTINCT sb_rule.subcategory_budget_id) as budget_count,
            GROUP_CONCAT(DISTINCT sb_rule.level) as levels
        FROM fund_categories fc
        INNER JOIN fund_subcategories fs ON fc.category_id = fs.category_id
            AND fs.delete_at IS NULL
            AND fs.status = 'active'
        LEFT JOIN subcategory_budgets sb_overall ON fs.subcategory_id = sb_overall.subcategory_id
            AND sb_overall.delete_at IS NULL
            AND sb_overall.status = 'active'
            AND sb_overall.record_scope = 'overall'
        LEFT JOIN subcategory_budgets sb_rule ON fs.subcategory_id = sb_rule.subcategory_id
            AND sb_rule.delete_at IS NULL
            AND sb_rule.status = 'active'
            AND sb_rule.record_scope = 'rule'
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
               fs.target_roles, fs.form_type, fs.form_url, fs.status,
               sb_overall.allocated_amount, sb_overall.remaining_budget
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
