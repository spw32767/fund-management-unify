package main

import (
	"errors"
	"fund-management-api/config"
	"fund-management-api/models"
	"fund-management-api/utils"
	"log"
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
	"gorm.io/gorm"
)

func main() {
	log.Println("🗂  Starting single-user folder provisioning...")

	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, falling back to environment variables")
	}

	config.InitDB()

	targetUserID := 0 // 👈 Set this to the user_id you want to provision

	if targetUserID == 0 {
		log.Fatal("targetUserID is 0. Please set it to the desired user_id before running this command.")
	}

	uploadPath := os.Getenv("UPLOAD_PATH")
	if uploadPath == "" {
		uploadPath = "./uploads"
	}

	if err := os.MkdirAll(filepath.Join(uploadPath, "users"), 0755); err != nil {
		log.Fatalf("failed to prepare base upload directory: %v", err)
	}

	var user models.User
	if err := config.DB.First(&user, "user_id = ?", targetUserID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			log.Fatalf("no user found with user_id %d", targetUserID)
		}
		log.Fatalf("failed to query user_id %d: %v", targetUserID, err)
	}

	folderPath, err := utils.CreateUserFolderIfNotExists(user, uploadPath)
	if err != nil {
		log.Fatalf("failed to create folder structure for user_id %d: %v", targetUserID, err)
	}

	log.Printf("✅ User folder ready at %s", folderPath)
}
