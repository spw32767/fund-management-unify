export const DEPT_STATUS_LABELS = {
  pending: 'อยู่ระหว่างการพิจารณาจากหัวหน้าสาขา',
  recommended: 'เห็นควรพิจารณาจากหัวหน้าสาขา',
  rejected: 'ไม่เห็นควรพิจารณา',
};

export function getDeptStatusLabels() {
  return { ...DEPT_STATUS_LABELS };
}

export default DEPT_STATUS_LABELS;