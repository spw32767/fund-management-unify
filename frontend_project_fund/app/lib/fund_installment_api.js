// app/lib/fund_installment_api.js
import apiClient from "./api";

const parseInteger = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return null;
  }

  return Math.trunc(numeric);
};

const parseDate = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const str = String(value).trim();
  if (!str) {
    return null;
  }

  // Support plain date (YYYY-MM-DD) by assuming UTC midnight
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const date = new Date(`${str}T00:00:00Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(str);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizePeriodItem = (item) => {
  if (!item || typeof item !== "object") {
    return null;
  }

  const installmentNumber = parseInteger(
    item.installment_number ?? item.installmentNumber ?? item.installment
  );

  const cutoffDateRaw =
    item.cutoff_date ??
    item.cutoffDate ??
    item.cutoff ??
    item.cutoff_at ??
    item.cutoffDateTime ??
    null;
  const cutoffDate = parseDate(cutoffDateRaw);

  if (installmentNumber == null || cutoffDate == null) {
    return null;
  }

  const statusRaw = item.status ?? item.period_status ?? item.state ?? null;
  const status =
    typeof statusRaw === "string" && statusRaw.trim()
      ? statusRaw.trim().toLowerCase()
      : null;

  const yearId = parseInteger(item.year_id ?? item.yearId ?? item.year);

  return {
    raw: item,
    installmentNumber,
    cutoffDate,
    status,
    yearId,
  };
};

const extractArray = (payload) => {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  const candidates = [
    payload.periods,
    payload.data,
    payload.items,
    payload.results,
    payload.list,
    payload.entries,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  if (payload.success && Array.isArray(payload.periods)) {
    return payload.periods;
  }

  if (payload.data && typeof payload.data === "object") {
    const nestedCandidates = [
      payload.data.periods,
      payload.data.items,
      payload.data.results,
      payload.data.list,
      payload.data.entries,
    ];
    for (const nested of nestedCandidates) {
      if (Array.isArray(nested)) {
        return nested;
      }
    }
  }

  return [];
};

const filterActivePeriods = (periods) => {
  return periods.filter((period) => {
    if (!period) return false;
    if (!period.cutoffDate || !(period.cutoffDate instanceof Date)) return false;
    if (Number.isNaN(period.cutoffDate.getTime())) return false;

    if (!period.status) return true;
    return ["active", "enabled", "open"].includes(period.status);
  });
};

const determineInstallmentNumberFromPeriods = (periods, submissionDate) => {
  if (!Array.isArray(periods) || periods.length === 0) {
    return null;
  }

  const submission = submissionDate instanceof Date ? submissionDate : new Date(submissionDate);
  if (Number.isNaN(submission.getTime())) {
    return null;
  }

  const normalized = periods
    .map((item) => normalizePeriodItem(item))
    .filter(Boolean);

  if (normalized.length === 0) {
    return null;
  }

  const filtered = filterActivePeriods(normalized);
  const candidates = filtered.length > 0 ? filtered : normalized;

  candidates.sort((a, b) => a.cutoffDate.getTime() - b.cutoffDate.getTime());

  for (const period of candidates) {
    // Allow submitting on the cutoff date (inclusive)
    if (submission.getTime() <= period.cutoffDate.getTime()) {
      return period.installmentNumber;
    }
  }

  return null;
};

export const fundInstallmentAPI = {
  async list(params = {}) {
    const response = await apiClient.get("/fund-installment-periods", params);
    const periods = extractArray(response);
    return periods.map((item) => normalizePeriodItem(item)).filter(Boolean);
  },

  async resolveInstallmentNumber({ yearId = null, submissionDate = new Date() } = {}) {
    const params = {};
    if (yearId != null) {
      params.year_id = yearId;
    }

    const response = await apiClient.get("/fund-installment-periods", params);
    const rawPeriods = extractArray(response);
    if (!Array.isArray(rawPeriods) || rawPeriods.length === 0) {
      return null;
    }

    let periods = rawPeriods.map((item) => normalizePeriodItem(item)).filter(Boolean);

    if (yearId != null) {
      const filteredByYear = periods.filter((period) => period.yearId == null || period.yearId === yearId);
      if (filteredByYear.length > 0) {
        periods = filteredByYear;
      }
    }

    return determineInstallmentNumberFromPeriods(periods, submissionDate);
  },
};

export const resolveInstallmentNumberFromPeriods = determineInstallmentNumberFromPeriods;

export default fundInstallmentAPI;