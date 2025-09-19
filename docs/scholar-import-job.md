# Weekly "Import All Google Scholar" Job Guide

## 1. Architecture Choices

### A. Run Inside the Go API Process
- **Pros:** No extra deployable; reuse the existing Gin configuration, DB pool, and logging in the API binary.
- **Cons:** Long-running Scholar scrapes compete with request handlers for CPU/RAM, and a panic or memory leak in the import code can crash the public API. Rolling deployments interrupt the scheduler and require leader-election for multiple replicas.

### B. Dedicated Worker Process (Go or Python)
- **Go worker:** Shares models/services with the API, keeps type safety, and can reuse the existing GORM helpers. Requires building/deploying an extra binary but isolates crashes and resource spikes from the HTTP server.
- **Python worker:** Reuses the `scholarly` scripts directly with minimal new code. Needs a managed virtualenv and packaging of Python dependencies but enjoys the same isolation benefits.

**Why isolate?** A separate worker (of either language) keeps import logs focused, lets you tune CPU/memory independently, and prevents a failed scrape from impacting API uptime. You can continue to reuse the shared `ScholarImportJobService` logic from both the worker and the admin UI.

## 2. Scheduling Options

| Option | Notes |
| --- | --- |
| **systemd timer (recommended)** | Create `scholar-import.service` + `scholar-import.timer` on Ubuntu. Provides `systemctl status`, journald logs, missed-run catch-up (`Persistent=true`), and easy enable/disable. |
| **cron** | Simpler but less observable. Add an entry that runs the worker weekly; capture stdout/stderr to a log file for diagnostics. |
| **In-process Go scheduler** | Use packages like `robfig/cron` only if the job lives inside the API. Requires leader election so only one replica triggers it and restarts can miss runs. |
| **Docker cron sidecar** | For containerized deployments, run cron in a companion container that invokes the worker binary or hits the admin endpoint. |
| **External scheduler + webhook** | Cloud schedulers (EventBridge, Cloud Scheduler, GitHub Actions) POST to a protected admin endpoint. Requires hardened authentication and Internet exposure. |

## 3. Reliability Considerations

- **Single-instance safety:** Use a database advisory lock (`SELECT GET_LOCK('scholar_import_job', 0)` in MySQL) so concurrent workers exit early with "already running" instead of double-importing. Works for manual triggers, timers, and future multi-host deployments.
- **Idempotency & de-duplication:** Upsert publications using unique identifiers (Scholar cluster ID, DOI) so reruns only update existing rows. Record `user_scholar_metrics` via upsert as well.
- **Retries & backoff:** Wrap Python `scholarly` calls in retry/backoff logic. If Scholar throttles you, sleep between authors. Log per-user failures but keep the batch running.
- **Rate limiting:** Process authors sequentially and insert a configurable delay to avoid captchas or bans.

## 4. Security & Configuration

- Keep secrets (DB DSN, Scholar script paths, rate limits) in environment files. The worker can reuse the API's `.env`/EnvironmentFile.
- Limit DB credentials to the tables needed for publications, metrics, and run logs.
- Expose CLI flags/environment variables for `--dry-run`, `--user-ids`, `--limit`, `--trigger`, and `--lock-name` to let operators scope runs.
- If using a webhook scheduler, sign requests (HMAC or mTLS) and restrict access to admins.

## 5. Observability

- Emit structured logs with run IDs, counts, durations, and errors. Journald/systemd captures the CLI output by default.
- Maintain a `scholar_import_runs` table storing trigger source, status, start/end timestamps, counts, and error messages so the admin UI can display the latest run.
- Add metrics (success/failure counters, run duration) to your monitoring stack and configure alerts (email/Slack) for failed runs or zero publications fetched.

## 6. Data Integrity

- Wrap per-user imports in transactions when writing publications to avoid partial updates.
- Upsert publications atomically via `PublicationService.Upsert` to handle create vs update logic safely.
- Log partial failures and continue processing remaining users; reruns can focus on specific authors via CLI filters.
- Persist run history for auditability and investigations.

## 7. Operations & Runbook

1. **Dry run / smoke test**
   ```bash
   ./scholar-import --dry-run --limit=1 --trigger=smoke-test
   ```
   Confirms DB access, advisory locking, and Python script execution without writing data.

2. **Full manual execution**
   ```bash
   ./scholar-import --trigger=manual-run
   ```
   Processes all Scholar-enabled users, records a run summary, and exits non-zero if any failures occurred.

3. **Install systemd units (recommended)**
   - `scholar-import.service`: runs the CLI with the shared EnvironmentFile.
   - `scholar-import.timer`: schedules weekly execution (e.g., `OnCalendar=Sun *-*-* 02:00:00`, `Persistent=true`).
   - Enable with:
     ```bash
     sudo systemctl daemon-reload
     sudo systemctl enable --now scholar-import.timer
     sudo systemctl list-timers scholar-import.timer
     ```

4. **Monitoring**
   - `journalctl -u scholar-import.service` for logs.
   - `systemctl status scholar-import.service` for exit codes.
   - Query `scholar_import_runs` for latest run data and surface it in the admin UI.

5. **Manual reruns / scoped imports**
   - Use `--user-ids=<csv>` or `--limit=<n>` to target subsets.
   - Admin buttons continue to call the same job service.

## Recommended Approach

- **Architecture:** Deploy a dedicated worker (Go or Python) that reuses the existing Scholar import service logic, separate from the Gin API for isolation.
- **Scheduler:** Use a systemd timer on Ubuntu to launch the worker weekly, leveraging advisory locks to prevent overlap.
- **Reliability & Observability:** Maintain the `scholar_import_runs` table, emit structured logs, and configure alerts for failures or zero-fetch runs.

## Implementation Checklist

1. **Build the worker binary**
   ```bash
   cd /root/fundproject/fund-management-api
   go build -o scholar-import ./cmd/scholar-import
   ```
2. **Ensure schema support** by applying the `scholar_import_runs` table definition from `fund_cpkku_v36_only_structure.sql`.
3. **Dry-run locally**
   ```bash
   ./scholar-import --dry-run --limit=1 --trigger=smoke-test
   ```
4. **Execute a real run**
   ```bash
   ./scholar-import --trigger=manual-run
   ```
   Verify a new row in `scholar_import_runs` and check CLI exit status.
5. **Install systemd units**
   - Create `/etc/systemd/system/scholar-import.service` pointing to the binary and shared env file.
   - Create `/etc/systemd/system/scholar-import.timer` with your preferred `OnCalendar` schedule.
6. **Activate scheduling**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now scholar-import.timer
   ```
7. **Runbook & Monitoring**
   - Document status commands (`systemctl status`, `journalctl`).
   - Surface latest run info in the admin UI via `scholar_import_runs`.
   - Set up alerts for failed runs or zero publications fetched.

