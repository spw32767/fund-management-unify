export const DEPT_STATUS_LABELS = {
  pending: 'อยู่ระหว่างการพิจารณาจากหัวหน้าสาขา',
  forwarded: 'อยู่ระหว่างการพิจารณา',
  rejected: 'ไม่เห็นควรพิจารณา',
  recommended: 'เห็นควรพิจารณาจากหัวหน้าสาขา',
};

export function getDeptStatusLabels() {
  return { ...DEPT_STATUS_LABELS };
}

export default DEPT_STATUS_LABELS;