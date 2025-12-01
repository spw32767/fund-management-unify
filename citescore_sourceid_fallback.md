# Fix CiteScore Fetch: Use Source-ID When ISSN Missing

## Problem
Right now the code uses ISSN to call the Scopus Serial Title API:
```
GET /content/serial/title/issn/{ISSN}?view=CITESCORE
```
But some journals don’t have ISSN, which causes the API call to fail or be skipped.

## Fix Required
Update the code to support `source-id` as the primary identifier.

## Expected Behavior
When fetching CiteScore metrics:
1. If `source_id` is available → use:
   ```
   GET /content/serial/title/sourceId/{SOURCE_ID}?view=CITESCORE
   ```
2. If `source_id` is not available (rare), fall back to `issn`:
   ```
   GET /content/serial/title/issn/{ISSN}?view=CITESCORE
   ```
3. If both are missing → skip and log that it was not possible to fetch.

Make sure the logic avoids calling the API with an empty string.

## Where to Apply
Update the CiteScore fetching logic or helper function (e.g. `ensure_journal_metrics(...)`) to:
- Always prefer `source_id`
- Still support `issn` fallback for older data

## Other Notes
- The API response structure stays the same, regardless of whether ISSN or source-id is used.
- If you have unit tests or logs, verify both types of lookups work.

