ALTER TABLE system_config
  ADD COLUMN max_submissions_per_year INT NOT NULL DEFAULT 5
  COMMENT 'จำนวนครั้งสูงสุดที่ยื่นทุนได้ต่อปี (รวม Publication + Fund Application)';

CREATE OR REPLACE VIEW v_user_yearly_submission_usage AS
SELECT
  s.user_id,
  s.year_id,
  COUNT(*) AS used_submissions
FROM submissions s
JOIN application_status st ON st.application_status_id = s.status_id
WHERE s.deleted_at IS NULL
  AND s.submission_type IN ('fund_application', 'publication_reward')
  AND st.status_code NOT IN ('2', '4')
GROUP BY s.user_id, s.year_id;
