package models

import (
	"fmt"
	"time"
)

// ImportTemplate represents the import_templates table following the style of fund_forms.
type ImportTemplate struct {
	TemplateID   int        `gorm:"primaryKey;column:template_id" json:"template_id"`
	Title        string     `gorm:"column:title" json:"title"`
	Description  *string    `gorm:"column:description" json:"description"`
	FileName     string     `gorm:"column:file_name" json:"file_name"`
	FilePath     string     `gorm:"column:file_path" json:"file_path"`
	FileSize     *int64     `gorm:"column:file_size" json:"file_size"`
	MimeType     *string    `gorm:"column:mime_type" json:"mime_type"`
	TemplateType string     `gorm:"column:template_type;type:enum('user_import','submission_import','other');default:'user_import'" json:"template_type"`
	IsRequired   *bool      `gorm:"column:is_required" json:"is_required"`
	DisplayOrder *int       `gorm:"column:display_order" json:"display_order"`
	Status       string     `gorm:"column:status;type:enum('active','inactive','archived');default:'active'" json:"status"`
	CreatedBy    int        `gorm:"column:created_by" json:"created_by"`
	CreateAt     time.Time  `gorm:"column:create_at" json:"create_at"`
	UpdateAt     time.Time  `gorm:"column:update_at" json:"update_at"`
	DeleteAt     *time.Time `gorm:"column:delete_at" json:"delete_at,omitempty"`

	Creator User `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
}

// TableName overrides the table name for GORM
func (ImportTemplate) TableName() string {
	return "import_templates"
}

// ImportTemplateResponse defines the JSON payload for API consumers
type ImportTemplateResponse struct {
	TemplateID       int       `json:"template_id"`
	Title            string    `json:"title"`
	Description      *string   `json:"description"`
	FileName         string    `json:"file_name"`
	FilePath         string    `json:"file_path"`
	FileSize         *int64    `json:"file_size"`
	FileSizeReadable string    `json:"file_size_readable"`
	MimeType         *string   `json:"mime_type"`
	TemplateType     string    `json:"template_type"`
	TemplateTypeName string    `json:"template_type_name"`
	IsRequired       bool      `json:"is_required"`
	DisplayOrder     *int      `json:"display_order"`
	Status           string    `json:"status"`
	StatusName       string    `json:"status_name"`
	CreatedBy        int       `json:"created_by"`
	CreatorName      string    `json:"creator_name,omitempty"`
	CreateAt         time.Time `json:"create_at"`
	UpdateAt         time.Time `json:"update_at"`
}

// ToResponse converts a database model into a response payload
func (t *ImportTemplate) ToResponse() ImportTemplateResponse {
	resp := ImportTemplateResponse{
		TemplateID:       t.TemplateID,
		Title:            t.Title,
		Description:      t.Description,
		FileName:         t.FileName,
		FilePath:         t.FilePath,
		FileSize:         t.FileSize,
		FileSizeReadable: t.GetFileSizeReadable(),
		MimeType:         t.MimeType,
		TemplateType:     t.TemplateType,
		TemplateTypeName: t.GetTemplateTypeName(),
		IsRequired:       t.IsRequired != nil && *t.IsRequired,
		DisplayOrder:     t.DisplayOrder,
		Status:           t.Status,
		StatusName:       t.GetStatusName(),
		CreatedBy:        t.CreatedBy,
		CreateAt:         t.CreateAt,
		UpdateAt:         t.UpdateAt,
	}

	if t.Creator.UserID != 0 {
		resp.CreatorName = t.Creator.UserFname + " " + t.Creator.UserLname
	}

	return resp
}

// Helpers mirroring fund_forms style
func (t *ImportTemplate) GetFileSizeReadable() string {
	if t.FileSize == nil {
		return ""
	}

	size := float64(*t.FileSize)
	units := []string{"B", "KB", "MB", "GB", "TB"}
	for _, unit := range units {
		if size < 1024.0 || unit == "TB" {
			if size >= 100 {
				return fmt.Sprintf("%.0f %s", size, unit)
			}
			return fmt.Sprintf("%.2f %s", size, unit)
		}
		size = size / 1024.0
	}
	return ""
}

func (t *ImportTemplate) GetTemplateTypeName() string {
	switch t.TemplateType {
	case "user_import":
		return "เทมเพลตนำเข้าผู้ใช้งาน"
	case "submission_import":
		return "เทมเพลตนำเข้าคำร้อง"
	default:
		return "เทมเพลตอื่น ๆ"
	}
}

func (t *ImportTemplate) GetStatusName() string {
	if t.Status == "active" {
		return "เปิดใช้งาน"
	}
	if t.Status == "archived" {
		return "เก็บถาวร"
	}
	return "ปิดใช้งาน"
}

func (t *ImportTemplate) IsActive() bool { return t.Status == "active" }
