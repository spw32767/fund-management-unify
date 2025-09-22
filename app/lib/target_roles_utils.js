// app/lib/target_roles_utils.js - Shared utilities for working with target_roles

import apiClient from './api';

const ROLE_ID_BY_NAME = {
  teacher: '1',
  staff: '2',
  admin: '3',
  dept_head: '4',
};

const ROLE_NAME_BY_ID = {
  1: 'teacher',
  2: 'staff',
  3: 'admin',
  4: 'dept_head',
};

const ROLE_DISPLAY_NAME = {
  1: 'อาจารย์',
  2: 'เจ้าหน้าที่',
  3: 'ผู้ดูแลระบบ',
  4: 'หัวหน้าสาขา',
};

const normalizeRoleInput = (role) => {
  if (role == null) {
    return { roleId: null, roleName: null };
  }

  if (typeof role === 'object') {
    if (role.role != null) {
      return normalizeRoleInput(role.role);
    }
    if (role.role_id != null) {
      return normalizeRoleInput(role.role_id);
    }
  }

  if (typeof role === 'string') {
    const trimmed = role.trim();
    if (!trimmed) {
      return { roleId: null, roleName: null };
    }

    const lower = trimmed.toLowerCase();
    if (ROLE_ID_BY_NAME[lower]) {
      return { roleId: ROLE_ID_BY_NAME[lower], roleName: lower };
    }

    const numeric = Number(trimmed);
    if (!Number.isNaN(numeric) && ROLE_NAME_BY_ID[numeric]) {
      return { roleId: numeric.toString(), roleName: ROLE_NAME_BY_ID[numeric] };
    }

    return { roleId: trimmed, roleName: lower };
  }

  if (typeof role === 'number') {
    const roleName = ROLE_NAME_BY_ID[role] || null;
    return { roleId: role.toString(), roleName };
  }

  return { roleId: null, roleName: null };
};

const normalizeAllowedRoleValue = (value) => {
  if (value == null) {
    return null;
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  const lower = raw.toLowerCase();
  if (ROLE_ID_BY_NAME[lower]) {
    return ROLE_ID_BY_NAME[lower];
  }

  const numeric = Number(raw);
  if (!Number.isNaN(numeric) && ROLE_NAME_BY_ID[numeric]) {
    return numeric.toString();
  }

  return raw;
};

const extractAllowedRoles = (fund) =>
  fund?.allowed_roles ??
  fund?.allowedRoles ??
  fund?.target_roles ??
  fund?.targetRoles ??
  fund?.roles_allowed ??
  fund?.targetRolesIds;

// Utility functions for working with target_roles
export const targetRolesUtils = {
  // Parse target_roles - รองรับทุกรูปแบบข้อมูล
  parseTargetRoles(targetRoles) {
    if (targetRoles === null || targetRoles === undefined) {
      return [];
    }

    if (Array.isArray(targetRoles)) {
      return targetRoles.map((role) => String(role));
    }

    if (typeof targetRoles === 'number') {
      return [String(targetRoles)];
    }

    if (typeof targetRoles === 'string') {
      if (targetRoles.trim() === '') {
        return [];
      }

      try {
        const parsed = JSON.parse(targetRoles);

        if (Array.isArray(parsed)) {
          return parsed.map((role) => String(role));
        }

        if (typeof parsed === 'number') {
          return [String(parsed)];
        }

        if (typeof parsed === 'string') {
          return [parsed];
        }

        console.warn('Parsed target_roles is unexpected type:', typeof parsed, parsed);
        return [];
      } catch (error) {
        if (targetRoles.includes(',')) {
          return targetRoles.split(',').map((role) => role.trim());
        }

        return [targetRoles.trim()];
      }
    }

    console.warn('Unexpected target_roles type:', typeof targetRoles, targetRoles);
    return [];
  },

  // Check if current user can see a fund based on target_roles
  canUserSeeFund(targetRoles, userRoleId) {
    const allowed = this.parseTargetRoles(targetRoles)
      .map(normalizeAllowedRoleValue)
      .filter(Boolean);

    if (!allowed.length) {
      return true;
    }

    const { roleId, roleName } = normalizeRoleInput(userRoleId);
    if (!roleId && !roleName) {
      return false;
    }

    return allowed.includes(roleId) || allowed.includes(roleName);
  },

  // Format target_roles for display
  formatTargetRolesForDisplay(targetRoles) {
    const parsed = this.parseTargetRoles(targetRoles);

    if (!parsed.length) {
      return 'ทุกบทบาท';
    }

    const names = parsed
      .map((value) => {
        const normalized = normalizeAllowedRoleValue(value);
        if (!normalized) {
          return null;
        }

        const numeric = Number(normalized);
        if (!Number.isNaN(numeric) && ROLE_DISPLAY_NAME[numeric]) {
          return ROLE_DISPLAY_NAME[numeric];
        }

        const lower = normalized.toLowerCase();
        if (ROLE_ID_BY_NAME[lower]) {
          return ROLE_DISPLAY_NAME[Number(ROLE_ID_BY_NAME[lower])];
        }

        return normalized;
      })
      .filter(Boolean);

    return names.length ? names.join(', ') : 'ทุกบทบาท';
  },

  // Validate target_roles array
  validateTargetRoles(targetRoles) {
    if (!Array.isArray(targetRoles)) {
      return { valid: false, error: 'target_roles must be an array' };
    }

    const validRoles = Object.values(ROLE_ID_BY_NAME);
    const invalidRoles = targetRoles.filter(
      (role) => !validRoles.includes(String(role))
    );

    if (invalidRoles.length > 0) {
      return {
        valid: false,
        error: `Invalid role IDs: ${invalidRoles.join(', ')}`,
      };
    }

    return { valid: true };
  },

  // Get current user's role and permissions
  async getCurrentUserRole() {
    try {
      const user = apiClient.getUser();
      if (!user) {
        throw new Error('User not logged in');
      }

      return {
        role_id: user.role_id,
        role_name: user.role?.role || ROLE_NAME_BY_ID[user.role_id] || 'unknown',
        can_see_all_funds: user.role_id === 3,
        is_teacher: user.role_id === 1,
        is_staff: user.role_id === 2,
        is_admin: user.role_id === 3,
        is_dept_head: user.role_id === 4 || user.role === 'dept_head',
      };
    } catch (error) {
      console.error('Error getting user role:', error);
      throw error;
    }
  },

  // Convert role name to role ID
  getRoleId(roleName) {
    if (!roleName) {
      return null;
    }
    const lower = roleName.toLowerCase();
    return ROLE_ID_BY_NAME[lower] ? Number(ROLE_ID_BY_NAME[lower]) : null;
  },

  // Convert role ID to role name
  getRoleName(roleId) {
    return ROLE_NAME_BY_ID[roleId] || 'unknown';
  },

  // Get display name for role
  getRoleDisplayName(roleId) {
    if (typeof roleId === 'string' && ROLE_ID_BY_NAME[roleId]) {
      return ROLE_DISPLAY_NAME[Number(ROLE_ID_BY_NAME[roleId])];
    }
    return ROLE_DISPLAY_NAME[roleId] || 'ไม่ระบุ';
  },

  normalizeRole(role) {
    return normalizeRoleInput(role);
  },
};

export const filterFundsByRole = (funds, role) => {
  if (!Array.isArray(funds)) {
    return [];
  }

  const { roleId, roleName } = normalizeRoleInput(role);
  if (!roleId && !roleName) {
    return funds;
  }

  return funds
    .map((category) => {
      const subcategories = (category?.subcategories || []).filter((subcategory) => {
        const allowedRaw = extractAllowedRoles(subcategory);
        if (!allowedRaw) {
          return true;
        }

        const parsed = targetRolesUtils
          .parseTargetRoles(allowedRaw)
          .map(normalizeAllowedRoleValue)
          .filter(Boolean);

        if (!parsed.length) {
          return true;
        }

        return parsed.includes(roleId) || parsed.includes(roleName);
      });

      return {
        ...category,
        subcategories,
      };
    })
    .filter(
      (category) => Array.isArray(category.subcategories) && category.subcategories.length > 0
    );
};

export default targetRolesUtils;