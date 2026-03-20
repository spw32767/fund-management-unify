# Legacy Submission Template – Columns with Required Flags

## Submission core (all types)
- submission_id (primary key; only if auto-increment is disabled)
- submission_type **(required)**
- submission_number (optional)
- user_id **(required)**
- year_id **(required)**
- category_id (optional)
- subcategory_id **(required for fund applications; optional for publication rewards)**
- subcategory_budget_id (optional)
- status_id **(required)**
- submitted_at (optional)
- installment_number_at_submit (optional)

## Fund application details (`fund_application_details`)
- detail_id (primary key; only if auto-increment is disabled)
- submission_id (link to submission; required if not auto-generated)
- subcategory_id **(required)**
- project_title (optional)
- project_description (optional)
- requested_amount (optional)
- approved_amount (optional)
- closed_at (optional)
- announce_reference_number (optional)
- main_annoucement (optional)
- activity_support_announcement (optional)
- author_name_list (optional)

## Publication reward details (`publication_reward_details`)
- detail_id (primary key; only if auto-increment is disabled)
- submission_id (link to submission; required if not auto-generated)
- paper_title **(required)**
- journal_name **(required)**
- publication_date **(required)**
- publication_type (optional)
- quartile (optional)
- impact_factor (optional)
- doi (optional)
- url (optional)
- page_numbers (optional)
- volume_issue (optional)
- indexing (optional)
- reward_amount (optional)
- reward_approve_amount (optional)
- revision_fee (optional)
- revision_fee_approve_amount (optional)
- publication_fee (optional)
- publication_fee_approve_amount (optional)
- external_funding_amount (optional)
- total_amount (optional)
- total_approve_amount (optional)
- announce_reference_number (optional)
- author_count (optional)
- author_type (optional)
- has_university_funding (optional)
- funding_references (optional)
- university_rankings (optional)
- approved_amount (optional)
- main_annoucement (optional)
- reward_announcement (optional)
- author_name_list (optional)
- signature (optional)

## Publication reward external funds (`publication_reward_external_funds`)
- external_fund_id (primary key; only if auto-increment is disabled)
- detail_id **(required)**
- submission_id **(required)**
- fund_name (external fund name; optional)
- amount (optional)
- document_id (optional)
- file_id (optional)

## Additional participants (`submission_users`)
- id (primary key; only if auto-increment is disabled)
- submission_id **(required)**
- user_id **(required)**
- role (optional; defaults to `coauthor`)
- is_primary (optional)
- display_order (optional)

## Documents (`submission_documents`)
- document_id (primary key; only if auto-increment is disabled)
- submission_id **(required)**
- file_id **(required)**
- original_name (optional)
- document_type_id **(required)**
- description (optional)
- display_order (optional)
- is_required (optional)
- is_verified (optional)
- verified_by (optional)
- verified_at (optional)
- created_at (optional; normally auto-set)
