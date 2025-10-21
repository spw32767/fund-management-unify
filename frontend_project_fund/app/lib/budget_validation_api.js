// app/lib/budget_validation_api.js
// แก้ให้ normalize response ทุกรูปแบบ (wrapper / snake_case / camelCase) -> ใช้คีย์เดียวกันใน UI
// และแก้ checkMultipleBudgetAvailability ให้เรียกผ่าน object (ไม่พึ่ง this)

import apiClient from './api';

// ---- helper: normalize budget validation payload -> camelCase ที่ UI ใช้เสมอ ----
const normalizeBudgetValidation = (raw, subcategoryIdHint = null) => {
  const root = raw?.data && (raw.success === true || typeof raw.success === 'boolean')
    ? raw.data
    : raw?.data ?? raw ?? {};

  const isAvailable =
    root.is_fully_available ?? root.isFullyAvailable ?? root.isAvailable ?? false;

  const availableBudgets =
    root.available_budgets ?? root.availableBudgets ?? [];

  const missingBudgets =
    root.missing_budgets ?? root.missingBudgets ?? [];

  const budgetCount =
    root.budget_count ?? root.budgetCount ??
    (Array.isArray(availableBudgets) ? availableBudgets.length : 0);

  const expectedCount =
    root.expected_count ?? root.expectedCount ?? 1;

  const subcategoryName =
    root.subcategory_name ?? root.subcategoryName ?? '';

  const subcategoryId =
    root.subcategory_id ?? root.subcategoryId ?? subcategoryIdHint ?? null;

  return {
    subcategoryId,
    subcategoryName,
    isAvailable,
    availableBudgets,
    missingBudgets,
    budgetCount,
    expectedCount,
    // ติดธงว่าค่านี้ผ่าน normalize แล้ว
    _normalized: true,
  };
};

export const budgetValidationAPI = {
  // ตรวจสอบ budget availability สำหรับ subcategory เดียว
  checkBudgetAvailability: async (subcategoryId) => {
    try {
      const resp = await apiClient.get(
        `/subcategory-budgets/validate?subcategory_id=${subcategoryId}`
      );

      // รองรับทั้ง axios style ({data: {...}}) และ client ที่คืน JSON ตรง ๆ
      const payload = resp?.data ?? resp;
      const normalized = normalizeBudgetValidation(payload, subcategoryId);
      return normalized;
    } catch (error) {
      console.error(`[budget] error (one) subcategory ${subcategoryId}:`, error);

      // Fallback แบบคอนเซอร์เวทีฟ: อย่าปักว่าพร้อม ถ้าเชื่อม API ไม่ได้
      const fallback = {
        subcategoryId,
        subcategoryName: '',
        isAvailable: false,
        availableBudgets: [],
        missingBudgets: [],
        budgetCount: 0,
        expectedCount: 1,
        _fallback: true,
        error: error?.message ?? String(error),
        _normalized: true,
      };

      console.warn('[budget] fallback one:', fallback);
      return fallback;
    }
  },

  // ดึงรายการ quartiles ที่มี budget พร้อมใช้งาน
  getAvailableQuartiles: async (subcategoryId) => {
    try {
      const resp = await apiClient.get(
        `/subcategory-budgets/available-quartiles?subcategory_id=${subcategoryId}`
      );

      // รองรับได้ทั้งหลายแบบ
      const root = resp?.data ?? resp ?? {};
      const arr =
        root?.data?.available_quartiles ??
        root?.available_quartiles ??
        root?.quartiles ??
        (Array.isArray(root) ? root : null);

      const out = Array.isArray(arr) ? arr : [];
      return out;
    } catch (error) {
      console.error(`[budget] error get quartiles subcategory ${subcategoryId}:`, error);
      return [];
    }
  },

  // ตรวจสอบหลาย subcategories พร้อมกัน -> คืน map { [id]: NormalizedStatus }
  checkMultipleBudgetAvailability: async function (subcategoryIds) {
    if (!subcategoryIds || subcategoryIds.length === 0) {
      return {};
    }

    try {
      const jobs = subcategoryIds.map(async (id) => {
        try {
          const data = await budgetValidationAPI.checkBudgetAvailability(id);
          return { id, ok: true, data };
        } catch (err) {
          return { id, ok: false, err };
        }
      });

      const settled = await Promise.all(jobs);

      const map = {};
      for (const r of settled) {
        if (r.ok) {
          // r.data คือ normalized แล้ว (camelCase)
          map[r.id] = {
            ...r.data,
          };
        } else {
          map[r.id] = {
            subcategoryId: r.id,
            subcategoryName: '',
            isAvailable: false,
            availableBudgets: [],
            missingBudgets: [],
            budgetCount: 0,
            expectedCount: 1,
            _fallback: true,
            error: r.err?.message ?? String(r.err),
            _normalized: true,
          };
        }
      }

      return map;
    } catch (error) {
      console.error('[budget] error (multiple):', error);
      // หากพังระดับกลุ่ม: คืน false ทั้งหมดแบบคอนเซอร์เวทีฟ
      const map = {};
      for (const id of subcategoryIds) {
        map[id] = {
          subcategoryId: id,
          subcategoryName: '',
          isAvailable: false,
          availableBudgets: [],
          missingBudgets: [],
          budgetCount: 0,
          expectedCount: 1,
          _fallback: true,
          error: error?.message ?? String(error),
          _normalized: true,
        };
      }
      return map;
    }
  },
};

// ---- UI helpers: ใช้กับ object ที่ normalize แล้ว ----
export const isFundFullyAvailable = (subcategory, budgetStatus) => {
  const needsValidation =
    subcategory.form_type === 'publication_reward' && subcategory.has_multiple_levels;

  if (!needsValidation) return true;

  const status = budgetStatus[subcategory.subcategory_id];
  if (!status) {
    console.warn(`[budget] no status for subcategory ${subcategory.subcategory_id} -> assume available`);
    return true;
  }
  return status.isAvailable !== false;
};

export const formatMissingBudgetMessage = (subcategory, budgetStatus) => {
  const status = budgetStatus[subcategory.subcategory_id];
  if (!status || !status.missingBudgets || status.missingBudgets.length === 0) return null;
  return `ขาดงบประมาณ: ${status.missingBudgets.join(', ')}`;
};

export const getBudgetStatusDisplay = (subcategory, budgetStatus, budgetLoading) => {
  if (budgetLoading) {
    return {
      status: 'loading',
      message: 'ตรวจสอบงบประมาณ...',
      color: 'yellow',
      className: 'bg-yellow-100 text-yellow-800',
    };
  }

  const needsValidation =
    subcategory.form_type === 'publication_reward' && subcategory.has_multiple_levels;

  if (!needsValidation) {
    return {
      status: 'not_required',
      message: '',
      color: 'gray',
      className: '',
    };
  }

  const isAvailable = isFundFullyAvailable(subcategory, budgetStatus);
  if (isAvailable) {
    return {
      status: 'available',
      message: 'งบประมาณพร้อม',
      color: 'green',
      className: 'bg-green-100 text-green-800',
    };
  }

  return {
    status: 'unavailable',
    message: 'งบประมาณไม่ครบ',
    color: 'red',
    className: 'bg-red-100 text-red-800',
  };
};