# Legacy submission template examples

These examples show how to populate the fund-application and publication-reward templates using the column lists already provided. Replace the sample IDs with real ones from your database.

## Fund application example

| submission_type | user_id | year_id | status_id | category_id | subcategory_id | submitted_at       | project_title                         | project_description                 | requested_amount | approved_amount | subcategory_budget_id | announce_reference_number | main_annoucement | activity_support_announcement | author_name_list | file_id | original_name       | document_type_id | description            | display_order | is_required | is_verified | verified_by | verified_at         | additional_user_id | additional_user_role | additional_user_is_primary | additional_user_display_order |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| fund_application | 123 | 2024 | 1 | 10 | 45 | 2024-04-02 09:30:00 | AI-driven crop monitoring | Pilot sensors for yield tracking | 250000 | 200000 | 7 | ANN-2024-001 | Main round | Activity support 2024 | Dr. A; Dr. B | 8801 | proposal.pdf | 3 | Proposal document | 1 | TRUE | TRUE | 456 | 2024-04-05 10:00:00 | 789 | Co-Investigator | FALSE | 2 |

Notes:
- `submission_type` must be `fund_application`.
- `subcategory_id` links the submission to the fund program; ensure it exists.
- Document columns (`file_id`, `document_type_id`, etc.) are included only when attaching files; omit the row if no document.
- Additional participant columns are optional; include one row per extra participant.

## Publication reward example

Main submission and detail row:

| submission_type | user_id | year_id | status_id | category_id | subcategory_id | submitted_at       | paper_title                                        | journal_name        | publication_date | publication_type | quartile | impact_factor | doi                      | url                                   | reward_amount | reward_approve_amount | publication_fee | publication_fee_approve_amount | total_amount | total_approve_amount | announce_reference_number | author_count | author_type | has_university_funding | funding_references | main_annoucement | reward_announcement | author_name_list       | signature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| publication_reward | 234 | 2024 | 1 | 12 | 58 | 2024-05-10 14:00:00 | Sustainable battery materials from agricultural waste | Journal of Green Energy | 2024-03-15 | Article | Q1 | 5.2 | 10.1000/jge.2024.015 | https://doi.org/10.1000/jge.2024.015 | 50000 | 45000 | 10000 | 8000 | 60000 | 53000 | PR-2024-044 | 4 | First author | FALSE | | Main call | Reward 2024 wave 1 | Dr. C; Dr. D; Dr. E; Dr. F | signed-by-dr-c.pdf |

External funds for the same publication (one row per funding source):

| submission_id | detail_id | fund_name                 | amount | document_id | file_id |
| --- | --- | --- | --- | --- | --- |
| (from above submission) | (from above detail) | GreenTech Grant | 15000 | 9901 | 9901 |
| (from above submission) | (from above detail) | Industry Partner X | 20000 | 9902 | 9902 |

Attached document row (optional):

| submission_id | file_id | original_name     | document_type_id | description      | display_order | is_required | is_verified | verified_by | verified_at         |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| (from above submission) | 9903 | acceptance_letter.pdf | 5 | Acceptance proof | 1 | FALSE | TRUE | 234 | 2024-05-12 11:00:00 |

Additional participant row (optional):

| submission_id | user_id | role             | is_primary | display_order |
| --- | --- | --- | --- | --- |
| (from above submission) | 345 | Co-author | FALSE | 2 |

Notes:
- Use `publication_reward` for `submission_type` on publication rewards.
- External funds live in their own sheet/table; include `submission_id` and `detail_id` so each fund line links back to the correct publication record.
- Document and participant rows are optional but must reference existing IDs when provided.
