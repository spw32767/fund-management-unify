package utils

import (
    "fmt"
    "strings"

    "fund-management-api/config"
    "fund-management-api/models"
)

// FetchApplicationStatuses returns all status records from database.
func FetchApplicationStatuses() ([]models.ApplicationStatus, error) {
    var statuses []models.ApplicationStatus
    if err := config.DB.Find(&statuses).Error; err != nil {
        return nil, err
    }
    return statuses, nil
}

// ResolveStatusesByLabels returns a map of label -> status record, matching by substring.
func ResolveStatusesByLabels(labels []string) (map[string]models.ApplicationStatus, error) {
    if len(labels) == 0 {
        return map[string]models.ApplicationStatus{}, nil
    }

    statuses, err := FetchApplicationStatuses()
    if err != nil {
        return nil, err
    }

    result := make(map[string]models.ApplicationStatus, len(labels))
    for _, label := range labels {
        matched := []models.ApplicationStatus{}
        for _, status := range statuses {
            if strings.Contains(status.StatusName, label) {
                matched = append(matched, status)
            }
        }

        if len(matched) == 0 {
            return nil, fmt.Errorf("status containing %q not found", label)
        }
        if len(matched) > 1 {
            return nil, fmt.Errorf("multiple statuses matched label %q", label)
        }
        result[label] = matched[0]
    }

    return result, nil
}

// ResolveStatusIDByLabel resolves a single status ID by matching the status name substring.
func ResolveStatusIDByLabel(label string) (int, error) {
    records, err := ResolveStatusesByLabels([]string{label})
    if err != nil {
        return 0, err
    }
    status, ok := records[label]
    if !ok {
        return 0, fmt.Errorf("status containing %q not found", label)
    }
    return status.ApplicationStatusID, nil
}
