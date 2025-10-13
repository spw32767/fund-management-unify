package controllers

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"fund-management-api/config"
	"fund-management-api/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// AdminListFundInstallmentPeriods provides paginated installment periods for a year.
func AdminListFundInstallmentPeriods(c *gin.Context) {
	yearParam := strings.TrimSpace(c.Query("year_id"))
	if yearParam == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "year_id is required",
		})
		return
	}

	yearID, err := strconv.Atoi(yearParam)
	if err != nil || yearID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "invalid year_id",
		})
		return
	}

	statusParam := strings.ToLower(strings.TrimSpace(c.DefaultQuery("status", "active")))
	includeDeletedParam := strings.ToLower(strings.TrimSpace(c.DefaultQuery("include_deleted", "false")))
	includeDeleted := includeDeletedParam == "true" || includeDeletedParam == "1"

	limitParam := strings.TrimSpace(c.DefaultQuery("limit", "50"))
	limit, err := strconv.Atoi(limitParam)
	if err != nil || limit <= 0 {
		limit = 50
	}
	if limit > 200 {
		limit = 200
	}

	offsetParam := strings.TrimSpace(c.DefaultQuery("offset", "0"))
	offset, err := strconv.Atoi(offsetParam)
	if err != nil || offset < 0 {
		offset = 0
	}

	baseQuery := config.DB.Model(&models.FundInstallmentPeriod{}).
		Where("year_id = ?", yearID)

	if !includeDeleted {
		baseQuery = baseQuery.Where("deleted_at IS NULL")
	}

	switch statusParam {
	case "", "active":
		baseQuery = baseQuery.Where("status = 'active'")
		statusParam = "active"
	case "inactive":
		baseQuery = baseQuery.Where("status = 'inactive'")
	case "all":
		// no additional filter
	default:
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "invalid status value",
		})
		return
	}

	var total int64
	if err := baseQuery.Session(&gorm.Session{}).Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "failed to count installment periods",
		})
		return
	}

	var periods []models.FundInstallmentPeriod
	if err := baseQuery.Session(&gorm.Session{}).
		Order("cutoff_date ASC, installment_number ASC").
		Limit(limit).
		Offset(offset).
		Find(&periods).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "failed to fetch installment periods",
		})
		return
	}

	responses := make([]fundInstallmentPeriodResponse, 0, len(periods))
	for _, period := range periods {
		responses = append(responses, newFundInstallmentPeriodResponse(period))
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    responses,
		"paging": gin.H{
			"total":  total,
			"limit":  limit,
			"offset": offset,
		},
	})
}

type adminFundInstallmentPeriodRequest struct {
	YearID            *int    `json:"year_id"`
	InstallmentNumber *int    `json:"installment_number"`
	CutoffDate        *string `json:"cutoff_date"`
	Name              *string `json:"name"`
	Status            *string `json:"status"`
	Remark            *string `json:"remark"`
}

// AdminCreateFundInstallmentPeriod creates a new installment period.
func AdminCreateFundInstallmentPeriod(c *gin.Context) {
	var req adminFundInstallmentPeriodRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	if req.YearID == nil || *req.YearID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "year_id is required",
		})
		return
	}

	if req.InstallmentNumber == nil || *req.InstallmentNumber <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "installment_number must be greater than 0",
		})
		return
	}

	if req.CutoffDate == nil || strings.TrimSpace(*req.CutoffDate) == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "cutoff_date is required",
		})
		return
	}

	cutoff, err := time.Parse("2006-01-02", strings.TrimSpace(*req.CutoffDate))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "cutoff_date must be in YYYY-MM-DD format",
		})
		return
	}

	statusValue := "active"
	if req.Status != nil && strings.TrimSpace(*req.Status) != "" {
		normalized := strings.ToLower(strings.TrimSpace(*req.Status))
		if normalized != "active" && normalized != "inactive" {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "status must be active or inactive",
			})
			return
		}
		statusValue = normalized
	}

	period := models.FundInstallmentPeriod{
		YearID:            *req.YearID,
		InstallmentNumber: *req.InstallmentNumber,
		CutoffDate:        cutoff,
		Name:              req.Name,
		Remark:            req.Remark,
	}
	period.Status = &statusValue

	if err := config.DB.Create(&period).Error; err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "duplicate entry") {
			c.JSON(http.StatusConflict, gin.H{
				"success": false,
				"error":   "installment number already exists for this year",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "failed to create installment period",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    newFundInstallmentPeriodResponse(period),
	})
}

// AdminUpdateFundInstallmentPeriod updates fields of an existing installment period.
func AdminUpdateFundInstallmentPeriod(c *gin.Context) {
	idParam := c.Param("id")
	periodID, err := strconv.Atoi(idParam)
	if err != nil || periodID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "invalid id",
		})
		return
	}

	var req adminFundInstallmentPeriodRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	var period models.FundInstallmentPeriod
	if err := config.DB.Where("installment_period_id = ? AND deleted_at IS NULL", periodID).
		First(&period).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "installment period not found",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "failed to load installment period",
		})
		return
	}

	updates := make(map[string]interface{})

	if req.YearID != nil {
		if *req.YearID <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "year_id must be greater than 0",
			})
			return
		}
		updates["year_id"] = *req.YearID
	}

	if req.InstallmentNumber != nil {
		if *req.InstallmentNumber <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "installment_number must be greater than 0",
			})
			return
		}
		updates["installment_number"] = *req.InstallmentNumber
	}

	if req.CutoffDate != nil {
		parsed, err := time.Parse("2006-01-02", strings.TrimSpace(*req.CutoffDate))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "cutoff_date must be in YYYY-MM-DD format",
			})
			return
		}
		updates["cutoff_date"] = parsed
	}

	if req.Name != nil {
		updates["name"] = *req.Name
	}

	if req.Remark != nil {
		updates["remark"] = *req.Remark
	}

	if req.Status != nil {
		normalized := strings.ToLower(strings.TrimSpace(*req.Status))
		if normalized != "active" && normalized != "inactive" {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "status must be active or inactive",
			})
			return
		}
		updates["status"] = normalized
	}

	if len(updates) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    newFundInstallmentPeriodResponse(period),
		})
		return
	}

	if err := config.DB.Model(&period).Updates(updates).Error; err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "duplicate entry") {
			c.JSON(http.StatusConflict, gin.H{
				"success": false,
				"error":   "installment number already exists for this year",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "failed to update installment period",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    newFundInstallmentPeriodResponse(period),
	})
}

// AdminDeleteFundInstallmentPeriod performs a soft delete on an installment period.
func AdminDeleteFundInstallmentPeriod(c *gin.Context) {
	idParam := c.Param("id")
	periodID, err := strconv.Atoi(idParam)
	if err != nil || periodID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "invalid id",
		})
		return
	}

	var period models.FundInstallmentPeriod
	if err := config.DB.Where("installment_period_id = ? AND deleted_at IS NULL", periodID).
		First(&period).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "installment period not found",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "failed to load installment period",
		})
		return
	}

	now := time.Now()
	updates := map[string]interface{}{
		"deleted_at": &now,
		"status":     "inactive",
	}

	if err := config.DB.Model(&period).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "failed to delete installment period",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "installment period deleted",
	})
}

// AdminRestoreFundInstallmentPeriod restores a previously deleted installment period.
func AdminRestoreFundInstallmentPeriod(c *gin.Context) {
	idParam := c.Param("id")
	periodID, err := strconv.Atoi(idParam)
	if err != nil || periodID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "invalid id",
		})
		return
	}

	var period models.FundInstallmentPeriod
	if err := config.DB.Where("installment_period_id = ?", periodID).
		First(&period).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "installment period not found",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "failed to load installment period",
		})
		return
	}

	if err := config.DB.Model(&period).
		Updates(map[string]interface{}{
			"deleted_at": nil,
			"status":     "active",
		}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "failed to restore installment period",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    newFundInstallmentPeriodResponse(period),
	})
}
