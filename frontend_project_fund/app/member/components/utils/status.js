export function normalizeStatusCode(value) {
  if (value == null) {
    return "";
  }

  return String(value).trim().toLowerCase();
}

export function normalizeStatusName(value) {
  if (!value) {
    return "";
  }

  return String(value).trim().toLowerCase();
}

export function isApprovedStatus(statusId, statusCode, statusName) {
  const normalizedId = statusId != null ? Number(statusId) : null;
  const normalizedCode = normalizeStatusCode(statusCode);
  const normalizedName = normalizeStatusName(statusName);

  if (Number.isFinite(normalizedId) && normalizedId === 2) {
    return true;
  }

  if (normalizedCode) {
    if (normalizedCode === "approved") {
      return true;
    }

    if (normalizedCode.includes("approve")) {
      return true;
    }
  }

  if (normalizedName) {
    if (normalizedName.includes("อนุมัติ")) {
      return true;
    }

    if (normalizedName.includes("approve")) {
      return true;
    }
  }

  return false;
}