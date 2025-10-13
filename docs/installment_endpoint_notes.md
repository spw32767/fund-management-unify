# Fund Installment Period Endpoint Notes

This document explains what the backend code that was added for fund installment periods does and why it was introduced after the initial frontend-only change.

## Purpose of the Backend Endpoint

The new controller `GetFundInstallmentPeriods` that lives in `fund-management-api/controllers/fund_installment_periods.go` exposes a protected API route `GET /api/v1/fund-installment-periods`. When a client calls it (optionally filtering by `year_id`) the endpoint:

1. Validates the optional `year_id` query parameter to make sure only numeric values are accepted.
2. Queries the `fund_installment_periods` table (ignoring soft-deleted rows) and orders the rows by `cutoff_date` and `installment_number`.
3. Normalizes each record into a JSON payload that includes the primary key, the year, the installment number, the cutoff date (formatted as `YYYY-MM-DD`), and optional metadata fields (`name`, `status`, `remark`).
4. Returns the normalized array both as `periods` and `data` in the JSON body so existing consumers can iterate over the response without having to reshape it.

On the database layer the corresponding GORM model (`models/FundInstallmentPeriod`) mirrors the `fund_installment_periods` schema, mapping each column (including timestamps and the soft-delete marker) to a Go struct field. This allows the controller to query the table in a type-safe way without exposing the entire ORM object to the API response.

Finally, the routes file wires the controller into the authenticated route group so that only logged-in users can fetch the installment period definitions.

## Why the Backend Change Was Added Later

The first iteration only touched the frontend because I assumed the necessary installment period data was already exposed somewhere in the existing API. After reviewing the schema more closely it became clear that the frontend had no reliable way to look up installment cutoff dates for submissions. Without that data the client could not compute `installment_number_at_submit` accurately.

To avoid hard-coding installment ranges in the frontend (which would quickly drift from the authoritative values in the database), the backend endpoint was added as a follow-up. Centralizing the logic on the server ensures:

* There is a single source of truth for installment period definitions.
* Any future updates to the `fund_installment_periods` table are immediately reflected in client calculations.
* Input validation and error handling (for example an invalid `year_id`) live on the backend where they can return consistent API responses.

With the endpoint in place the frontend helper can fetch the current installment configuration on demand, filter it by the relevant year, and determine the correct installment number before submitting an application.
