# Submission attachment ordering and filenames

## What was wrong
Before commit `201219d`, every controller that fetched submission attachments only sorted by the numeric `display_order` that is stored on each `submission_documents` row. That value is derived from the document *type* metadata and is not guaranteed to be unique once a submission has been edited. As soon as an applicant replaces a required form or adds optional evidence, multiple rows can share the same `display_order`. Because the query stopped ordering after that column, MySQL was free to return the ties in any order. In practice the results were grouped by the row's auto-increment id, which explains why the UI showed documents from an older submission (e.g. `PR-2568-0041`) before the current files (`PR-2568-0046`).

At the same time, when we moved temp uploads into the permanent submission folder we only updated `stored_path`. The `original_name` column kept the temp file name (`form_sample.pdf` in the example) so the UI continued to display the stale identifier even though the file was now saved under `PR-2568-0046`.

## Why the new query works
Each query now joins `document_types` and orders by:

1. `submission_documents.display_order` – keeps the existing high level grouping.
2. `COALESCE(dt.document_order, 9999)` – falls back to the document type's display priority so ties in step 1 stay in the same logical order across the admin, member, and preview screens.
3. `submission_documents.created_at` and `submission_documents.document_id` – provides a deterministic order for rows that were created at the same time (e.g. bulk uploads) so MySQL can no longer shuffle rows arbitrarily.

Because we also persist the regenerated filename (`original_name`) and enforce the `submission` folder type during the move, the table now shows the correct PR code beside each file. For the example above the regenerated record now renders as `PR-2568-0046_form_sample.pdf` right next to the other 0046 entries.

## Impact on existing submissions
The fix is purely read-time ordering and metadata cleanup. Existing rows keep their current IDs and file contents; we only update the name and folder type *when* a file is moved from temp into the submission folder. That already happens any time an applicant submits or replaces a document, so:

* Existing submissions immediately benefit from the corrected ordering because the queries now return the rows in a deterministic sequence without touching stored data.
* Any new upload or regeneration will store the correct folder type and file name going forward. Previously moved files keep their old `original_name`, but the order on screen is now correct for both past and future submissions.
