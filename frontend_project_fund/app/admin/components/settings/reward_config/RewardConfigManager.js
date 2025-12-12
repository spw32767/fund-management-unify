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
  Trophy,
  PlusCircle
} from "lucide-react";
import Swal from 'sweetalert2';
import adminAPI from "@/app/lib/admin_api";
import StatusBadge from "@/app/admin/components/settings/StatusBadge";
import { systemConfigAPI } from "@/app/lib/system_config_api";
import SettingsSectionCard from "@/app/admin/components/settings/common/SettingsSectionCard";
import SettingsModal from "@/app/admin/components/settings/common/SettingsModal";

const RewardConfigManager = () => {
  const [activeSubTab, setActiveSubTab] = useState('rates');
  const [rewardRates, setRewardRates] = useState([]);
  const [rewardConfigs, setRewardConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState('');
  const [years, setYears] = useState([]);
  const [copying, setCopying] = useState(false);
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [copyMode, setCopyMode] = useState('new');
  const [copyNewYear, setCopyNewYear] = useState('');
  const [copyExistingYear, setCopyExistingYear] = useState('');
  const [copyError, setCopyError] = useState('');

  // ====== Modal (เดิม) ======
  const [showRateForm, setShowRateForm] = useState(false);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const [editingConfig, setEditingConfig] = useState(null);

  const closeRateForm = () => {
    setShowRateForm(false);
    setEditingRate(null);
  };

  const closeConfigForm = () => {
    setShowConfigForm(false);
    setEditingConfig(null);
  };

  const [rateFormData, setRateFormData] = useState({
    year: '',
    author_status: '',
    journal_quartile: '',
    reward_amount: ''
  });

  const [configFormData, setConfigFormData] = useState({
    year: '',
    journal_quartile: '',
    max_amount: '',
    condition_description: ''
  });

  // ====== Sorting State ======
  const [rateSort, setRateSort] = useState({ key: null, dir: 'asc' });
  const [configSort, setConfigSort] = useState({ key: null, dir: 'asc' });

  const existingTargetYears = useMemo(
    () => years.filter((year) => year !== selectedYear),
    [years, selectedYear]
  );

  const selectedYearNumber = useMemo(() => {
    const numeric = Number(selectedYear);
    return Number.isFinite(numeric) ? numeric : null;
  }, [selectedYear]);

  const nextYear = useMemo(() => {
    if (!selectedYearNumber) return '';
    return String(selectedYearNumber + 1);
  }, [selectedYearNumber]);

  const existingYearNumbers = useMemo(
    () => years.map((year) => Number(year)).filter((value) => Number.isFinite(value)),
    [years]
  );

  const hasExistingTargets = existingTargetYears.length > 0;

  const resetCopyState = () => {
    setCopyMode('new');
    setCopyNewYear(nextYear || '');
    setCopyExistingYear(hasExistingTargets ? String(existingTargetYears[0]) : '');
    setCopyError('');
  };

  const authorStatusOptions = [
    { value: 'first_author', label: 'First Author (ผู้ประพันธ์ชื่อแรก)' },
    { value: 'corresponding_author', label: 'Corresponding Author (ผู้ประพันธ์บรรณกิจ)' },
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
      const [
        adminYearsResponse,
        ratesResponse,
        configsResponse,
        currentYearResponse
      ] = await Promise.all([
        adminAPI.getYears().catch(() => []),
        adminAPI.getPublicationRewardRatesYears().catch(() => ({ years: [] })),
        adminAPI.getRewardConfigYears().catch(() => ({ years: [] })),
        systemConfigAPI.getCurrentYear().catch(() => null)
      ]);
      const normalizeYearValue = (value) => {
        if (value == null) return null;
        if (typeof value === 'object') {
          if (Object.prototype.hasOwnProperty.call(value, 'year') && value.year != null) {
            return String(value.year);
          }
          if (Object.prototype.hasOwnProperty.call(value, 'value') && value.value != null) {
            return String(value.value);
          }
        }
        return String(value);
      };

      const toYearStrings = (list) => {
        if (!Array.isArray(list)) return [];
        return list
          .map((item) => normalizeYearValue(item))
          .filter((val) => val);
      };

      const adminYears = toYearStrings(adminYearsResponse);
      const rateYears = toYearStrings(ratesResponse?.years ?? ratesResponse?.data?.years ?? []);
      const configYears = toYearStrings(configsResponse?.years ?? configsResponse?.data?.years ?? []);
      const systemYearCandidateRaw =
        currentYearResponse?.current_year ?? currentYearResponse?.data?.current_year ?? null;

      const mergedYears = [...adminYears, ...rateYears, ...configYears];
      if (systemYearCandidateRaw != null) {
        mergedYears.push(String(systemYearCandidateRaw));
      }

      const uniqueYears = Array.from(new Set(mergedYears.filter(Boolean)));
      uniqueYears.sort((a, b) => Number(b) - Number(a));

      if (uniqueYears.length > 0) {
        setYears(uniqueYears);
        setSelectedYear((prev) => {
          if (prev && uniqueYears.includes(prev)) {
            return prev;
          }
          if (systemYearCandidateRaw != null) {
            const systemYearString = String(systemYearCandidateRaw);
            if (uniqueYears.includes(systemYearString)) {
              return systemYearString;
            }
          }
          return uniqueYears[0] || prev || '';
        });
      } else {
        const fallbackYear =
          systemYearCandidateRaw != null
            ? String(systemYearCandidateRaw)
            : (new Date().getFullYear() + 543).toString();
        if (fallbackYear) {
          setYears([fallbackYear]);
          setSelectedYear(fallbackYear);
        } else {
          setYears([]);
          setSelectedYear('');
        }
      }
    } catch {
      const currentYear = (new Date().getFullYear() + 543).toString();
      setYears([currentYear]);
      setSelectedYear(currentYear);
    }
  };

  useEffect(() => { loadAvailableYears(); }, []);
  useEffect(() => { if (selectedYear && years.length) loadData(); }, [selectedYear, activeSubTab, years]);
  useEffect(() => {
    if (!selectedYear) return;
    setRateFormData((prev) => (prev.year === selectedYear ? prev : { ...prev, year: selectedYear }));
    setConfigFormData((prev) => (prev.year === selectedYear ? prev : { ...prev, year: selectedYear }));
  }, [selectedYear]);

  // ====== Load Data ======
  const loadData = async () => {
    setLoading(true);
    try {
      if (activeSubTab === 'rates') {
        const response = await adminAPI.getPublicationRewardRates(selectedYear);
        const ratesData = response?.rates ?? response?.data ?? [];
        setRewardRates(Array.isArray(ratesData) ? ratesData : []);
      } else {
        const response = await adminAPI.getRewardConfigs(selectedYear);
        const configsPayload = response?.data ?? response?.configs ?? [];
        const configsArray = Array.isArray(configsPayload)
          ? configsPayload
          : Array.isArray(response?.data?.data)
            ? response.data.data
            : [];

        const filteredConfigs = configsArray.filter((config) => {
          const configYear =
            config?.year != null
              ? String(config.year)
              : config?.year_id != null
                ? String(config.year_id)
                : null;
          return configYear === String(selectedYear);
        });

        setRewardConfigs(filteredConfigs);
      }
    } catch {
      Swal.fire('Error', 'ไม่สามารถโหลดข้อมูลได้', 'error');
      if (activeSubTab === 'rates') {
        setRewardRates([]);
      } else {
        setRewardConfigs([]);
      }
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
  const copyTargetLabel = useMemo(
    () => (activeSubTab === 'rates'
      ? 'อัตราเงินรางวัล (Reward Rates)'
      : 'วงเงินค่าธรรมเนียม (Fee Limits)'),
    [activeSubTab]
  );

  const hasCopyableData = useMemo(() => {
    if (!selectedYear) return false;
    const dataset = activeSubTab === 'rates' ? rewardRates : rewardConfigs;
    return Array.isArray(dataset) && dataset.length > 0;
  }, [activeSubTab, rewardRates, rewardConfigs, selectedYear]);

  const openCopyModal = async () => {
    if (!selectedYear) {
      await Swal.fire('แจ้งเตือน', 'กรุณาเลือกปีที่ต้องการคัดลอกก่อน', 'warning');
      return;
    }

    if (!hasCopyableData) {
      await Swal.fire(
        'แจ้งเตือน',
        `ไม่มีข้อมูล ${copyTargetLabel} สำหรับปี พ.ศ. ${selectedYear} ให้คัดลอก`,
        'warning'
      );
      return;
    }

    resetCopyState();
    setCopyModalOpen(true);
  };

  const closeCopyModal = () => {
    setCopyModalOpen(false);
    setCopyError('');
  };

  const handleCopySubmit = async (event) => {
    event?.preventDefault();
    setCopyError('');

    if (copyMode === 'existing') {
      if (!hasExistingTargets) {
        setCopyError('ยังไม่มีปีปลายทางให้เลือก');
        return;
      }

      if (!copyExistingYear) {
        setCopyError('กรุณาเลือกปีที่ต้องการเพิ่มข้อมูล');
        return;
      }

      try {
        setCopying(true);
        const targetYear = copyExistingYear;
        if (activeSubTab === 'rates') {
          await adminAPI.copyPublicationRewardRates(selectedYear, targetYear);
        } else {
          await adminAPI.copyRewardConfigs(selectedYear, targetYear);
        }
        await Swal.fire('สำเร็จ', `คัดลอก ${copyTargetLabel} ไปยังปี ${targetYear} เรียบร้อย`, 'success');
        await loadAvailableYears();
        setSelectedYear(String(targetYear));
        setCopyModalOpen(false);
      } catch (error) {
        Swal.fire('Error', error?.response?.data?.message || 'ไม่สามารถคัดลอกข้อมูลได้', 'error');
      } finally {
        setCopying(false);
      }

      return;
    }

    const targetYear = (copyNewYear || '').trim();
    if (!targetYear) {
      setCopyError('กรุณาระบุปี');
      return;
    }
    if (!/^\d{4}$/.test(targetYear)) {
      setCopyError('กรุณาระบุปีในรูปแบบ พ.ศ. 4 หลัก');
      return;
    }
    if (parseInt(targetYear, 10) < 2500) {
      setCopyError('ปีต้องมากกว่า 2500');
      return;
    }
    if (targetYear === String(selectedYear)) {
      setCopyError('กรุณาระบุปีที่แตกต่างจากปีต้นทาง');
      return;
    }
    if (existingYearNumbers.includes(Number(targetYear))) {
      setCopyError('ปีนี้มีข้อมูลอยู่แล้ว กรุณาเลือกตัวเลือก "เพิ่มไปยังปีที่มีอยู่"');
      return;
    }

    try {
      setCopying(true);
      if (activeSubTab === 'rates') {
        await adminAPI.copyPublicationRewardRates(selectedYear, targetYear);
      } else {
        await adminAPI.copyRewardConfigs(selectedYear, targetYear);
      }
      await Swal.fire('สำเร็จ', `คัดลอก ${copyTargetLabel} ไปยังปี ${targetYear} เรียบร้อย`, 'success');
      await loadAvailableYears();
      setSelectedYear(String(targetYear));
      setCopyModalOpen(false);
    } catch (error) {
      Swal.fire('Error', error?.response?.data?.message || 'ไม่สามารถคัดลอกข้อมูลได้', 'error');
    } finally {
      setCopying(false);
    }
  };

  return (
    <SettingsSectionCard
      icon={Trophy}
      iconBgClass="bg-amber-100"
      iconColorClass="text-amber-600"
      title="จัดการเงินรางวัลการตีพิมพ์"
      description="กำหนดอัตราเงินรางวัลและวงเงินสนับสนุนค่าธรรมเนียม"
      actions={
        years.length > 0 ? (
          <button
            onClick={openCopyModal}
            disabled={!selectedYear || copying || loading || !hasCopyableData}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-200 px-4 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Copy size={16} />
            {copying ? `กำลังก็อป ${copyTargetLabel}...` : 'คัดลอกไปยังปีอื่น'}
          </button>
        ) : null
      }
      contentClassName="space-y-5"
    >
      <div className="flex items-center gap-3">
        <label className="text-sm font-semibold text-gray-700">ปีงบประมาณ:</label>
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
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 ml-auto"
            >
              <PlusCircle size={16} />
              เพิ่มอัตราใหม่
            </button>
          </div>

          <div className="overflow-x-auto border border-gray-300 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">
                    <button
                      className="inline-flex items-center justify-center gap-1 hover:text-blue-600"
                      onClick={() => toggleSort('rates', 'author_status')}
                    >
                      สถานะผู้ประพันธ์ {sortIcon(rateSort, 'author_status')}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">
                    <button
                      className="inline-flex items-center justify-center gap-1 hover:text-blue-600"
                      onClick={() => toggleSort('rates', 'journal_quartile')}
                    >
                      Quartile {sortIcon(rateSort, 'journal_quartile')}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">
                    <button
                      className="inline-flex items-center justify-center gap-1 hover:text-blue-600"
                      onClick={() => toggleSort('rates', 'reward_amount')}
                    >
                      จำนวนเงินรางวัล {sortIcon(rateSort, 'reward_amount')}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">
                    <button
                      className="inline-flex items-center gap-1 justify-center hover:text-blue-600"
                      onClick={() => toggleSort('rates', 'is_active')}
                    >
                      สถานะ {sortIcon(rateSort, 'is_active')}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">จัดการ</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {sortedRates.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                      ไม่พบอัตราเงินรางวัลสำหรับปี พ.ศ. {selectedYear}
                    </td>
                  </tr>
                ) : (
                  sortedRates.map((rate) => (
                    <tr key={rate.rate_id}>
                      <td className="px-3 py-3 text-center text-sm font-medium text-gray-900 whitespace-nowrap">
                        {authorLabel(rate.author_status)}
                      </td>
                      <td className="px-3 py-3 text-center text-sm text-gray-700 whitespace-nowrap">
                        {quartileOptions.find(q => q.value === rate.journal_quartile)?.label || rate.journal_quartile}
                      </td>
                      <td className="px-3 py-3 text-center text-sm font-semibold text-gray-900 whitespace-nowrap">
                        {new Intl.NumberFormat('th-TH').format(rate.reward_amount)} บาท
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-center">
                        <StatusBadge
                          status={!!rate.is_active}
                          interactive
                          confirm={false}
                          onChange={() => toggleStatus(rate.rate_id, rate.is_active, 'rate')}
                        />
                      </td>
                      <td className="flex justify-center gap-2 px-3 py-3 whitespace-nowrap text-sm font-medium">
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
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50"
                          title="แก้ไข"
                        >
                          <Edit size={16} /> แก้ไข
                        </button>
                        <button
                          onClick={() => deleteItem(rate.rate_id, 'rate')}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
                          title="ลบ"
                        >
                          <Trash2 size={16} /> ลบ
                        </button>
                      </td>
                    </tr>
                  ))
                )}
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
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 ml-auto"
            >
              <PlusCircle size={16} />
              เพิ่มการกำหนดค่าใหม่
            </button>
          </div>

          <div className="overflow-x-auto border border-gray-300 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">
                    <button
                      className="inline-flex items-center justify-center gap-1 hover:text-blue-600"
                      onClick={() => toggleSort('configs', 'journal_quartile')}
                    >
                      Quartile {sortIcon(configSort, 'journal_quartile')}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">
                    <button
                      className="inline-flex items-center justify-center gap-1 hover:text-blue-600"
                      onClick={() => toggleSort('configs', 'max_amount')}
                    >
                      วงเงินสูงสุด {sortIcon(configSort, 'max_amount')}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">
                    <button
                      className="inline-flex items-center justify-center gap-1 hover:text-blue-600"
                      onClick={() => toggleSort('configs', 'condition_description')}
                    >
                      เงื่อนไข/หมายเหตุ {sortIcon(configSort, 'condition_description')}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">
                    <button
                      className="inline-flex items-center gap-1 justify-center hover:text-blue-600"
                      onClick={() => toggleSort('configs', 'is_active')}
                    >
                      สถานะ {sortIcon(configSort, 'is_active')}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">จัดการ</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {sortedConfigs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                      ไม่พบวงเงินค่าธรรมเนียมสำหรับปี พ.ศ. {selectedYear}
                    </td>
                  </tr>
                ) : (
                  sortedConfigs.map((config) => (
                    <tr key={config.config_id}>
                      <td className="px-4 py-3 text-center text-sm font-medium text-gray-900 whitespace-nowrap">
                        {quartileOptions.find(q => q.value === config.journal_quartile)?.label || config.journal_quartile}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-semibold text-gray-900 whitespace-nowrap">
                        {config.max_amount > 0
                          ? `${new Intl.NumberFormat('th-TH').format(config.max_amount)} บาท`
                          : 'ไม่สนับสนุน'}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-700">
                        {config.condition_description || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <StatusBadge
                          status={!!config.is_active}
                          interactive
                          confirm={false}
                          onChange={() => toggleStatus(config.config_id, config.is_active, 'config')}
                        />
                      </td>
                      <td className="flex justify-center gap-2 px-3 py-3 whitespace-nowrap text-sm font-medium">
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
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50"
                          title="แก้ไข"
                        >
                          <Edit size={16} /> แก้ไข
                        </button>
                        <button
                          onClick={() => deleteItem(config.config_id, 'config')}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
                          title="ลบ"
                        >
                          <Trash2 size={16} /> ลบ
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <SettingsModal
        open={copyModalOpen}
        onClose={closeCopyModal}
        size="lg"
        bodyClassName="max-h-[75vh] overflow-y-auto px-6 py-6"
        footerClassName="flex items-center justify-end gap-3 px-6 py-4"
        headerContent={
          <div className="flex items-center gap-3 text-gray-700">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <Copy size={18} />
            </span>
            <div>
              <p className="text-base font-semibold text-gray-900">คัดลอก {copyTargetLabel}</p>
              <p className="text-sm text-gray-500">นำข้อมูลจากปี {selectedYear || '-'} ไปยังปีใหม่หรือปีที่มีอยู่</p>
            </div>
          </div>
        }
      >
        <form onSubmit={handleCopySubmit} className="space-y-5">
          <div className="space-y-4">
            <div
              className={`rounded-xl border p-4 transition ${
                copyMode === 'new' ? 'border-blue-200 bg-blue-50/60' : 'border-gray-200'
              }`}
            >
              <label className="flex items-start gap-3">
                <input
                  type="radio"
                  name="reward-copy-mode"
                  value="new"
                  checked={copyMode === 'new'}
                  onChange={() => setCopyMode('new')}
                  className="mt-1"
                />
                <div className="space-y-1">
                  <p className="font-medium text-gray-900">คัดลอกไปปีใหม่</p>
                  <p className="text-sm text-gray-600">ระบบจะสร้างข้อมูลปีใหม่ตามปีที่ระบุ</p>
                </div>
              </label>
              <input
                type="number"
                value={copyNewYear}
                onChange={(event) => setCopyNewYear(event.target.value)}
                placeholder="เช่น 2569"
                className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
                disabled={copyMode !== 'new'}
              />
            </div>

            <div
              className={`rounded-xl border p-4 transition ${
                copyMode === 'existing' ? 'border-blue-200 bg-blue-50/60' : 'border-gray-200'
              } ${!hasExistingTargets ? 'opacity-60' : ''}`}
            >
              <label className="flex items-start gap-3">
                <input
                  type="radio"
                  name="reward-copy-mode"
                  value="existing"
                  checked={copyMode === 'existing'}
                  onChange={() => setCopyMode('existing')}
                  className="mt-1"
                  disabled={!hasExistingTargets}
                />
                <div className="space-y-1">
                  <p className="font-medium text-gray-900">เพิ่มไปยังปีที่มีอยู่</p>
                  <p className="text-sm text-gray-600">เพิ่มหรือแทนที่ข้อมูลในปีที่เลือก</p>
                </div>
              </label>
              <select
                value={copyExistingYear}
                onChange={(event) => setCopyExistingYear(event.target.value)}
                className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
                disabled={!hasExistingTargets || copyMode !== 'existing'}
              >
                <option value="">เลือกปีปลายทาง</option>
                {existingTargetYears.map((year) => (
                  <option key={year} value={year}>
                    พ.ศ. {year}
                  </option>
                ))}
              </select>
              {!hasExistingTargets ? (
                <p className="mt-2 text-sm text-gray-500">ยังไม่มีปีปลายทางให้เลือก</p>
              ) : null}
            </div>
          </div>

          {copyError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{copyError}</div>
          ) : null}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={closeCopyModal}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={copying}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Copy size={16} />
              {copying ? `กำลังก็อป ${copyTargetLabel}...` : 'คัดลอก'}
            </button>
          </div>
        </form>
      </SettingsModal>

      <SettingsModal
        open={showRateForm}
        onClose={closeRateForm}
        size="md"
        bodyClassName="max-h-[70vh] overflow-y-auto px-6 py-6"
        headerContent={
          <div className="flex items-center gap-3 text-gray-700">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <Trophy size={18} />
            </span>
            <div>
              <p className="text-base font-semibold text-gray-900">
                {editingRate ? "แก้ไขอัตราเงินรางวัล" : "เพิ่มอัตราเงินรางวัล"}
              </p>
              <p className="text-sm text-gray-500">กำหนดสถานะผู้ประพันธ์และอัตราเงินรางวัลตาม Quartile</p>
            </div>
          </div>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveRate();
          }}
          className="space-y-4"
        >
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">สถานะผู้ประพันธ์</label>
            <select
              value={rateFormData.author_status}
              onChange={(e) => setRateFormData({ ...rateFormData, author_status: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">เลือกสถานะ</option>
              {authorStatusOptions.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Journal Quartile</label>
            <select
              value={rateFormData.journal_quartile}
              onChange={(e) => setRateFormData({ ...rateFormData, journal_quartile: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">เลือก Quartile</option>
              {quartileOptions.map((q) => (
                <option key={q.value} value={q.value}>
                  {q.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">จำนวนเงินรางวัล (บาท)</label>
            <input
              type="number"
              value={rateFormData.reward_amount}
              onChange={(e) => setRateFormData({ ...rateFormData, reward_amount: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
              min="0"
              step="1000"
              placeholder="เช่น 50000"
            />
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={closeRateForm}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              <Save size={16} />
              บันทึก
            </button>
          </div>
        </form>
      </SettingsModal>

      <SettingsModal
        open={showConfigForm}
        onClose={closeConfigForm}
        size="md"
        bodyClassName="max-h-[70vh] overflow-y-auto px-6 py-6"
        headerContent={
          <div className="flex items-center gap-3 text-gray-700">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <Trophy size={18} />
            </span>
            <div>
              <p className="text-base font-semibold text-gray-900">
                {editingConfig ? "แก้ไขวงเงินค่าธรรมเนียม" : "เพิ่มวงเงินค่าธรรมเนียม"}
              </p>
              <p className="text-sm text-gray-500">ปรับเงื่อนไขและวงเงินสนับสนุนค่าธรรมเนียมตาม Quartile</p>
            </div>
          </div>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveConfig();
          }}
          className="space-y-4"
        >
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Journal Quartile</label>
            <select
              value={configFormData.journal_quartile}
              onChange={(e) => setConfigFormData({ ...configFormData, journal_quartile: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">เลือก Quartile</option>
              {quartileOptions.map((q) => (
                <option key={q.value} value={q.value}>
                  {q.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">วงเงินสูงสุด (บาท)</label>
            <input
              type="number"
              value={configFormData.max_amount}
              onChange={(e) => setConfigFormData({ ...configFormData, max_amount: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
              min="0"
              step="1000"
              placeholder="0 = ไม่สนับสนุนค่าธรรมเนียม"
            />
            <p className="mt-1 text-xs text-gray-500">ใส่ 0 หากไม่ต้องการสนับสนุนค่าธรรมเนียมสำหรับ Quartile นี้</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">เงื่อนไข/หมายเหตุ (ถ้ามี)</label>
            <textarea
              value={configFormData.condition_description}
              onChange={(e) => setConfigFormData({ ...configFormData, condition_description: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
              rows={3}
              placeholder="เช่น เงื่อนไขพิเศษสำหรับ Quartile นี้"
            />
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={closeConfigForm}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              <Save size={16} />
              บันทึก
            </button>
          </div>
        </form>
      </SettingsModal>
    </SettingsSectionCard>
  );
};

export default RewardConfigManager;