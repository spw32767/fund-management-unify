# CiteScore Metrics Refresh Endpoint (Manual API)

## Goal
Add a **new API endpoint** that refreshes CiteScore metrics for journals that are **already present** in `scopus_source_metrics`, focusing on rows with `cite_score_status = 'In-Progress'` or very recent metric years. This endpoint is **manual-only** (called by admin when needed); no cron/auto scheduler for now.

Do **not** change the existing backfill endpoint/logic, which is only for journals that have **no metrics at all**.

---
## Current Situation (for context)
- `scopus_source_metrics` stores journal-level CiteScore metrics per year.
- Backfill logic currently:
  - finds distinct `(source_id, issn)` from `scopus_documents` that **do not** have any row in `scopus_source_metrics`.
  - calls a service method (e.g. `EnsureJournalMetrics`) which uses the Serial Title API and upserts rows into `scopus_source_metrics`.
- Once a `source_id` has at least one row, backfill will never touch it again.
- Some rows have `cite_score_status = 'In-Progress'`, which should eventually become `Complete` when Elsevier finalises the metrics.

We want a way to **manually trigger a refresh** for those journals so the DB stays up to date.

---
## What to Implement

### 1. Add a service method to select refresh targets
In the CiteScore / Scopus metrics service layer (same place as backfill code), add a new method that:

1. Queries `scopus_source_metrics` to find journals that should be refreshed.
2. Returns a list of `(source_id, issn)` pairs.

Selection rules (manual refresh):
- Include rows where `cite_score_status = 'In-Progress'`.
- Also include rows where:
  - `metric_year` is the **current year** (or current year minus 1, if that matches how CiteScore years behave), **and**
  - `last_fetched_at` is older than some threshold (e.g. 30 days).

Example SQL logic (pseudo):
```sql
SELECT DISTINCT source_id, issn
FROM scopus_source_metrics
WHERE cite_score_status = 'In-Progress'
   OR (metric_year >= YEAR(CURDATE()) - 1
       AND last_fetched_at < DATE_SUB(NOW(), INTERVAL 30 DAY))
```

Codex should adapt this to the existing GORM query style and config.

### 2. Reuse existing `EnsureJournalMetrics` for refresh
For each `(source_id, issn)` target:

- Call the existing metrics fetch/upsert method (e.g. `EnsureJournalMetrics(ctx, issn, sourceID, 0)`), which already:
  - calls the Serial Title API using `source-id` or ISSN
  - parses `citeScoreYearInfoList`, SJR, SNIP, etc.
  - upserts into `scopus_source_metrics` keyed by `(source_id, metric_year, doc_type)`
  - updates `last_fetched_at`.

Do **not** duplicate parsing or insert logic; just reuse the existing code.

### 3. New API endpoint (manual trigger)
Add a new **admin-only** endpoint to the backend API, something like:

- Method: `POST`
- Path: similar to existing backfill route, e.g. `/admin/scopus/metrics/refresh` or `/admin/scopus/citescore/refresh`

The handler should:

1. Authorise as admin (follow the same pattern as your existing admin/backfill endpoints).
2. Call the new service method to get the refresh target list.
3. Loop over targets and call `EnsureJournalMetrics` for each.
4. Collect a summary result:
   - `sources_scanned` (number of distinct journals considered)
   - `sources_refreshed` (journals where `EnsureJournalMetrics` actually updated or inserted rows)
   - `skipped` (if you choose to skip some)
   - `errors` (number of journals that failed to refresh)
5. Return a JSON response with this summary and a `success` flag.

Example response shape:
```json
{
  "success": true,
  "summary": {
    "sources_scanned": 5,
    "sources_refreshed": 3,
    "errors": 0
  }
}
```

You do **not** have to detect row-by-row changes; it is fine to count a journal as "refreshed" if `EnsureJournalMetrics` runs without error.

### 4. Keep backfill logic unchanged
Make sure the existing **backfill** endpoint/method continues to behave as before:

- It should only target journals that have **no rows at all** in `scopus_source_metrics`.
- It should not be affected by the new refresh selection logic.

The new refresh endpoint is **separate** and only works on journals that already exist in the metrics table.

### 5. Logging and safety
- Log at least `source_id` and `issn` when refreshing, plus any errors from the API.
- If the Serial Title API returns no `entry` for a journal, treat it as a non-fatal warning and continue with the next journal.
- Don’t panic/abort the whole refresh if one source fails.

---
## Summary for Codex

1. In the Scopus/CiteScore metrics service:
   - Add a query to find journals in `scopus_source_metrics` that have `cite_score_status = 'In-Progress'` or recent `metric_year` with stale `last_fetched_at`.
   - For each of those, call the existing metrics fetch/upsert function.

2. Add a new admin-only API endpoint (POST) that calls this service method and returns a JSON summary.

3. Do **not** modify the existing backfill metrics endpoint or logic.

4. Keep using the existing URL construction (source-id as query param, ISSN path) and parsing logic.

This endpoint is only for **manual refresh**; no cron or scheduled job setup is needed for now.

