# Legacy Submission Templates by Type

## Fund application template columns
| Column | Required? |
| --- | --- |
| submission_type | Yes (use `fund_application`) |
| user_id | Yes |
| year_id | Yes |
| status_id | Yes |
| category_id | Optional |
| subcategory_id | Yes (maps to the fund) |
| subcategory_budget_id | Optional |
| submitted_at | Optional |
| installment_number_at_submit | Optional |
| project_title | Optional |
| project_description | Optional |
| requested_amount | Optional |
| approved_amount | Optional |
| closed_at | Optional |
| announce_reference_number | Optional |
| main_annoucement | Optional |
| activity_support_announcement | Optional |
| author_name_list | Optional |
| file_id | Required if attaching documents |
| original_name | Optional |
| document_type_id | Required if attaching documents |
| description | Optional |
| display_order | Optional |
| is_required | Optional |
| is_verified | Optional |
| verified_by | Optional |
| verified_at | Optional |
| additional_user_id | Optional (if adding extra participants) |
| additional_user_role | Optional |
| additional_user_is_primary | Optional |
| additional_user_display_order | Optional |

## Publication reward template columns

Include external funding lines only when the reward has associated outside support; link each line back to the main `publication_reward_details` record via `submission_id` and `detail_id`.
| Column | Required? |
| --- | --- |
| submission_type | Yes (use `publication_reward`) |
| user_id | Yes |
| year_id | Yes |
| status_id | Yes |
| category_id | Optional |
| subcategory_id | Optional |
| submitted_at | Optional |
| paper_title | Yes |
| journal_name | Yes |
| publication_date | Yes |
| publication_type | Optional |
| quartile | Optional |
| impact_factor | Optional |
| doi | Optional |
| url | Optional |
| page_numbers | Optional |
| volume_issue | Optional |
| indexing | Optional |
| reward_amount | Optional |
| reward_approve_amount | Optional |
| revision_fee | Optional |
| revision_fee_approve_amount | Optional |
| publication_fee | Optional |
| publication_fee_approve_amount | Optional |
| external_funding_amount | Optional |
| total_amount | Optional |
| total_approve_amount | Optional |
| announce_reference_number | Optional |
| author_count | Optional |
| author_type | Optional |
| has_university_funding | Optional |
| funding_references | Optional |
| university_rankings | Optional |
| approved_amount | Optional |
| main_annoucement | Optional |
| reward_announcement | Optional |
| author_name_list | Optional |
| signature | Optional |
| submission_id (for each external fund row) | Required when importing external funds |
| detail_id (for each external fund row) | Required when importing external funds |
| fund_name (for each external fund row) | Optional |
| amount (for each external fund row) | Optional |
| document_id (for each external fund row) | Optional |
| file_id (for each external fund row) | Optional |
| file_id | Required if attaching documents |
| original_name | Optional |
| document_type_id | Required if attaching documents |
| description | Optional |
| display_order | Optional |
| is_required | Optional |
| is_verified | Optional |
| verified_by | Optional |
| verified_at | Optional |
| additional_user_id | Optional (if adding extra participants) |
| additional_user_role | Optional |
| additional_user_is_primary | Optional |
| additional_user_display_order | Optional |
