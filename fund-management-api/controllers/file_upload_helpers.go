package controllers

import (
	"sync"

	"fund-management-api/models"
	"gorm.io/gorm"
)

var (
	fileUploadMetadataOnce      sync.Once
	fileUploadMetadataSupported bool
)

// createFileUploadRecord persists a FileUpload while accounting for databases
// that predate the optional metadata column. We check for column availability
// once per process and omit the field on inserts when the schema does not
// expose it, matching the behaviour of earlier revisions of the service.
func createFileUploadRecord(db *gorm.DB, fileUpload *models.FileUpload) error {
	if !fileUploadSupportsMetadata(db) {
		return db.Omit("Metadata").Create(fileUpload).Error
	}
	return db.Create(fileUpload).Error
}

func fileUploadSupportsMetadata(db *gorm.DB) bool {
	fileUploadMetadataOnce.Do(func() {
		fileUploadMetadataSupported = db.Migrator().HasColumn(&models.FileUpload{}, "metadata")
	})
	return fileUploadMetadataSupported
}
