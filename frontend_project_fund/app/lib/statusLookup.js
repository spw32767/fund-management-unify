// app/lib/statusLookup.js - Helpers for resolving application status IDs dynamically
import apiClient from './api';

let statusesPromise = null;

const normalizeRecord = (record) => {
  if (!record || typeof record !== 'object') return null;
  const id =
    record.application_status_id ??
    record.status_id ??
    record.id ??
    null;
  if (id == null) return null;
  const name = record.status_name || record.name || '';
  return {
    id: Number(id),
    name,
    raw: record,
  };
};

export const resetStatusesCache = () => {
  statusesPromise = null;
};

export const fetchApplicationStatuses = async (force = false) => {
  if (!force && statusesPromise) {
    return statusesPromise;
  }

  statusesPromise = apiClient
    .get('/application-status')
    .then((response) => {
      const list =
        response?.statuses ||
        response?.data?.statuses ||
        response?.data ||
        [];
      if (!Array.isArray(list) || list.length === 0) {
        throw new Error('ไม่พบข้อมูลสถานะจากระบบ');
      }
      return list.map(normalizeRecord).filter(Boolean);
    })
    .catch((error) => {
      statusesPromise = null;
      throw error;
    });

  return statusesPromise;
};

const matchStatusByLabel = (statuses, label) => {
  if (!Array.isArray(statuses)) return null;
  const matches = statuses.filter(
    (status) =>
      typeof status?.name === 'string' &&
      status.name.includes(label)
  );

  if (matches.length === 0) {
    throw new Error(`ไม่พบสถานะที่มีคำว่า “${label}”`);
  }
  if (matches.length > 1) {
    throw new Error(`พบสถานะหลายรายการที่มีคำว่า “${label}”`);
  }

  return matches[0];
};

export const findStatusRecordByLabel = async (label) => {
  if (!label) {
    throw new Error('ต้องระบุคำค้นหาสถานะ');
  }
  const statuses = await fetchApplicationStatuses();
  return matchStatusByLabel(statuses, label);
};

export const findStatusIdByLabel = async (label) => {
  const record = await findStatusRecordByLabel(label);
  if (!record?.id) {
    throw new Error(`ไม่สามารถระบุรหัสสถานะของ “${label}” ได้`);
  }
  return record.id;
};

export const requireStatusIds = async (labels) => {
  if (!Array.isArray(labels) || labels.length === 0) {
    throw new Error('ต้องระบุรายชื่อสถานะอย่างน้อยหนึ่งรายการ');
  }

  const statuses = await fetchApplicationStatuses();
  const result = {};

  labels.forEach((label) => {
    const record = matchStatusByLabel(statuses, label);
    result[label] = record;
  });

  return result;
};

export default {
  fetchApplicationStatuses,
  findStatusIdByLabel,
  findStatusRecordByLabel,
  requireStatusIds,
  resetStatusesCache,
};
