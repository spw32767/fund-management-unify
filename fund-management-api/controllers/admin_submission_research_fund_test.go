package controllers

import (
	"errors"
	"testing"
	"time"

	"fund-management-api/models"
)

func intPtr(v int) *int {
	return &v
}

func TestValidateResearchFundEvent_PaymentLimitExceeded(t *testing.T) {
	amount := 50.0
	submission := &models.Submission{
		SubmissionID: 1,
		CategoryID:   intPtr(researchFundCategoryID),
		StatusID:     0,
		FundApplicationDetail: &models.FundApplicationDetail{
			ApprovedAmount: 100,
		},
	}

	err := validateResearchFundEvent(submission, models.ResearchFundEventTypePayment, &amount, 1, 60, false)
	if !errors.Is(err, errPaymentCapExceeded) {
		t.Fatalf("expected errPaymentCapExceeded, got %v", err)
	}
}

func TestValidateResearchFundEvent_MissingAttachment(t *testing.T) {
	amount := 25.0
	submission := &models.Submission{
		SubmissionID: 2,
		CategoryID:   intPtr(researchFundCategoryID),
		StatusID:     0,
		FundApplicationDetail: &models.FundApplicationDetail{
			ApprovedAmount: 100,
		},
	}

	err := validateResearchFundEvent(submission, models.ResearchFundEventTypePayment, &amount, 0, 0, false)
	if !errors.Is(err, errPaymentAttachmentRequired) {
		t.Fatalf("expected errPaymentAttachmentRequired, got %v", err)
	}
}

func TestValidateResearchFundEvent_DisallowAfterClosure(t *testing.T) {
	amount := 10.0
	submission := &models.Submission{
		SubmissionID: 3,
		CategoryID:   intPtr(researchFundCategoryID),
		StatusID:     0,
		FundApplicationDetail: &models.FundApplicationDetail{
			ApprovedAmount: 100,
		},
	}

	err := validateResearchFundEvent(submission, models.ResearchFundEventTypePayment, &amount, 1, 20, true)
	if !errors.Is(err, errSubmissionClosedForPayments) {
		t.Fatalf("expected errSubmissionClosedForPayments, got %v", err)
	}
}

func TestApplyClosureTransition_Reopen(t *testing.T) {
	submission := &models.Submission{
		SubmissionID: 4,
		CategoryID:   intPtr(researchFundCategoryID),
	}

	approvedStatusID := 10
	closedStatusID := 11
	now := time.Now()

	submissionUpdates, detailUpdates, comment, statusAfterID, err := applyClosureTransition(submission, true, approvedStatusID, closedStatusID, now, "", true)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if submissionUpdates["status_id"] != approvedStatusID {
		t.Fatalf("expected status %d, got %v", approvedStatusID, submissionUpdates["status_id"])
	}
	if submissionUpdates["closed_at"] != nil {
		t.Fatalf("expected closed_at nil on reopen, got %v", submissionUpdates["closed_at"])
	}
	if detailUpdates["closed_at"] != nil {
		t.Fatalf("expected detail closed_at nil on reopen, got %v", detailUpdates["closed_at"])
	}
	if comment != "Submission reopened by admin" {
		t.Fatalf("unexpected comment: %s", comment)
	}
	if statusAfterID == nil || *statusAfterID != approvedStatusID {
		t.Fatalf("expected statusAfterID %d, got %v", approvedStatusID, statusAfterID)
	}
}

func TestValidateResearchFundEvent_NonResearchCategory(t *testing.T) {
	amount := 10.0
	otherCategory := 2
	submission := &models.Submission{
		SubmissionID: 5,
		CategoryID:   &otherCategory,
	}

	err := validateResearchFundEvent(submission, models.ResearchFundEventTypeNote, &amount, 0, 0, false)
	if !errors.Is(err, errSubmissionNotResearchFund) {
		t.Fatalf("expected errSubmissionNotResearchFund, got %v", err)
	}
}

func TestApplyClosureTransition_RequiresApproved(t *testing.T) {
	submission := &models.Submission{
		SubmissionID: 6,
		CategoryID:   intPtr(researchFundCategoryID),
	}

	_, _, _, _, err := applyClosureTransition(submission, false, 10, 11, time.Now(), "", false)
	if err == nil || err.Error() != "submission must be approved before closure" {
		t.Fatalf("expected approval error, got %v", err)
	}
}
