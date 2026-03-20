# Legacy Submission Template – Mandatory Columns

Use these fields when preparing legacy submission imports so database `NOT NULL` and foreign-key rules are satisfied. Columns are listed alphabetically within each section.

## Base submission (all submission types)
- `status_id` — required status reference for every submission.
- `submission_id` — primary key used by related tables; supply only if auto-increment is disabled.
- `submission_type` — distinguishes `fund_application` vs `publication_reward`.
- `user_id` — owner who created the submission.
- `year_id` — academic/budget year of the submission.

## Fund application details (when `submission_type = fund_application`)
- `subcategory_id` — required fund subcategory reference.

## Publication reward details (when `submission_type = publication_reward`)
- `journal_name` — journal or venue of the publication.
- `paper_title` — title of the publication.
- `publication_date` — date the work was published.

## Submission documents (attachments)
- `file_id` — uploaded file reference.
- `document_type_id` — required document-type reference.
- `submission_id` — links the document to its submission (if auto-increment is disabled).

## Submission users (additional participants)
- `submission_id` — links the participant to its submission (if auto-increment is disabled).
- `user_id` — the participant’s user record.

*Notes*
- Primary-key columns (such as `submission_id`, `document_id`, and `id` on `submission_users`) auto-increment in the database; provide them only if your import process disables auto-increment.
- All referenced IDs must already exist in their respective tables to avoid foreign-key errors.
