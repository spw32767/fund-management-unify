// app/lib/target_roles_utils.js - Shared utilities for working with target_roles

import apiClient from './api';

// Utility functions for working with target_roles
export const targetRolesUtils = {
  
  // Parse target_roles - รองรับทุกรูปแบบข้อมูล
  parseTargetRoles(targetRoles) {
    // กรณี null หรือ undefined
    if (targetRoles === null || targetRoles === undefined) {
      return [];
    }
    
    // กรณีเป็น array อยู่แล้ว
    if (Array.isArray(targetRoles)) {
      return targetRoles.map(role => String(role)); // แปลงเป็น string ทั้งหมด
    }
    
    // กรณีเป็น number (เช่น 3)
    if (typeof targetRoles === 'number') {
      return [String(targetRoles)]; // แปลงเป็น ["3"]
    }
    
    // กรณีเป็น string
    if (typeof targetRoles === 'string') {
      // ถ้าเป็น string ว่าง
      if (targetRoles.trim() === '') {
        return [];
      }
      
      // ถ้าเป็น JSON string
      try {
        const parsed = JSON.parse(targetRoles);
        
        // หลังจาก parse แล้วเป็น array
        if (Array.isArray(parsed)) {
          return parsed.map(role => String(role)); // แปลงเป็น string ทั้งหมด
        }
        
        // หลังจาก parse แล้วเป็น number
        if (typeof parsed === 'number') {
          return [String(parsed)];
        }
        
        // หลังจาก parse แล้วเป็น string
        if (typeof parsed === 'string') {
          return [parsed];
        }
        
        // กรณีอื่นๆ
        console.warn('Parsed target_roles is unexpected type:', typeof parsed, parsed);
        return [];
        
      } catch (error) {
        // ถ้า parse ไม่ได้ อาจจะเป็น string ธรรมดา เช่น "1" หรือ "1,2,3"
        if (targetRoles.includes(',')) {
          // กรณี "1,2,3"
          return targetRoles.split(',').map(role => role.trim());
        } else {
          // กรณี "1"
          return [targetRoles.trim()];
        }
      }
    }
    
    // กรณีอื่นๆ ที่ไม่คาดคิด
    console.warn('Unexpected target_roles type:', typeof targetRoles, targetRoles);
    return [];
  },

  // Check if current user can see a fund based on target_roles
  canUserSeeFund(targetRoles, userRoleId) {
    // Admin sees everything
    if (userRoleId === 3) {
      return true;
    }
    
    // If no target_roles specified, everyone can see it
    if (!targetRoles || targetRoles.length === 0) {
      return true;
    }
    
    // Check if user's role is in target_roles
    return targetRoles.includes(userRoleId.toString());
  },

  // Format target_roles for display
  formatTargetRolesForDisplay(targetRoles) {
    if (!targetRoles || targetRoles.length === 0) {
      return 'ทุกบทบาท';
    }
    
    const roleNames = {
      '1': 'อาจารย์',
      '2': 'เจ้าหน้าที่', 
      '3': 'ผู้ดูแลระบบ'
    };
    
    return targetRoles.map(roleId => roleNames[roleId] || `Role ${roleId}`).join(', ');
  },

  // Validate target_roles array
  validateTargetRoles(targetRoles) {
    if (!Array.isArray(targetRoles)) {
      return { valid: false, error: 'target_roles must be an array' };
    }
    
    const validRoles = ['1', '2', '3'];
    const invalidRoles = targetRoles.filter(role => !validRoles.includes(role.toString()));
    
    if (invalidRoles.length > 0) {
      return { 
        valid: false, 
        error: `Invalid role IDs: ${invalidRoles.join(', ')}` 
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
        role_name: user.role?.role || 'unknown',
        can_see_all_funds: user.role_id === 3, // Admin
        is_teacher: user.role_id === 1,
        is_staff: user.role_id === 2,
        is_admin: user.role_id === 3
      };
    } catch (error) {
      console.error('Error getting user role:', error);
      throw error;
    }
  },

  // Convert role name to role ID
  getRoleId(roleName) {
    const roleMap = {
      'teacher': 1,
      'staff': 2,
      'admin': 3
    };
    return roleMap[roleName.toLowerCase()] || null;
  },

  // Convert role ID to role name
  getRoleName(roleId) {
    const roleMap = {
      1: 'teacher',
      2: 'staff',
      3: 'admin'
    };
    return roleMap[roleId] || 'unknown';
  },

  // Get display name for role
  getRoleDisplayName(roleId) {
    const displayNames = {
      1: 'อาจารย์',
      2: 'เจ้าหน้าที่',
      3: 'ผู้ดูแลระบบ'
    };
    return displayNames[roleId] || 'ไม่ระบุ';
  }
};

export default targetRolesUtils;