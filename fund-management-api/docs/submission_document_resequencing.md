# Submission Document Resequencing

This document explains the behaviour that was introduced in the commit
"Add admin endpoint to resequence submission document display order" and
clarifies how it impacts the existing submission flows.

## Overview

Every `submission_documents` row has its own `display_order` column. The
API always fetches documents ordered by that column, so the value stored in
`display_order` decides the sequence that callers see. Previously the system
never realigned existing rows when the document type configuration changed,
so the persisted order could drift away from the `document_types.document_order`
preferences that administrators manage.

The new helper `resequenceSubmissionDocumentsByDocumentType` provides a
consistent way to synchronise the saved `display_order` values with the
`document_order` field on the related document types. It performs the
following steps for a submission:

1. Load all documents for the submission together with their document type
   ordering (if present).
2. Sort them in-memory so that documents whose types have an explicit order
   appear first, followed by the remaining documents that do not have a
   configured `document_order`.
3. Walk through the sorted list and assign sequential `display_order`
   numbers starting from 1, writing the value back to rows whose stored
   order differs from the expected position.

The helper only updates rows when their `display_order` does not match the
computed value. Submissions that are already sequenced correctly incur no
writes.

## When resequencing runs automatically

The controller now invokes the helper in three scenarios to keep the stored
sequence aligned without manual intervention:

- **During publication reward submission finalisation** – the resequencing
  runs before the system generates the summary files so that the template
  fills with the intended order.
- **Whenever a user attaches a document** – both the applicant and admin
  attachment endpoints call the helper after saving the new row so that the
  new file lands in the correct slot relative to the configured priorities.
- **After the service generates the publication reward PDF** – once the
  extra PDF is created and attached, the helper runs again to account for
  the new row.

These calls only affect the `display_order` column; no other submission data
is changed.

## Manual resequencing endpoint

Administrators can trigger the process on demand via the new POST endpoint:

```
POST /api/v1/admin/submissions/:id/documents/resequence
```

The handler validates that the submission exists, runs the helper, and then
returns the refreshed list of documents. This provides a safety valve for
fixing historical submissions whose order may have diverged before the
helper was introduced.

## Impact on existing flows

The helper preserves the rest of the workflow:

- Attach, detach, and submission update flows continue to work as before.
- Users still see documents sorted by the `display_order` column; the helper
  simply keeps that column aligned with administrator preferences.
- If a document type does not define `document_order`, the existing
  `display_order` is kept unless it conflicts with the sequential numbering.

In short, the change does not alter business logic apart from keeping the
stored order tidy. The helper is idempotent and safe to call repeatedly.
