// app/admin/components/funds/TargetRolesManager.js
'use client';

import React, { useState, useEffect } from 'react';
import { adminFundAPI, targetRolesUtils } from '@/lib/teacher_api';

const TargetRolesManager = () => {
  const [subcategories, setSubcategories] = useState([]);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [pendingChanges, setPendingChanges] = useState({});
  const [bulkUpdateMode, setBulkUpdateMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load subcategories and available roles
      const [subcategoriesResponse, rolesResponse] = await Promise.all([
        adminFundAPI.getAllSubcategories(),
        adminFundAPI.getAvailableRoles()
      ]);

      setSubcategories(subcategoriesResponse.subcategories || []);
      setAvailableRoles(rolesResponse.roles || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleToggle = (subcategoryId, roleId) => {
    const currentTargetRoles = pendingChanges[subcategoryId] || 
      targetRolesUtils.parseTargetRoles(
        subcategories.find(s => s.subcategorie_id === subcategoryId)?.target_roles
      );

    const roleIdStr = roleId.toString();
    let newTargetRoles;

    if (currentTargetRoles.includes(roleIdStr)) {
      newTargetRoles = currentTargetRoles.filter(r => r !== roleIdStr);
    } else {
      newTargetRoles = [...currentTargetRoles, roleIdStr];
    }

    setPendingChanges(prev => ({
      ...prev,
      [subcategoryId]: newTargetRoles
    }));
  };

  const handleSaveChanges = async (subcategoryId) => {
    try {
      const targetRoles = pendingChanges[subcategoryId];
      if (!targetRoles) return;

      await adminFundAPI.updateSubcategoryRoles(subcategoryId, targetRoles);
      
      // Update local state
      setSubcategories(prev => prev.map(sub => 
        sub.subcategorie_id === subcategoryId 
          ? { ...sub, target_roles: JSON.stringify(targetRoles) }
          : sub
      ));

      // Clear pending changes
      setPendingChanges(prev => {
        const updated = { ...prev };
        delete updated[subcategoryId];
        return updated;
      });

      setEditingId(null);
      alert('บันทึกการเปลี่ยนแปลงเรียบร้อยแล้ว');
    } catch (error) {
      console.error('Error saving changes:', error);
      alert('เกิดข้อผิดพลาดในการบันทึก');
    }
  };

  const handleCancelEdit = (subcategoryId) => {
    setPendingChanges(prev => {
      const updated = { ...prev };
      delete updated[subcategoryId];
      return updated;
    });
    setEditingId(null);
  };

  const handleBulkUpdate = async () => {
    if (selectedItems.size === 0) {
      alert('กรุณาเลือกรายการที่ต้องการอัปเดต');
      return;
    }

    try {
      const updates = Array.from(selectedItems).map(subcategoryId => ({
        subcategory_id: subcategoryId,
        target_roles: pendingChanges[subcategoryId] || []
      })).filter(update => update.target_roles.length > 0);

      if (updates.length === 0) {
        alert('ไม่มีการเปลี่ยนแปลงที่จะอัปเดต');
        return;
      }

      const result = await adminFundAPI.bulkUpdateSubcategoryRoles(updates);
      
      if (result.success) {
        alert(`อัปเดตเรียบร้อย ${result.successful_updates} รายการ`);
        loadData(); // Reload data
        setBulkUpdateMode(false);
        setSelectedItems(new Set());
        setPendingChanges({});
      }
    } catch (error) {
      console.error('Error bulk updating:', error);
      alert('เกิดข้อผิดพลาดในการอัปเดต');
    }
  };

  const getCurrentTargetRoles = (subcategory) => {
    return pendingChanges[subcategory.subcategorie_id] || 
           targetRolesUtils.parseTargetRoles(subcategory.target_roles);
  };

  const hasChanges = (subcategoryId) => {
    return pendingChanges.hasOwnProperty(subcategoryId);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">กำลังโหลดข้อมูล...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-red-600 mr-3">⚠️</div>
          <div>
            <h3 className="text-red-800 font-medium">เกิดข้อผิดพลาด</h3>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        </div>
        <button 
          onClick={loadData}
          className="mt-3 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
        >
          ลองใหม่อีกครั้ง
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">
            จัดการสิทธิ์การเข้าถึงทุน (Target Roles)
          </h1>
          <div className="flex space-x-3">
            <button
              onClick={() => setBulkUpdateMode(!bulkUpdateMode)}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                bulkUpdateMode 
                  ? 'bg-gray-600 text-white hover:bg-gray-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {bulkUpdateMode ? 'ยกเลิกการแก้ไขหลายรายการ' : 'แก้ไขหลายรายการ'}
            </button>
            {bulkUpdateMode && (
              <button
                onClick={handleBulkUpdate}
                disabled={selectedItems.size === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                อัปเดตที่เลือก ({selectedItems.size})
              </button>
            )}
          </div>
        </div>

        <div className="text-sm text-gray-600">
          <p>กำหนดบทบาทที่สามารถเห็นและยื่นขอทุนแต่ละประเภทได้</p>
          <p className="mt-1">
            <strong>หมายเหตุ:</strong> ผู้ดูแลระบบจะเห็นทุนทุกประเภทเสมอ
          </p>
        </div>
      </div>

      {/* Roles Legend */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-3">บทบาทในระบบ:</h3>
        <div className="flex flex-wrap gap-3">
          {availableRoles.map(role => (
            <div key={role.role_id} className="flex items-center space-x-2">
              <div className={`w-4 h-4 rounded-full ${
                role.role_id === 1 ? 'bg-green-500' :
                role.role_id === 2 ? 'bg-yellow-500' :
                'bg-red-500'
              }`}></div>
              <span className="text-sm font-medium text-blue-800">
                {role.display_name} (ID: {role.role_id})
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Subcategories Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {bulkUpdateMode && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    เลือก
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ชื่อทุน
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  หมวดหมู่
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  สิทธิ์ปัจจุบัน
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  จัดการสิทธิ์
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  การดำเนินการ
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {subcategories.map((subcategory) => {
                const currentRoles = getCurrentTargetRoles(subcategory);
                const isEditing = editingId === subcategory.subcategorie_id || bulkUpdateMode;
                const changed = hasChanges(subcategory.subcategorie_id);

                return (
                  <tr key={subcategory.subcategorie_id} className={changed ? 'bg-yellow-50' : ''}>
                    {bulkUpdateMode && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(subcategory.subcategorie_id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedItems);
                            if (e.target.checked) {
                              newSelected.add(subcategory.subcategorie_id);
                            } else {
                              newSelected.delete(subcategory.subcategorie_id);
                            }
                            setSelectedItems(newSelected);
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </td>
                    )}
                    
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {subcategory.subcategorie_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        ID: {subcategory.subcategorie_id}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {subcategory.category?.category_name || 'ไม่ระบุ'}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-sm">
                        {currentRoles.length === 0 ? (
                          <span className="text-gray-500">ทุกบทบาท</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {currentRoles.map(roleId => {
                              const role = availableRoles.find(r => r.role_id.toString() === roleId);
                              return (
                                <span
                                  key={roleId}
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    roleId === '1' ? 'bg-green-100 text-green-800' :
                                    roleId === '2' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {role?.display_name || `Role ${roleId}`}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {isEditing ? (
                        <div className="space-y-2">
                          {availableRoles.map(role => (
                            <label key={role.role_id} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={currentRoles.includes(role.role_id.toString())}
                                onChange={() => handleRoleToggle(subcategory.subcategorie_id, role.role_id)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <span className="text-sm text-gray-700">
                                {role.display_name}
                              </span>
                            </label>
                          ))}
                          <div className="text-xs text-gray-500 mt-2">
                            ไม่เลือกใดเลือกหนึ่ง = ทุกบทบาทเห็นได้
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">
                          คลิก "แก้ไข" เพื่อจัดการสิทธิ์
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {!bulkUpdateMode && (
                        <div className="flex space-x-2">
                          {editingId === subcategory.subcategorie_id ? (
                            <>
                              <button
                                onClick={() => handleSaveChanges(subcategory.subcategorie_id)}
                                disabled={!changed}
                                className="text-green-600 hover:text-green-900 disabled:text-gray-400"
                              >
                                บันทึก
                              </button>
                              <button
                                onClick={() => handleCancelEdit(subcategory.subcategorie_id)}
                                className="text-gray-600 hover:text-gray-900"
                              >
                                ยกเลิก
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setEditingId(subcategory.subcategorie_id)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              แก้ไข
                            </button>
                          )}
                        </div>
                      )}
                      {changed && (
                        <div className="text-xs text-yellow-600 mt-1">
                          มีการเปลี่ยนแปลง
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500">ทุนทั้งหมด:</span>
            <span className="ml-2 font-medium">{subcategories.length} รายการ</span>
          </div>
          <div>
            <span className="text-gray-500">มีการเปลี่ยนแปลง:</span>
            <span className="ml-2 font-medium text-yellow-600">
              {Object.keys(pendingChanges).length} รายการ
            </span>
          </div>
          <div>
            <span className="text-gray-500">เลือกแล้ว:</span>
            <span className="ml-2 font-medium text-blue-600">
              {selectedItems.size} รายการ
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TargetRolesManager;