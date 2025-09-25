package controllers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"

	"fund-management-api/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type deptHeadTestRecorder struct {
	called       bool
	newStatusID  int
	reviewStatus string
	comment      string
}

type deptHeadNotificationRecorder struct {
	called   bool
	decision string
	comment  string
}

func prepareDeptHeadTestHooks(t *testing.T) func() {
	t.Helper()

	originalFind := deptHeadFindStatusByCodeFunc
	originalLoad := deptHeadLoadSubmissionFunc
	originalRecord := deptHeadRecordDecisionFunc
	originalBuild := deptHeadBuildResponseFunc
	originalNotify := deptHeadNotifyDecisionFunc
	originalBegin := deptHeadBeginTxFunc

	return func() {
		deptHeadFindStatusByCodeFunc = originalFind
		deptHeadLoadSubmissionFunc = originalLoad
		deptHeadRecordDecisionFunc = originalRecord
		deptHeadBuildResponseFunc = originalBuild
		deptHeadNotifyDecisionFunc = originalNotify
		deptHeadBeginTxFunc = originalBegin
	}
}

func TestDeptHeadApproveSubmission_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	restore := prepareDeptHeadTestHooks(t)
	defer restore()

	statuses := map[string]*models.ApplicationStatus{
		deptHeadStatusReviewing: {ApplicationStatusID: 100, StatusCode: deptHeadStatusReviewing, StatusName: "reviewing"},
		deptHeadStatusApproved:  {ApplicationStatusID: 101, StatusCode: deptHeadStatusApproved, StatusName: "approved"},
	}

	deptHeadBeginTxFunc = func() *gorm.DB { return nil }
	deptHeadFindStatusByCodeFunc = func(slug string) (*models.ApplicationStatus, error) {
		status, ok := statuses[normalizeStatusSlug(slug)]
		if !ok {
			return nil, gorm.ErrRecordNotFound
		}
		return status, nil
	}

	submission := models.Submission{
		SubmissionID:     300,
		SubmissionNumber: "SUB-001",
		SubmissionType:   "publication_reward",
		StatusID:         statuses[deptHeadStatusReviewing].ApplicationStatusID,
		UserID:           200,
	}

	deptHeadLoadSubmissionFunc = func(tx *gorm.DB, submissionID int) (*models.Submission, error) {
		if submissionID != submission.SubmissionID {
			return nil, gorm.ErrRecordNotFound
		}
		return &submission, nil
	}

	recorder := &deptHeadTestRecorder{}
	deptHeadRecordDecisionFunc = func(tx *gorm.DB, sub *models.Submission, newStatusID int, reviewerID int, reviewStatus string, comment string, ip string) error {
		recorder.called = true
		recorder.newStatusID = newStatusID
		recorder.reviewStatus = reviewStatus
		recorder.comment = comment
		sub.StatusID = newStatusID
		sub.UpdatedAt = time.Now()
		return nil
	}

	deptHeadBuildResponseFunc = func(db *gorm.DB, submissionID int) (gin.H, error) {
		return gin.H{
			"submission": gin.H{
				"submission_id": submission.SubmissionID,
				"status_id":     submission.StatusID,
			},
		}, nil
	}

	notifier := &deptHeadNotificationRecorder{}
	deptHeadNotifyDecisionFunc = func(sub models.Submission, decision string, comment string) {
		notifier.called = true
		notifier.decision = decision
		notifier.comment = comment
	}

	body := bytes.NewBufferString(`{"comment":"  approved  "}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/dept-head/submissions/300/approve", body)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(w)
	ctx.Request = req
	ctx.Params = gin.Params{{Key: "id", Value: strconv.Itoa(submission.SubmissionID)}}
	ctx.Set("roleID", 4)
	ctx.Set("userID", 500)

	DeptHeadApproveSubmission(ctx)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	var resp map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}

	if success, ok := resp["success"].(bool); !ok || !success {
		t.Fatalf("expected success response, got %v", resp)
	}

	if submission.StatusID != statuses[deptHeadStatusApproved].ApplicationStatusID {
		t.Fatalf("expected submission status to update to %d, got %d", statuses[deptHeadStatusApproved].ApplicationStatusID, submission.StatusID)
	}

	if !recorder.called {
		t.Fatalf("expected record decision to be called")
	}

	if recorder.comment != "approved" {
		t.Fatalf("expected trimmed comment 'approved', got %q", recorder.comment)
	}

	if notifier.decision != "approved" || !notifier.called {
		t.Fatalf("expected notify decision to be called with approved")
	}

	if msg, ok := resp["message"].(string); !ok || msg == "" {
		t.Fatalf("expected response message, got %v", resp)
	}
}

func TestDeptHeadApproveSubmission_InvalidRole(t *testing.T) {
	gin.SetMode(gin.TestMode)
	restore := prepareDeptHeadTestHooks(t)
	defer restore()

	deptHeadFindStatusByCodeFunc = func(slug string) (*models.ApplicationStatus, error) {
		t.Fatalf("status lookup should not be called for invalid role")
		return nil, nil
	}

	req := httptest.NewRequest(http.MethodPost, "/api/v1/dept-head/submissions/1/approve", nil)
	w := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(w)
	ctx.Request = req
	ctx.Params = gin.Params{{Key: "id", Value: "1"}}
	ctx.Set("roleID", 1)
	ctx.Set("userID", 999)

	DeptHeadApproveSubmission(ctx)

	if w.Code != http.StatusForbidden {
		t.Fatalf("expected status 403, got %d", w.Code)
	}
}

func TestDeptHeadApproveSubmission_InvalidTransition(t *testing.T) {
	gin.SetMode(gin.TestMode)
	restore := prepareDeptHeadTestHooks(t)
	defer restore()

	statuses := map[string]*models.ApplicationStatus{
		deptHeadStatusReviewing: {ApplicationStatusID: 100, StatusCode: deptHeadStatusReviewing, StatusName: "reviewing"},
		deptHeadStatusApproved:  {ApplicationStatusID: 101, StatusCode: deptHeadStatusApproved, StatusName: "approved"},
	}

	deptHeadBeginTxFunc = func() *gorm.DB { return nil }
	deptHeadFindStatusByCodeFunc = func(slug string) (*models.ApplicationStatus, error) {
		status, ok := statuses[normalizeStatusSlug(slug)]
		if !ok {
			return nil, gorm.ErrRecordNotFound
		}
		return status, nil
	}

	submission := models.Submission{
		SubmissionID:     300,
		SubmissionNumber: "SUB-001",
		SubmissionType:   "publication_reward",
		StatusID:         statuses[deptHeadStatusApproved].ApplicationStatusID,
		UserID:           200,
	}

	deptHeadLoadSubmissionFunc = func(tx *gorm.DB, submissionID int) (*models.Submission, error) {
		if submissionID != submission.SubmissionID {
			return nil, gorm.ErrRecordNotFound
		}
		return &submission, nil
	}

	recorder := &deptHeadTestRecorder{}
	deptHeadRecordDecisionFunc = func(tx *gorm.DB, sub *models.Submission, newStatusID int, reviewerID int, reviewStatus string, comment string, ip string) error {
		recorder.called = true
		return nil
	}

	deptHeadBuildResponseFunc = func(db *gorm.DB, submissionID int) (gin.H, error) {
		return gin.H{}, nil
	}

	deptHeadNotifyDecisionFunc = func(sub models.Submission, decision string, comment string) {
		t.Fatalf("notify should not be called for invalid transition")
	}

	req := httptest.NewRequest(http.MethodPost, "/api/v1/dept-head/submissions/300/approve", nil)
	w := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(w)
	ctx.Request = req
	ctx.Params = gin.Params{{Key: "id", Value: strconv.Itoa(submission.SubmissionID)}}
	ctx.Set("roleID", 4)
	ctx.Set("userID", 500)

	DeptHeadApproveSubmission(ctx)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}

	if recorder.called {
		t.Fatalf("record decision should not be called on invalid transition")
	}
}
