# Fund Detail Attachment Mismatch Remediation Plan

## 1. Frontend Remediations

### app/member/components/funds/FundApplicationDetail.js
- **Cancel outstanding requests** using `AbortController` inside `loadSubmissionDetail` and cancel in a cleanup when `submissionId` changes.
- **Reset local state** (`submission`, `mainAnnouncementDetail`, `activityAnnouncementDetail`) when `submissionId` changes to avoid rendering stale `submission.documents`.
- **Ignore late responses** by checking the active `submissionId` before calling `setSubmission`.
- **Derive documents** from a dedicated `documents` state populated from `/submissions/:id/documents` instead of reading `submission.documents` fallback directly.
- **Sort deterministically** by `display_order` and `document_id` before rendering to prevent reordering between responses.

_Pseudocode sketch:_
```diff
 useEffect(() => {
-  if (submissionId) {
-    loadSubmissionDetail();
-  }
+  if (!submissionId) { return; }
+  abortRef.current?.abort();
+  abortRef.current = new AbortController();
+  setSubmission(null);
+  setDocuments([]);
+  loadSubmissionDetail(submissionId, abortRef.current.signal);
 }, [submissionId]);

-const loadSubmissionDetail = async () => {
+const loadSubmissionDetail = async (id, signal) => {
   setLoading(true);
   try {
-    const response = await submissionAPI.getSubmission(submissionId);
+    const response = await submissionAPI.getSubmission(id, { signal });
     const submissionData = response.submission || response;
     ...
-    setSubmission(submissionData);
+    if (signal.aborted || id !== submissionIdRef.current) return;
+    setSubmission(submissionData);
   } finally {
     setLoading(false);
   }
 };
```

### app/member/components/funds/PublicationRewardDetail.js
- Mirror the strategies in `FundApplicationDetail.js` for cancellation, state reset, and deterministic sorting.
- Treat announcement lookups as independent resources keyed by `submissionId` to avoid mixing results between submissions.

### app/admin/components/submissions/GeneralSubmissionDetails.js
- **Guard useEffects** by including `submissionId` in the dependency array and resetting `attachments` state when it changes.
- **Abort document requests** if the component unmounts or `submissionId` changes.
- **Remove fallbacks** to `submission.documents` in favor of the API response; if unavailable, show an error and empty state.
- **Key SWR/React Query caches** by `["adminSubmission", submissionId]` and `["adminSubmissionDocuments", submissionId]` to isolate caches.
- **Normalize attachments** with a helper that sorts by `display_order` then `document_id` before storing.

### app/admin/components/submissions/PublicationSubmissionDetails.js
- Apply the same fetch isolation and deterministic sorting as the general admin view.
- Separate preview/report attachment fetches into dedicated hooks keyed by `submissionId` to avoid reusing previous responses.

### app/member/components/dept/details/GeneralSubmissionDetailsDept.js
- Ensure the effect that loads attachments re-runs with `submissionId` and clears existing attachments immediately to avoid briefly showing stale data.
- Provide explicit empty/loading placeholders rather than falling back to `submission.documents` when the API call fails.
- Use `AbortController` for `Promise.all` requests; if `getSubmissionDocuments` is unavailable, require the caller to pass attachments explicitly to eliminate ambiguous fallbacks.

### app/member/components/dept/details/PublicationSubmissionDetailsDept.js
- Same adjustments as the general dept view, plus ensure preview/report builders derive attachments via per-submission cache keys.

### Shared hooks and API clients (e.g., app/lib/member_api.js, teacher_api.js)
- Introduce `fetchSubmissionDocuments(submissionId, { signal })` helpers that enforce abort semantics and return sorted arrays.
- Update SWR or React Query hooks to include `submissionId` in their cache keys.
- Ensure any shared store slices keep attachments keyed by `submissionId` rather than a single list.

### Defensive rendering across all views
- Render attachments only when `currentSubmissionId === requestedId` and the fetch is resolved.
- Display skeleton/loading states while waiting; on abort, keep showing the last known good data only when it matches the active `submissionId`.

## 2. Backend Remediations

### controllers/submission.go — `GetSubmission`
- Amend the document preload to filter soft deletes and invalid folder types.
```go
Preload("Documents", func(db *gorm.DB) *gorm.DB {
  return db.
    Where("submission_documents.deleted_at IS NULL").
    Joins("LEFT JOIN document_types dt ON dt.document_type_id = submission_documents.document_type_id").
    Joins("LEFT JOIN file_uploads fu ON fu.file_id = submission_documents.file_id").
    Where("fu.delete_at IS NULL AND fu.folder_type != ?", "temp").
    Select("submission_documents.*, dt.document_type_name").
    Order("submission_documents.display_order ASC, submission_documents.document_id ASC")
})
```
- After loading, verify every `doc.SubmissionID == submission.SubmissionID`; if any mismatch, log and drop the offending rows before responding.

### controllers/submission.go — `GetSubmissionDocuments`
- Apply explicit filters and ordering.
```go
if err := config.DB.
  Joins("LEFT JOIN document_types dt ON dt.document_type_id = submission_documents.document_type_id").
  Joins("INNER JOIN file_uploads fu ON fu.file_id = submission_documents.file_id").
  Where("submission_documents.submission_id = ?", submissionID).
  Where("submission_documents.deleted_at IS NULL").
  Where("fu.delete_at IS NULL AND fu.folder_type <> ?", "temp").
  Select("submission_documents.*, dt.document_type_name").
  Order("submission_documents.display_order ASC, submission_documents.document_id ASC").
  Find(&documents).Error; err != nil {
  ...
}
```
- Before returning, assert that `len(documents)` equals the count of distinct `document.SubmissionID`; log discrepancies and consider returning HTTP 500 to surface corruption.
- Add structured logs:
```go
log.WithFields(logrus.Fields{
  "submission_id": submissionID,
  "document_ids": collectIDs(documents),
  "file_ids": collectFileIDs(documents),
}).Info("submission_documents payload")
```

### controllers/document.go and other attachment-related endpoints
- Reuse a helper scope that enforces `deleted_at`/`folder_type` filters for consistency.
- Apply the same ordering and guardrails in report/preview endpoints.

### Database indexes
- Add composite indexes to support the new filters:
```sql
CREATE INDEX idx_submission_documents_submission ON submission_documents (submission_id, deleted_at);
CREATE INDEX idx_submission_documents_display_order ON submission_documents (submission_id, display_order, document_id);
CREATE INDEX idx_file_uploads_folder ON file_uploads (file_id, folder_type, delete_at);
```

## 3. File Reuse Policy
- **UI labelling:** When listing attachments, display both `submission_number` and an indicator if `file_id` exists in other submissions (e.g., “Shared from submission #005”).
- **Server invariants:** When responding, scan `documents` for `file_id`s bound to different `submission_id`s; if found, include metadata to clarify reuse or reject the response unless reuse is allowed.
- **Optional configuration:** Introduce a feature flag `ALLOW_FILE_REUSE` that defaults to `false`, blocking `AttachDocument` if the `file_id` is already linked elsewhere unless a privileged flag or admin override is supplied.

## 4. Race and Stale Response Handling
- Maintain a `currentRequestId` ref per component. Increment before each fetch, capture locally, and only apply the response when IDs match. Abort previous requests when navigating away.
```js
const requestSeq = useRef(0);
const load = async (id) => {
  const seq = ++requestSeq.current;
  const { data } = await api.getSubmission(id, { signal });
  if (seq !== requestSeq.current) return; // outdated
  setSubmission(data);
};
```
- When using fetch/axios, pass `signal` from `AbortController` and call `controller.abort()` inside cleanup to cancel network work.

## 5. Test Plan
- **Unit tests (backend):** Add tests for `GetSubmission` and `GetSubmissionDocuments` verifying that soft-deleted docs and temp-folder files are excluded and ordering is stable.
- **Unit tests (frontend):** Mock API responses and ensure attachments render only when request tokens match the active `submissionId`.
- **Integration tests:** Use Cypress/Playwright to simulate rapid navigation between submissions (005 → 007) with network throttling and confirm attachments do not bleed over.
- **Regression checks:** Seed fixtures with shared `file_id`s, soft-deleted rows, and orphaned docs to verify the UI and backend guardrails behave correctly.
- **Telemetry:** Add dashboards tracking mismatched `(submission_id, file_id)` pairs and alert when payload validation drops documents.

## 6. Rollout and Safety
- Ship backend query tightening behind a feature flag (`strict_submission_documents_filter`). Enable in staging, then progressively for members, dept-heads, admins.
- Gate frontend isolation via config (`enableSubmissionAttachmentGuards`) allowing gradual opt-in per role.
- Provide migration scripts for new indexes with rollback instructions; deploy during low-traffic windows and monitor query plans.
- Document opt-out switches in case legacy reports rely on broader document visibility.
