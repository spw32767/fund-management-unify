package controllers

import (
	"net/http"
	"strings"

	"fund-management-api/config"
	"fund-management-api/models"

	"github.com/gin-gonic/gin"
)

// AdminListImportTemplates returns active import/export templates for the admin import/export page
func AdminListImportTemplates(c *gin.Context) {
	templateType := strings.TrimSpace(c.Query("type"))
	status := strings.TrimSpace(c.DefaultQuery("status", "active"))

	query := config.DB.Model(&models.ImportTemplate{}).
		Preload("Creator").
		Where("delete_at IS NULL")

	if templateType != "" {
		query = query.Where("template_type = ?", templateType)
	}

	if status != "" && status != "all" {
		query = query.Where("status = ?", status)
	}

	query = query.Order("display_order IS NULL, display_order ASC").Order("update_at DESC")

	var templates []models.ImportTemplate
	if err := query.Find(&templates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "failed to fetch import templates"})
		return
	}

	responses := make([]models.ImportTemplateResponse, 0, len(templates))
	for i := range templates {
		responses = append(responses, templates[i].ToResponse())
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    responses,
		"count":   len(responses),
	})
}
