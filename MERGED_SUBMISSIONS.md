# Merged Submission PDF Workflow

This document explains how merged submission PDFs are generated after a member submits an application. The feature automatically collects every PDF attachment that belongs to a submission, merges them, and stores the combined file in a year-specific directory.

## When does merging happen?

1. A member completes either the **Generic Fund Application** or the **Publication Reward Application** form.
2. After the form uploads all supporting documents and calls the submit endpoint, it issues one additional request to:

   ```http
   POST /submissions/{submissionId}/merge-documents
   ```

3. The backend collects every PDF file associated with that submission (including generated PDFs such as the publication reward form) and merges them into a single document.

## Storage location

* Base directory: `uploads/merge_submissions/{system_config.current_year}`
* Filename format: `{submission_number}_merged_document.pdf`
  * Example: `PR-2568-0001_merged_document.pdf`
* Resulting path example:

  ```text
  uploads/merge_submissions/2568/PR-2568-0001_merged_document.pdf
  ```

If a submission number is unavailable, the service falls back to a safe name such as `submission-42_merged_document.pdf`. Existing files are never overwritten; a numeric suffix is added when needed.

## API response

A successful merge returns JSON that includes the stored file metadata:

```json
{
  "success": true,
  "merged_file": {
    "file_id": 1234,
    "filename": "PR-2568-0001_merged_document.pdf",
    "stored_path": "/var/app/uploads/merge_submissions/2568/PR-2568-0001_merged_document.pdf",
    "relative_path": "uploads/merge_submissions/2568/PR-2568-0001_merged_document.pdf",
    "size": 1048576
  }
}
```

The `relative_path` field mirrors the example path shown above and can be stored or logged for later retrieval.

## Error handling

* If the submission has not been formally submitted yet, the merge endpoint returns `400 Bad Request`.
* When no PDF documents are attached, the endpoint also returns `400 Bad Request` with a descriptive message.
* Any unexpected error (e.g., merge tool unavailable) results in `500 Internal Server Error`. The frontend logs these errors but does not block the overall submission flow.

## Local testing tips

1. Submit an application through either form in the member portal.
2. Inspect the browser console to confirm the merge call and response.
3. Verify the merged file exists under `uploads/merge_submissions/<year>/` on the server.
4. Tail the API logs to diagnose merge failures (`controllers/submission.go`).

This workflow ensures every submission has a consolidated PDF package that can be archived or forwarded without manually combining files.
