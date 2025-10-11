# Merged Submission PDF Workflow

This document explains how merged submission PDFs are generated after a member submits an application. The feature automatically collects every PDF attachment that belongs to a submission, merges them, and stores the combined file in a year-specific directory.

## When does merging happen?

1. A member completes either the **Generic Fund Application** or the **Publication Reward Application** form.
2. After the form uploads all supporting documents and calls the submit endpoint, it issues one additional request to:

   ```http
   POST /submissions/{submissionId}/merge-documents
   ```

3. The backend collects every PDF file associated with that submission (including generated PDFs such as the publication reward form) and merges them into a single document.
   * When only a single PDF exists, it is copied into the archive directory so the storage layout stays consistent without relying on external merge tools.

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

> **Note:** The API prepares the `merge_submissions/{year}` directory automatically. You do not need to pre-create the folder on the server.

## Error handling

* If the submission has not been formally submitted yet, the merge endpoint returns `400 Bad Request`.
* When no PDF documents are attached, the endpoint still returns `200 OK` with `merged_file: null` and a `message` that explains no PDFs were available. This keeps the submission flow smooth even when only non-PDF documents were uploaded.
* File paths are normalised before merging, so uploads that store Windows-style (`\\`) separators can still be located on Linux hosts.
* PDF merging attempts to use the repository's existing toolchain (Node.js via `merge_pdf.js`, Ghostscript, then `pdfunite`). Detailed log lines prefixed with `[mergePDFs]` record which tools were available and whether they succeeded.
* Additional `[MergeSubmissionDocuments]` log lines capture which submission documents were considered and why any were skipped. These logs surface missing files, unresolvable paths, or format mismatches that would otherwise fail silently.
* Any unexpected error still results in `500 Internal Server Error`. The frontend logs these errors but does not block the overall submission flow.

## Viewing the logs

The merge diagnostics use Go's standard logger, so they appear alongside the rest of the API service logs:

* **Local development:** run the API with `go run ./cmd/api` (or `./fund-api`) and watch the terminal output. Merge activity is prefixed with `[MergeSubmissionDocuments]` and helper messages with `[mergePDFs]`.
* **Systemd deployments:** inspect the service journal, for example `journalctl -u fund-api.service -f` to tail live activity on the server.
* **Containerised deployments:** check the container output, e.g. `docker logs -f fund-management-api`.

All log entries include the submission ID so you can filter the stream when investigating a specific request:

```bash
journalctl -u fund-api.service | grep "MergeSubmissionDocuments" | grep "submission 1234"
```

## Local testing tips

1. Submit an application through either form in the member portal.
2. Inspect the browser console to confirm the merge call and response.
3. Verify the merged file exists under `uploads/merge_submissions/<year>/` on the server.
4. Tail the API logs to diagnose merge failures (`controllers/submission.go`).

This workflow ensures every submission has a consolidated PDF package that can be archived or forwarded without manually combining files.
