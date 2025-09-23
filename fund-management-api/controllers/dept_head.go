package controllers

import (
        "net/http"
        "strconv"
        "strings"
        "time"

        "github.com/gin-gonic/gin"

        "fund-management-api/config"
        "fund-management-api/models"
        "fund-management-api/utils"
)

const (
        statusLabelDeptPending     = "อยู่ระหว่างการพิจารณาจากหัวหน้าสาขา"
        statusLabelDeptRecommended = "เห็นควรพิจารณาจากหัวหน้าสาขา"
        statusLabelDeptRejected    = "ไม่เห็นควรพิจารณา"
)

func getDeptHeadStatusMap() (map[string]models.ApplicationStatus, error) {
        labels := []string{
                statusLabelDeptPending,
                statusLabelDeptRecommended,
                statusLabelDeptRejected,
        }
        return utils.ResolveStatusesByLabels(labels)
}

// GetDeptHeadSubmissions lists submissions awaiting department head review.
func GetDeptHeadSubmissions(c *gin.Context) {
        statusMap, err := getDeptHeadStatusMap()
        if err != nil {
                c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
                return
        }

        pendingID := statusMap[statusLabelDeptPending].ApplicationStatusID

        var submissions []models.Submission
        query := config.DB.
                Preload("User").
                Preload("Status").
                Preload("Category").
                Preload("Subcategory").
                Where("status_id = ? AND deleted_at IS NULL", pendingID).
                Order("submitted_at IS NULL ASC").
                Order("submitted_at ASC").
                Order("created_at ASC")

        if err := query.Find(&submissions).Error; err != nil {
                c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch submissions"})
                return
        }

        c.JSON(http.StatusOK, gin.H{
                "success":     true,
                "submissions": submissions,
                "total":       len(submissions),
        })
}

// DeptHeadRecommendSubmission records a positive recommendation and forwards to admin.
func DeptHeadRecommendSubmission(c *gin.Context) {
        submissionID, err := strconv.Atoi(c.Param("id"))
        if err != nil {
                c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid submission ID"})
                return
        }
        userIDVal, _ := c.Get("userID")
        reviewerID, _ := userIDVal.(int)

        var req struct {
                Comment string `json:"comment"`
        }
        if err := c.ShouldBindJSON(&req); err != nil && err.Error() != "EOF" {
                c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload"})
                return
        }

        statusMap, err := getDeptHeadStatusMap()
        if err != nil {
                c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
                return
        }

        pendingID := statusMap[statusLabelDeptPending].ApplicationStatusID
        recommendedID := statusMap[statusLabelDeptRecommended].ApplicationStatusID

        tx := config.DB.Begin()

        var submission models.Submission
        if err := tx.Where("submission_id = ? AND deleted_at IS NULL", submissionID).
                First(&submission).Error; err != nil {
                tx.Rollback()
                c.JSON(http.StatusNotFound, gin.H{"error": "Submission not found"})
                return
        }

        if submission.StatusID != pendingID {
                tx.Rollback()
                c.JSON(http.StatusBadRequest, gin.H{"error": "Submission is not awaiting department review"})
                return
        }

        now := time.Now()
        comment := strings.TrimSpace(req.Comment)

        updates := map[string]interface{}{
                "status_id":        recommendedID,
                "head_approved_by": reviewerID,
                "head_approved_at": now,
                "updated_at":       now,
        }
        if comment != "" {
                updates["comment"] = comment
        }

        if err := tx.Model(&models.Submission{}).
                Where("submission_id = ?", submissionID).
                Updates(updates).Error; err != nil {
                tx.Rollback()
                c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update submission"})
                return
        }

        history := models.SubmissionStatusHistory{
                SubmissionID: submission.SubmissionID,
                NewStatusID:  recommendedID,
                ChangedBy:    reviewerID,
                CreatedAt:    now,
        }
        oldStatus := submission.StatusID
        history.OldStatusID = &oldStatus
        if comment != "" {
                history.Notes = &comment
        }

        if err := tx.Create(&history).Error; err != nil {
                tx.Rollback()
                c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record status history"})
                return
        }

        if err := tx.Commit().Error; err != nil {
                c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save recommendation"})
                return
        }

        var updated models.Submission
        if err := config.DB.Preload("User").
                Preload("Status").
                Preload("Category").
                Preload("Subcategory").
                Where("submission_id = ?", submissionID).
                First(&updated).Error; err != nil {
                c.JSON(http.StatusOK, gin.H{"success": true, "message": "Submission forwarded"})
                return
        }

        c.JSON(http.StatusOK, gin.H{
                "success":    true,
                "message":    "Submission forwarded",
                "submission": updated,
        })
}

// DeptHeadRejectSubmission marks the submission as not recommended by the department head.
func DeptHeadRejectSubmission(c *gin.Context) {
        submissionID, err := strconv.Atoi(c.Param("id"))
        if err != nil {
                c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid submission ID"})
                return
        }
        userIDVal, _ := c.Get("userID")
        reviewerID, _ := userIDVal.(int)

        var req struct {
                Comment string `json:"comment"`
        }
        if err := c.ShouldBindJSON(&req); err != nil && err.Error() != "EOF" {
                c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload"})
                return
        }

        statusMap, err := getDeptHeadStatusMap()
        if err != nil {
                c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
                return
        }

        pendingID := statusMap[statusLabelDeptPending].ApplicationStatusID
        rejectedID := statusMap[statusLabelDeptRejected].ApplicationStatusID

        tx := config.DB.Begin()

        var submission models.Submission
        if err := tx.Where("submission_id = ? AND deleted_at IS NULL", submissionID).
                First(&submission).Error; err != nil {
                tx.Rollback()
                c.JSON(http.StatusNotFound, gin.H{"error": "Submission not found"})
                return
        }

        if submission.StatusID != pendingID {
                tx.Rollback()
                c.JSON(http.StatusBadRequest, gin.H{"error": "Submission is not awaiting department review"})
                return
        }

        now := time.Now()
        comment := strings.TrimSpace(req.Comment)

        updates := map[string]interface{}{
                "status_id":        rejectedID,
                "head_approved_by": reviewerID,
                "head_approved_at": now,
                "updated_at":       now,
        }
        if comment != "" {
                updates["comment"] = comment
        }

        if err := tx.Model(&models.Submission{}).
                Where("submission_id = ?", submissionID).
                Updates(updates).Error; err != nil {
                tx.Rollback()
                c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update submission"})
                return
        }

        history := models.SubmissionStatusHistory{
                SubmissionID: submission.SubmissionID,
                NewStatusID:  rejectedID,
                ChangedBy:    reviewerID,
                CreatedAt:    now,
        }
        oldStatus := submission.StatusID
        history.OldStatusID = &oldStatus
        if comment != "" {
                history.Notes = &comment
        }

        if err := tx.Create(&history).Error; err != nil {
                tx.Rollback()
                c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record status history"})
                return
        }

        if err := tx.Commit().Error; err != nil {
                c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save decision"})
                return
        }

        var updated models.Submission
        if err := config.DB.Preload("User").
                Preload("Status").
                Preload("Category").
                Preload("Subcategory").
                Where("submission_id = ?", submissionID).
                First(&updated).Error; err != nil {
                c.JSON(http.StatusOK, gin.H{"success": true, "message": "Submission marked as not recommended"})
                return
        }

        c.JSON(http.StatusOK, gin.H{
                "success":    true,
                "message":    "Submission marked as not recommended",
                "submission": updated,
        })
}
