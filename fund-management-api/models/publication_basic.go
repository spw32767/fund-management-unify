package models

import "time"

// Publication represents a row in publications table
// Contains basic information about user's published work
// Table: publications

type Publication struct {
	ID              int        `gorm:"primaryKey;column:id" json:"id"`
	UserID          int        `gorm:"column:user_id" json:"user_id"`
	Title           string     `gorm:"column:title" json:"title"`
	Journal         string     `gorm:"column:journal" json:"journal"`
	PublicationDate *time.Time `gorm:"column:publication_date" json:"publication_date"`
	DOI             string     `gorm:"column:doi" json:"doi"`
	CreatedAt       *time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt       *time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (Publication) TableName() string {
	return "publications"
}
