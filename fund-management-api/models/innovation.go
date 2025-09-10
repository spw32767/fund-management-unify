package models

import "time"

// Innovation represents a row in innovations table
// Contains basic information about user's innovation records
// Table: innovations

type Innovation struct {
	ID             int        `gorm:"primaryKey;column:id" json:"id"`
	UserID         int        `gorm:"column:user_id" json:"user_id"`
	Title          string     `gorm:"column:title" json:"title"`
	InnovationType string     `gorm:"column:innovation_type" json:"innovation_type"`
	Description    string     `gorm:"column:description" json:"description"`
	RegisteredDate *time.Time `gorm:"column:registered_date" json:"registered_date"`
	CreatedAt      *time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt      *time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (Innovation) TableName() string {
	return "innovations"
}
