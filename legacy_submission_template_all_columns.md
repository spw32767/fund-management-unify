# Legacy Submission Template – Full Column List

## Submission core (all types)
- submission_id
- submission_type
- submission_number
- user_id
- year_id
- category_id
- subcategory_id
- subcategory_budget_id
- status_id
- submitted_at
- installment_number_at_submit

## Fund application details (`fund_application_details`)
- detail_id
- submission_id
- subcategory_id
- project_title
- project_description
- requested_amount
- approved_amount
- closed_at
- announce_reference_number
- main_annoucement
- activity_support_announcement
- author_name_list

## Publication reward details (`publication_reward_details`)
- detail_id
- submission_id
- paper_title
- journal_name
- publication_date
- publication_type
- quartile
- impact_factor
- doi
- url
- page_numbers
- volume_issue
- indexing
- reward_amount
- reward_approve_amount
- revision_fee
- revision_fee_approve_amount
- publication_fee
- publication_fee_approve_amount
- external_funding_amount
- total_amount
- total_approve_amount
- announce_reference_number
- author_count
- author_type
- has_university_funding
- funding_references
- university_rankings
- approved_amount
- main_annoucement
- reward_announcement
- author_name_list
- signature

## Publication reward external funds (`publication_reward_external_funds`)
- external_fund_id
- detail_id
- submission_id
- fund_name (external fund name)
- amount
- document_id
- file_id

## Additional participants (`submission_users`)
- id
- submission_id
- user_id
- role
- is_primary
- display_order

## Documents (`submission_documents`)
- document_id
- submission_id
- file_id
- original_name
- document_type_id
- description
- display_order
- is_required
- is_verified
- verified_by
- verified_at
- created_at
