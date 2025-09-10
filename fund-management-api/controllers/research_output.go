package controllers

import (
	"net/http"

	"fund-management-api/config"
	"fund-management-api/models"

	"github.com/gin-gonic/gin"
)

// GetUserPublications returns publications of current user
func GetUserPublications(c *gin.Context) {
	userID, _ := c.Get("userID")

	var publications []models.Publication
	if err := config.DB.Where("user_id = ?", userID).Order("publication_date DESC").Find(&publications).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch publications"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"publications": publications})
}

// GetUserInnovations returns innovations of current user
func GetUserInnovations(c *gin.Context) {
	userID, _ := c.Get("userID")

	var innovations []models.Innovation
	if err := config.DB.Where("user_id = ?", userID).Order("registered_date DESC").Find(&innovations).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch innovations"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"innovations": innovations})
}
