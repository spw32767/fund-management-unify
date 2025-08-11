import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Copy,
  ToggleRight,
  ToggleLeft,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Save,
  X
} from "lucide-react";
import Swal from 'sweetalert2';
import adminAPI from '../../../lib/admin_api';
import StatusBadge from './StatusBadge';

const RewardConfigManager = () => {
  const [activeSubTab, setActiveSubTab] = useState('rates');
  const [rewardRates, setRewardRates] = useState([]);
  const [rewardConfigs, setRewardConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState('2568');
  const [years, setYears] = useState([]);

  // ====== Modal (เดิม) ======
  const [showRateForm, setShowRateForm] = useState(false);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const [editingConfig, setEditingConfig] = useState(null);

  const [rateFormData, setRateFormData] = useState({
    year: '2568',
    author_status: '',
    journal_quartile: '',
    reward_amount: ''
  });

  const [configFormData, setConfigFormData] = useState({
    year: '2568',
    journal_quartile: '',
    max_amount: '',
    condition_description: ''
  });

  // ====== Sorting State ======
  const [rateSort, setRateSort] = useState({ key: null, dir: 'asc' });
  const [configSort, setConfigSort] = useState({ key: null, dir: 'asc' });

  const authorStatusOptions = [
    { value: 'first_author', label: 'First Author (ผู้นิพนธ์หลัก)' },
    { value: 'corresponding_author', label: 'Corresponding Author (ผู้นิพนธ์ติดต่อ)' },
  ];

  const quartileOptions = [
    { value: 'T5', label: 'T5 (Top 5%)', order: 1 },
    { value: 'T10', label: 'T10 (Top 10%)', order: 2 },
    { value: 'Q1', label: 'Q1 (Quartile 1)', order: 3 },
    { value: 'Q2', label: 'Q2 (Quartile 2)', order: 4 },
    { value: 'Q3', label: 'Q3 (Quartile 3)', order: 5 },
    { value: 'Q4', label: 'Q4 (Quartile 4)', order: 6 },
    { value: 'TCI', label: 'TCI (TCI Group 1)', order: 7 },
    { value: 'N/A', label: 'N/A (ไม่ระบุ)', order: 8 }
  ];

  // ====== Load Years ======
  const loadAvailableYears = async () => {
    try {
      const [ratesResponse, configsResponse] = await Promise.all([
        adminAPI.getPublicationRewardRatesYears().catch(() => ({ years: [] })),
        adminAPI.getRewardConfigYears().catch(() => ({ years: [] }))
      ]);
      const rateYears = ratesResponse.years || [];
      const configYears = configsResponse.years || [];
      const allYears = [...new Set([...rateYears, ...configYears])];
      const sortedYears = allYears.sort((a, b) => b - a);
      setYears(sortedYears);
      if (sortedYears.length > 0) setSelectedYear(sortedYears[0]);
    } catch {
      const currentYear = (new Date().getFullYear() + 543).toString();
      setYears([currentYear]);
      setSelectedYear(currentYear);
    }
  };

  useEffect(() => { loadAvailableYears(); }, []);
  useEffect(() => { if (selectedYear && years.length) loadData(); }, [selectedYear, activeSubTab, years]);

  // ====== Load Data ======
  const loadData = async () => {
    setLoading(true);
    try {
      if (activeSubTab === 'rates') {
        const response = await adminAPI.getPublicationRewardRates(selectedYear);
        setRewardRates(response.rates || []);
      } else {
        const response = await adminAPI.getRewardConfigs(selectedYear);
        setRewardConfigs(response.data || []);
      }
    } catch {
      Swal.fire('Error', 'ไม่สามารถโหลดข้อมูลได้', 'error');
    }
    setLoading(false);
  };

  // ====== Helpers ======
  const quartileOrder = (q) => quartileOptions.find(x => x.value === q)?.order ?? 999;
  const authorLabel = (v) => authorStatusOptions.find(s => s.value === v)?.label || v;

  const toggleSort = (which, key) => {
    if (which === 'rates') {
      setRateSort((prev) => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));
    } else {
      setConfigSort((prev) => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));
    }
  };

  const sortIcon = (sortState, key) => {
    if (sortState.key !== key) return <ArrowUpDown size={14} className="inline-block ml-1 opacity-60" />;
    return sortState.dir === 'asc'
      ? <ArrowUp size={14} className="inline-block ml-1" />
      : <ArrowDown size={14} className="inline-block ml-1" />;
  };

  const sortedRates = useMemo(() => {
    const list = [...rewardRates];
    const { key, dir } = rateSort;
    if (!key) {
      // default: Quartile order, then author_status asc (เดิม)
      return list.sort((a, b) => {
        const oa = quartileOrder(a.journal_quartile);
        const ob = quartileOrder(b.journal_quartile);
        if (oa !== ob) return oa - ob;
        return a.author_status.localeCompare(b.author_status);
      });
    }
    const mul = dir === 'asc' ? 1 : -1;
    return list.sort((a, b) => {
      if (key === 'author_status') {
        return authorLabel(a.author_status).localeCompare(authorLabel(b.author_status)) * mul;
      }
      if (key === 'journal_quartile') {
        return (quartileOrder(a.journal_quartile) - quartileOrder(b.journal_quartile)) * mul;
      }
      if (key === 'reward_amount') {
        return ((+a.reward_amount || 0) - (+b.reward_amount || 0)) * mul;
      }
      if (key === 'is_active') {
        return ((a.is_active ? 1 : 0) - (b.is_active ? 1 : 0)) * mul;
      }
      return 0;
    });
  }, [rewardRates, rateSort]);

  const sortedConfigs = useMemo(() => {
    const list = [...rewardConfigs];
    const { key, dir } = configSort;
    if (!key) {
      // default: Quartile order (เดิม)
      return list.sort((a, b) => quartileOrder(a.journal_quartile) - quartileOrder(b.journal_quartile));
    }
    const mul = dir === 'asc' ? 1 : -1;
    return list.sort((a, b) => {
      if (key === 'journal_quartile') {
        return (quartileOrder(a.journal_quartile) - quartileOrder(b.journal_quartile)) * mul;
      }
      if (key === 'max_amount') {
        return ((+a.max_amount || 0) - (+b.max_amount || 0)) * mul;
      }
      if (key === 'condition_description') {
        return ((a.condition_description || '').localeCompare(b.condition_description || '')) * mul;
      }
      if (key === 'is_active') {
        return ((a.is_active ? 1 : 0) - (b.is_active ? 1 : 0)) * mul;
      }
      return 0;
    });
  }, [rewardConfigs, configSort]);

  // ====== Toggle / Delete ======
  const toggleStatus = async (id, currentStatus, type) => {
    const result = await Swal.fire({
      title: 'ยืนยันการเปลี่ยนสถานะ?',
      text: `ต้องการ${currentStatus ? 'ปิด' : 'เปิด'}การใช้งานรายการนี้?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก'
    });
    if (!result.isConfirmed) return;
    try {
      if (type === 'rate') await adminAPI.togglePublicationRewardRateStatus(id);
      else await adminAPI.toggleRewardConfigStatus(id);
      await loadData();
      Swal.fire('สำเร็จ', 'เปลี่ยนสถานะเรียบร้อย', 'success');
    } catch {
      Swal.fire('Error', 'ไม่สามารถเปลี่ยนสถานะได้', 'error');
    }
  };

  const deleteItem = async (id, type) => {
    const result = await Swal.fire({
      title: 'ยืนยันการลบ?',
      text: 'การลบนี้ไม่สามารถย้อนกลับได้',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#d33'
    });
    if (!result.isConfirmed) return;
    try {
      if (type === 'rate') await adminAPI.deletePublicationRewardRate(id);
      else await adminAPI.deleteRewardConfig(id);
      await loadData();
      Swal.fire('สำเร็จ', 'ลบข้อมูลเรียบร้อย', 'success');
    } catch {
      Swal.fire('Error', 'ไม่สามารถลบข้อมูลได้', 'error');
    }
  };

  // ====== Save ======
  const saveRate = async () => {
    try {
      const payload = { ...rateFormData, reward_amount: parseFloat(rateFormData.reward_amount) };
      if (editingRate) {
        await adminAPI.updatePublicationRewardRate(editingRate.rate_id, payload);
      } else {
        await adminAPI.createPublicationRewardRate({ ...payload, year: selectedYear });
      }
      setShowRateForm(false);
      setEditingRate(null);
      setRateFormData({
        year: selectedYear,
        author_status: '',
        journal_quartile: '',
        reward_amount: ''
      });
      await loadData();
      Swal.fire('สำเร็จ', 'บันทึกข้อมูลเรียบร้อย', 'success');
    } catch (error) {
      Swal.fire('Error', error?.response?.data?.message || 'ไม่สามารถบันทึกข้อมูลได้', 'error');
    }
  };

  const saveConfig = async () => {
    try {
      const payload = { ...configFormData, max_amount: parseFloat(configFormData.max_amount) };
      if (editingConfig) {
        await adminAPI.updateRewardConfig(editingConfig.config_id, payload);
      } else {
        await adminAPI.createRewardConfig({ ...payload, year: selectedYear });
      }
      setShowConfigForm(false);
      setEditingConfig(null);
      setConfigFormData({
        year: selectedYear,
        journal_quartile: '',
        max_amount: '',
        condition_description: ''
      });
      await loadData();
      Swal.fire('สำเร็จ', 'บันทึกข้อมูลเรียบร้อย', 'success');
    } catch (error) {
      Swal.fire('Error', error?.response?.data?.message || 'ไม่สามารถบันทึกข้อมูลได้', 'error');
    }
  };

  // ====== Copy to New Year ======
  const copyToNewYear = async () => {
    const { value: newYear } = await Swal.fire({
      title: 'คัดลอกข้อมูลไปยังปีใหม่',
      input: 'text',
      inputLabel: 'ระบุปีปลายทาง (พ.ศ.)',
      inputPlaceholder: 'เช่น 2569',
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) return 'กรุณาระบุปี';
        if (!/^\d{4}$/.test(value)) return 'กรุณาระบุปีในรูปแบบ พ.ศ. 4 หลัก';
        if (parseInt(value) < 2500) return 'ปีต้องมากกว่า 2500';
        if (years.includes(value)) return 'ปีนี้มีข้อมูลอยู่แล้ว';
      }
    });

    if (!newYear) return;
    try {
      if (activeSubTab === 'rates') {
        await adminAPI.copyPublicationRewardRates(selectedYear, newYear);
      } else {
        await adminAPI.copyRewardConfigs(selectedYear, newYear);
      }
      Swal.fire('สำเร็จ', `คัดลอกข้อมูลไปยังปี ${newYear} เรียบร้อย`, 'success');
      await loadAvailableYears();
      setSelectedYear(newYear);
    } catch {
      Swal.fire('Error', 'ไม่สามารถคัดลอกข้อมูลได้', 'error');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">จัดการเงินรางวัลการตีพิมพ์</h2>
          <p className="text-gray-600 mt-1">กำหนดอัตราเงินรางวัลและวงเงินสนับสนุนค่าธรรมเนียม</p>
        </div>
        {years.length > 0 && (
          <button
            onClick={copyToNewYear}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Copy size={16} />
            คัดลอกไปปีใหม่
          </button>
        )}
      </div>

      {/* Year Selector */}
      <div className="mb-5 flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">ปีงบประมาณ:</label>
        {years.length ? (
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {years.map((y) => <option key={y} value={y}>พ.ศ. {y}</option>)}
          </select>
        ) : (
          <span className="text-gray-500">กำลังโหลด...</span>
        )}
      </div>

      {/* Sub Tabs */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setActiveSubTab('rates')}
            className={`py-2 border-b-2 text-sm ${
              activeSubTab === 'rates'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            อัตราเงินรางวัล (Reward Rates)
          </button>
          <button
            onClick={() => setActiveSubTab('configs')}
            className={`py-2 border-b-2 text-sm ${
              activeSubTab === 'configs'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            วงเงินค่าธรรมเนียม (Fee Limits)
          </button>
        </nav>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-10 text-gray-600">กำลังโหลดข้อมูล...</div>
      ) : activeSubTab === 'rates' ? (
        <div>
          <div className="mb-4">
            <button
              onClick={() => {
                setShowRateForm(true);
                setEditingRate(null);
                setRateFormData({
                  year: selectedYear,
                  author_status: '',
                  journal_quartile: '',
                  reward_amount: ''
                });
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus size={16} />
              เพิ่มอัตราใหม่
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    <button
                      className="inline-flex items-center"
                      onClick={() => toggleSort('rates', 'author_status')}
                    >
                      สถานะผู้นิพนธ์ {sortIcon(rateSort, 'author_status')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    <button
                      className="inline-flex items-center"
                      onClick={() => toggleSort('rates', 'journal_quartile')}
                    >
                      Quartile {sortIcon(rateSort, 'journal_quartile')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                    <button
                      className="inline-flex items-center"
                      onClick={() => toggleSort('rates', 'reward_amount')}
                    >
                      จำนวนเงินรางวัล {sortIcon(rateSort, 'reward_amount')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                    <button
                      className="inline-flex items-center"
                      onClick={() => toggleSort('rates', 'is_active')}
                    >
                      สถานะ {sortIcon(rateSort, 'is_active')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedRates.map((rate) => (
                  <tr key={rate.rate_id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {authorLabel(rate.author_status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {quartileOptions.find(q => q.value === rate.journal_quartile)?.label || rate.journal_quartile}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {new Intl.NumberFormat('th-TH').format(rate.reward_amount)} บาท
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <StatusBadge
                        status={!!rate.is_active}
                        interactive
                        confirm={false}
                        onChange={() => toggleStatus(rate.rate_id, rate.is_active, 'rate')}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <button
                        onClick={() => {
                          setEditingRate(rate);
                          setRateFormData({
                            year: rate.year,
                            author_status: rate.author_status,
                            journal_quartile: rate.journal_quartile,
                            reward_amount: rate.reward_amount
                          });
                          setShowRateForm(true);
                        }}
                        className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg mr-1"
                        title="แก้ไข"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => deleteItem(rate.rate_id, 'rate')}
                        className="text-red-600 hover:bg-red-50 p-2 rounded-lg"
                        title="ลบ"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        // ===== Fee Configs Tab =====
        <div>
          <div className="mb-4">
            <button
              onClick={() => {
                setShowConfigForm(true);
                setEditingConfig(null);
                setConfigFormData({
                  year: selectedYear,
                  journal_quartile: '',
                  max_amount: '',
                  condition_description: ''
                });
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus size={16} />
              เพิ่มการกำหนดค่าใหม่
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    <button
                      className="inline-flex items-center"
                      onClick={() => toggleSort('configs', 'journal_quartile')}
                    >
                      Quartile {sortIcon(configSort, 'journal_quartile')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                    <button
                      className="inline-flex items-center"
                      onClick={() => toggleSort('configs', 'max_amount')}
                    >
                      วงเงินสูงสุด {sortIcon(configSort, 'max_amount')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    <button
                      className="inline-flex items-center"
                      onClick={() => toggleSort('configs', 'condition_description')}
                    >
                      เงื่อนไข/หมายเหตุ {sortIcon(configSort, 'condition_description')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                    <button
                      className="inline-flex items-center"
                      onClick={() => toggleSort('configs', 'is_active')}
                    >
                      สถานะ {sortIcon(configSort, 'is_active')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedConfigs.map((config) => (
                  <tr key={config.config_id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {quartileOptions.find(q => q.value === config.journal_quartile)?.label || config.journal_quartile}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {config.max_amount > 0
                        ? `${new Intl.NumberFormat('th-TH').format(config.max_amount)} บาท`
                        : 'ไม่สนับสนุน'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {config.condition_description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <StatusBadge
                        status={!!config.is_active}
                        interactive
                        confirm={false}
                        onChange={() => toggleStatus(config.config_id, config.is_active, 'config')}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <button
                        onClick={() => {
                          setEditingConfig(config);
                          setConfigFormData({
                            year: config.year,
                            journal_quartile: config.journal_quartile,
                            max_amount: config.max_amount,
                            condition_description: config.condition_description || ''
                          });
                          setShowConfigForm(true);
                        }}
                        className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg mr-1"
                        title="แก้ไข"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => deleteItem(config.config_id, 'config')}
                        className="text-red-600 hover:bg-red-50 p-2 rounded-lg"
                        title="ลบ"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== Rate Form Modal (เดิม) ===== */}
      {showRateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-900">
                {editingRate ? 'แก้ไขอัตราเงินรางวัล' : 'เพิ่มอัตราเงินรางวัล'}
              </h3>
              <button
                onClick={() => { setShowRateForm(false); setEditingRate(null); }}
                className="p-2 rounded-md hover:bg-gray-100"
                title="ปิด"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">สถานะผู้นิพนธ์</label>
                <select
                  value={rateFormData.author_status}
                  onChange={(e) => setRateFormData({ ...rateFormData, author_status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">เลือกสถานะ</option>
                  {authorStatusOptions.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Journal Quartile</label>
                <select
                  value={rateFormData.journal_quartile}
                  onChange={(e) => setRateFormData({ ...rateFormData, journal_quartile: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">เลือก Quartile</option>
                  {quartileOptions.map((q) => (
                    <option key={q.value} value={q.value}>{q.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนเงินรางวัล (บาท)</label>
                <input
                  type="number"
                  value={rateFormData.reward_amount}
                  onChange={(e) => setRateFormData({ ...rateFormData, reward_amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="1000"
                  placeholder="เช่น 50000"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => { setShowRateForm(false); setEditingRate(null); }}
                className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={saveRate}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Save size={16} />
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Config Form Modal (เดิม) ===== */}
      {showConfigForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-900">
                {editingConfig ? 'แก้ไขวงเงินค่าธรรมเนียม' : 'เพิ่มวงเงินค่าธรรมเนียม'}
              </h3>
              <button
                onClick={() => { setShowConfigForm(false); setEditingConfig(null); }}
                className="p-2 rounded-md hover:bg-gray-100"
                title="ปิด"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Journal Quartile</label>
                <select
                  value={configFormData.journal_quartile}
                  onChange={(e) => setConfigFormData({ ...configFormData, journal_quartile: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">เลือก Quartile</option>
                  {quartileOptions.map((q) => (
                    <option key={q.value} value={q.value}>{q.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">วงเงินสูงสุด (บาท)</label>
                <input
                  type="number"
                  value={configFormData.max_amount}
                  onChange={(e) => setConfigFormData({ ...configFormData, max_amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="1000"
                  placeholder="0 = ไม่สนับสนุนค่าธรรมเนียม"
                />
                <p className="mt-1 text-xs text-gray-500">ใส่ 0 หากไม่ต้องการสนับสนุนค่าธรรมเนียมสำหรับ Quartile นี้</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">เงื่อนไข/หมายเหตุ (ถ้ามี)</label>
                <textarea
                  value={configFormData.condition_description}
                  onChange={(e) => setConfigFormData({ ...configFormData, condition_description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="เช่น เงื่อนไขพิเศษสำหรับ Quartile นี้"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => { setShowConfigForm(false); setEditingConfig(null); }}
                className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={saveConfig}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Save size={16} />
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RewardConfigManager;
