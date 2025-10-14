// app/lib/admin_installment_api.js
import apiClient from "./api";

const parseDate = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const str = String(value).trim();
  if (!str) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const date = new Date(`${str}T00:00:00Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(str);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeStatus = (status) => {
  if (!status || typeof status !== "string") return "active";
  const normalized = status.trim().toLowerCase();
  return normalized || "active";
};

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isNaN(numeric) ? null : numeric;
};

const normalizePeriod = (item) => {
  if (!item || typeof item !== "object") return null;

  const id = toNumberOrNull(
    item.installment_period_id ?? item.installmentPeriodId ?? item.id ?? null
  );

  const yearId = toNumberOrNull(item.year_id ?? item.yearId ?? null);
  const installmentNumber = toNumberOrNull(
    item.installment_number ?? item.installmentNumber ?? null
  );
  const cutoffDate =
    item.cutoff_date ??
    item.cutoffDate ??
    item.cutoff ??
    null;

  const cutoffDateObj = parseDate(cutoffDate);

  return {
    raw: item,
    installment_period_id: id,
    year_id: yearId,
    installment_number: installmentNumber,
    cutoff_date: cutoffDate ? String(cutoffDate) : null,
    cutoffDateObj,
    name: item.name ?? null,
    status: normalizeStatus(item.status ?? item.period_status ?? item.state),
    remark: item.remark ?? null,
    created_at: item.created_at ?? item.createdAt ?? null,
    updated_at: item.updated_at ?? item.updatedAt ?? null,
    deleted_at: item.deleted_at ?? item.deletedAt ?? null,
  };
};

const extractItems = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;

  const candidates = [payload.data, payload.periods, payload.items, payload.results, payload.list];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
};

export const adminInstallmentAPI = {
  async list({ yearId, status = "all", limit = 50, offset = 0 } = {}) {
    if (!yearId) {
      throw new Error("yearId is required to list installment periods");
    }

    const params = {
      year_id: yearId,
      limit,
      offset,
    };

    if (status) {
      params.status = status;
    }

    const response = await apiClient.get("/admin/installments", params);
    const items = extractItems(response).map((item) => normalizePeriod(item)).filter(Boolean);

    const paging = response?.paging ?? {
      total: response?.total ?? items.length,
      limit,
      offset,
    };

    return {
      items,
      paging,
      raw: response,
    };
  },

  async create(payload) {
    const response = await apiClient.post("/admin/installments", payload);
    const period = normalizePeriod(response?.period ?? response?.data ?? response);
    return { raw: response, period };
  },

  async update(id, payload) {
    if (!id) throw new Error("installment period id is required");
    const response = await apiClient.put(`/admin/installments/${id}`, payload);
    const period = normalizePeriod(response?.period ?? response?.data ?? response);
    return { raw: response, period };
  },

  async patch(id, payload) {
    if (!id) throw new Error("installment period id is required");
    const response = await apiClient.patch(`/admin/installments/${id}`, payload ?? {});
    const period = normalizePeriod(response?.period ?? response?.data ?? response);
    return { raw: response, period };
  },

  async copy({ sourceYearId, targetYearId, targetYear } = {}) {
    if (!sourceYearId) {
      throw new Error("sourceYearId is required to copy installment periods");
    }

    const payload = {
      source_year_id: Number(sourceYearId),
    };

    if (
      targetYearId !== undefined &&
      targetYearId !== null &&
      targetYearId !== ""
    ) {
      const numericTargetId = Number(targetYearId);
      if (Number.isInteger(numericTargetId) && numericTargetId > 0) {
        payload.target_year_id = numericTargetId;
      }
    }

    if (targetYear !== undefined && targetYear !== null) {
      const trimmed = String(targetYear).trim();
      if (trimmed) {
        payload.target_year = trimmed;
      }
    }

    return apiClient.post("/admin/installments/copy", payload);
  },

  async remove(id) {
    if (!id) throw new Error("installment period id is required");
    return apiClient.delete(`/admin/installments/${id}`);
  },

  async restore(id) {
    if (!id) throw new Error("installment period id is required");
    return apiClient.patch(`/admin/installments/${id}/restore`);
  },
};

export default adminInstallmentAPI;