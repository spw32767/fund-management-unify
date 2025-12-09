# Legacy Submission Template – Columns with Required Flags

## Submission core
- submission_id (primary key; provide only if auto-increment is disabled)
- submission_type **(required)**
- user_id **(required)**
- year (label)
- year_id **(required)**
- category_name (label)
- category_id (optional unless your import expects IDs)
- subcategory_name (label)
- subcategory_id **(required for fund applications)**
- subcategory_budget (label)
- subcategory_budget_id **(required for fund applications)**
- status_id **(required)**
- submitted_at (optional timestamp)
- installment_number_at_submit (optional)
- project_title (optional)
- project_description (optional)
- requested_amount (optional)
- announce_reference_number (optional)
- main_announcement (optional)
- activity_support_announcement (optional)

## Publication reward details
- paper_title **(required for publication rewards)**
- journal_name **(required for publication rewards)**
- publication_date **(required for publication rewards)**
- publication_type (optional)
- quartile (optional)
- impact_factor (optional)
- doi (optional)
- url (optional)
- author_count (optional)
- author_type (optional)
- author_name_list (optional)
- reward_amount (optional)
- reward_approve_amount (optional)
- revision_fee (optional)
- revision_fee_approve_amount (optional)
- publication_fee (optional)
- publication_fee_approve_amount (optional)

## Fund and external support details
- external_funding_amount (optional)
- total_amount (optional)
- total_approve_amount (optional)
- external_fund_name (optional)
- external_fund_amount (optional)
- external_fund_document_id (optional)
- external_fund_file_id (optional)

## Additional participants (submission_users)
- additional_user_id (optional extra participant)
- additional_user_role (optional)
- additional_user_is_primary (optional)
- additional_user_display_order (optional)

## Documents
- document_id (primary key; provide only if auto-increment is disabled)
- document_file_id **(required when attaching documents)**
- document_original_name (optional)
- document_type_id **(required when attaching documents)**
- document_description (optional)
- document_display_order (optional)
- document_is_required (optional)
- document_is_verified (optional)
- document_verified_by (optional)
- document_verified_at (optional)
