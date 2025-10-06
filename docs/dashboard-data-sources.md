# Dashboard Data Sources

This note explains where the admin dashboard cards "แนวโน้มการยื่นคำร้อง" (Application Trends) and "สรุปการใช้งบประมาณ" (Budget Status) obtain their figures, along with example API payloads that will produce non-zero values.

## API Endpoint

Both cards are driven by the `/admin/dashboard/stats` endpoint that is exposed from the Go backend via `GetDashboardStats`. The handler inspects the authenticated role and, for administrators, delegates to `getAdminDashboard()` before returning the data payload under the `stats` property.

```text
GET /api/v1/admin/dashboard/stats
Authorization: Bearer <admin JWT>
```

## แนวโน้มการยื่นคำร้อง (Application Trends)

* **Frontend usage** – The admin dashboard calls `adminAPI.getSystemStats()`, extracts the `monthly_trends` array, keeps the six most recent rows, and renders them via the `<MonthlyChart>` component. Each item is normalized to `{ month, applications, approved }` before display.【F:frontend_project_fund/app/admin/components/dashboard/DashboardContent.js†L259-L303】【F:frontend_project_fund/app/admin/components/dashboard/MonthlyChart.js†L5-L61】
* **Backend source** – `getAdminDashboard()` invokes `getSystemMonthlyTrends(12)`, which loops over the last 12 calendar months and counts total, approved, and rejected fund applications from the `fund_applications` table (excluding soft-deleted rows).【F:fund-management-api/controllers/dashboard.go†L226-L282】【F:fund-management-api/controllers/dashboard.go†L308-L329】

If the database has no submissions in the past twelve months, every metric will be zero. Inserting sample rows that cover a variety of `application_status_id` values will immediately show up after refreshing the dashboard. Example response fragment:

```json
{
  "stats": {
    "monthly_trends": [
      { "month": "2024-01", "total_applications": 12, "approved": 7, "rejected": 3, "total_requested": 185000, "total_approved": 126000 },
      { "month": "2024-02", "total_applications": 9,  "approved": 5, "rejected": 2, "total_requested": 142500, "total_approved": 98000 },
      { "month": "2024-03", "total_applications": 15, "approved": 10, "rejected": 1, "total_requested": 210000, "total_approved": 175000 }
    ]
  }
}
```

## สรุปการใช้งบประมาณ (Budget Status)

* **Frontend usage** – The same `stats.overview` object is reformatted into `{ total, thisYear, remaining }` before being passed to `<BudgetSummary>`, which renders both the figure list and progress bar. The component expects `total_budget` and `used_budget` numbers from the API and derives the remaining amount client-side.【F:frontend_project_fund/app/admin/components/dashboard/DashboardContent.js†L304-L320】【F:frontend_project_fund/app/admin/components/dashboard/BudgetSummary.js†L1-L87】
* **Backend source** – `getAdminDashboard()` populates the `overview` struct by querying:
  * `fund_applications` for the total number of submissions, pending count, and approved spending.
  * `users` for total accounts.
  * `years` for the current year's allocated budget (`budget` column).
  * `fund_applications` joined with `years` to sum `approved_amount` for the current year (`application_status_id = 2`).【F:fund-management-api/controllers/dashboard.go†L232-L258】

If the current calendar year is missing in the `years` table or the corresponding `budget` field is `NULL`, `total_budget` will be zero. Likewise, `used_budget` remains zero until there are approved applications for the year. Example payload:

```json
{
  "stats": {
    "overview": {
      "total_applications": 128,
      "total_users": 54,
      "total_budget": 5000000,
      "used_budget": 1725000,
      "pending_count": 11
    }
  }
}
```

## Troubleshooting Checklist

1. Ensure the authenticated account has the admin role so the backend returns the admin-specific dataset.
2. Verify the database contains non-deleted `fund_applications` records with recent `submitted_at` timestamps.
3. Confirm the current year exists in the `years` table with a non-zero `budget` and that approved applications (`application_status_id = 2`) hold `approved_amount` values.
4. Refresh the dashboard UI ("รีเฟรช" button) after seeding data to pull the latest statistics.
