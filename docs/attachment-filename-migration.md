# Attachment Filename Source Update

## Summary
We now display attachment filenames directly from `submission_documents.original_name` instead of relying on legacy file metadata fields.

## Before vs After
| Context | Old Source | Old Example | New Source | New Example |
|---------|------------|-------------|------------|-------------|
| FundApplicationDetail | `doc.File?.original_name` fallback to `doc.file_name` | `doc_9a1f23.pdf` | `submission_documents.original_name` | `บทความฉบับสมบูรณ์.pdf` |
| PublicationRewardDetail | `doc.File?.original_name` fallback chain | `doc_9a1f23.pdf` | `submission_documents.original_name` | `บทความฉบับสมบูรณ์.pdf` |
| Dept General Details | `d.file_name` via frontend normalization | `doc_9a1f23.pdf` | `submission_documents.original_name` | `บทความฉบับสมบูรณ์.pdf` |
| Dept Publication Details | `d.file_name` via frontend normalization | `doc_9a1f23.pdf` | `submission_documents.original_name` | `บทความฉบับสมบูรณ์.pdf` |
| Admin General Details | `d.file_name` via frontend normalization | `doc_9a1f23.pdf` | `submission_documents.original_name` | `บทความฉบับสมบูรณ์.pdf` |
| Admin Publication Details | `d.file_name` via frontend normalization | `doc_9a1f23.pdf` | `submission_documents.original_name` | `บทความฉบับสมบูรณ์.pdf` |

## API Contract Note
- Attachments now expose the `original_name` JSON property populated from the database column `submission_documents.original_name`.

## Migration Notes
- Backend responses for submission attachments must include `original_name` values sourced from `submission_documents.original_name`.
- Frontend attachment tables bind exclusively to the `original_name` field; no legacy fallbacks remain.
- View and download actions continue to use existing file IDs and URLs without modification.

## Testing Checklist
- Records containing Thai filenames (e.g., `บทความฉบับสมบูรณ์.pdf`) render correctly across all views.
- Legacy rows without an `original_name` value display “-”.
- View and download buttons continue to open the correct files.
- Browser console remains free of errors on all six affected pages.
