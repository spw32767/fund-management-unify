# Automatic CiteScore Metrics Import for New Scopus Documents

## Overview
This enhancement makes sure the system fetches and stores **CiteScore journal metrics** whenever a new Scopus document is imported. That way, whenever a journal appears in a document, we will have its CiteScore, percentile, quartile, SJR, SNIP, etc., cached in the `scopus_source_metrics` table.

## What to do

### 1. Detect new Scopus document insert
During the Scopus document import (e.g. in the part of the code that writes to `scopus_documents`), detect when a new document is added.

### 2. Get its journal info
From the new document:
- `issn` (preferred) or `source_id`
- `publication_year`

### 3. Check if metrics already exist
Before calling the API:
```sql
SELECT 1 FROM scopus_source_metrics
WHERE source_id = ? AND metric_year = ?
```
If rows exist, **skip the API call**.

### 4. If not exist, call API
Use Elsevier Serial Title API:
```
GET https://api.elsevier.com/content/serial/title/issn/{ISSN}?view=CITESCORE&apiKey=...
```

Use the ISSN from the document. You’ll get back journal info and up to 4 years of CiteScore data.

### 5. Extract from JSON
From the API response, extract per-year metrics:
- `citeScoreYearInfo.year`
- `citeScore`
- `percentile`
- `quartile`
- `scholarlyOutput`, `citationCount`, `percentCited` (optional)
- `SJR` and `SNIP` (from `SJRList` and `SNIPList`, by year)

You can use the best subject percentile/quartile if multiple are provided.

### 6. Insert into `scopus_source_metrics`
For each year, insert:
```sql
INSERT INTO scopus_source_metrics
(source_id, issn, eissn, metric_year, cite_score, percentile, quartile, sjr, snip, last_fetched_at)
VALUES (...)
```
Use `ON DUPLICATE KEY UPDATE` or check for existence before inserting.

### 7. Structure it as reusable function
Create a helper:
```python
def ensure_journal_metrics(issn: str, source_id: str):
    # checks, fetch, insert logic
```
This lets you reuse it in:
- Scopus document import script
- Batch update job (e.g. yearly refresh)

### 8. Call once per journal
During import:
```python
for doc in new_documents:
    if doc.is_new:
        seen.add((doc.issn, doc.source_id))
for issn, source_id in seen:
    ensure_journal_metrics(issn, source_id)
```
Avoid calling multiple times for the same journal.

## Notes
- Only fetch metrics for journals not already in `scopus_source_metrics`.
- Always set `last_fetched_at = NOW()`
- If needed, parse multiple subject areas and pick best percentile.
- Use the API response structure already provided in `cite_score_example_response.json`.
- Database schema is already in place (from `fund_cpkku_v61.sql`).

