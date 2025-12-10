-- View to expose patent-related submissions as innovations per user
CREATE OR REPLACE VIEW user_innovations_view AS
SELECT
    s.submission_id,
    s.user_id,
    s.submission_number,
    COALESCE(NULLIF(fad.project_title, ''), fs.subcategory_name, s.submission_type) AS title,
    COALESCE(fs.subcategory_name, s.submission_type) AS innovation_type,
    s.submitted_at AS registered_date,
    COALESCE(st.status_name, '') AS status_name,
    y.year AS year_name
FROM submissions s
LEFT JOIN fund_application_details fad ON fad.submission_id = s.submission_id
LEFT JOIN fund_subcategories fs ON fs.subcategory_id = s.subcategory_id
LEFT JOIN years y ON y.year_id = s.year_id
LEFT JOIN application_status st ON st.application_status_id = s.status_id
WHERE s.deleted_at IS NULL
  AND s.status_id = 2
  AND (fs.subcategory_name LIKE '%สิทธิบัตร%' OR fs.subcategory_name LIKE '%อนุสิทธิบัตร%');
