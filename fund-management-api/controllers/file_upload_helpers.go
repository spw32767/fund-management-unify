package controllers

import (
	"strings"

	"fund-management-api/models"
	"gorm.io/gorm"
)

// createFileUploadRecord attempts to persist a FileUpload and gracefully handles
// databases that do not expose the optional metadata column. If the metadata
// column is missing the record is saved without that field instead of failing
// the entire request.
func createFileUploadRecord(db *gorm.DB, fileUpload *models.FileUpload) error {
	if err := db.Create(fileUpload).Error; err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "unknown column 'metadata'") {
			return db.Omit("Metadata").Create(fileUpload).Error
		}
		return err
	}
	return nil
}
