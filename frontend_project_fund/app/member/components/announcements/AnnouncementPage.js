// app/teacher/components/announcements/AnnouncementPage.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Eye, Download, Bell, BookOpen, CalendarClock } from "lucide-react";
import apiClient, { announcementAPI, fundFormAPI, systemAPI } from "../../../lib/api";
import { systemConfigAPI } from "../../../lib/system_config_api";
import { fundInstallmentAPI } from "../../../lib/fund_installment_api";
import DataTable from "../../../admin/components/common/DataTable";
import PageLayout from "../common/PageLayout";

const parseISODate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatThaiDate = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "ยังไม่กำหนด";
  }

  return date.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const formatInstallmentNumber = (value) => {
  if (value === null || value === undefined) {
    return "-";
  }

  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return String(value);
  }

  return numeric.toLocaleString("th-TH");
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const getCountdownLabel = (targetDate, referenceDate) => {
  if (!(targetDate instanceof Date) || Number.isNaN(targetDate.getTime())) {
    return null;
  }

  const reference =
    referenceDate instanceof Date && !Number.isNaN(referenceDate.getTime())
      ? referenceDate
      : new Date();

  const diffMs = targetDate.getTime() - reference.getTime();

  if (diffMs > 0) {
    if (diffMs < DAY_IN_MS) {
      return "ภายในวันนี้";
    }

    const diffDays = Math.ceil(diffMs / DAY_IN_MS);
    return `เหลืออีก ${diffDays.toLocaleString("th-TH")} วัน`;
  }

  if (Math.abs(diffMs) < DAY_IN_MS) {
    return "ครบกำหนดวันนี้";
  }

  const diffDays = Math.ceil(Math.abs(diffMs) / DAY_IN_MS);
  return `ผ่านไปแล้ว ${diffDays.toLocaleString("th-TH")} วัน`;
};

const getInstallmentKey = (period) => {
  if (!period || typeof period !== "object") {
    return null;
  }

  const raw = period.raw ?? {};
  const candidates = [
    raw.installment_period_id,
    raw.InstallmentPeriodID,
    raw.id,
    raw.ID,
    period.installmentPeriodId,
    period.installment_period_id,
  ];

  for (const candidate of candidates) {
    if (candidate != null && candidate !== "") {
      return String(candidate);
    }
  }

  const cutoffValid =
    period.cutoffDate instanceof Date && !Number.isNaN(period.cutoffDate.getTime())
      ? period.cutoffDate.getTime()
      : null;
  const installmentLabel =
    period.installmentNumber != null ? String(period.installmentNumber) : null;

  if (cutoffValid != null && installmentLabel != null) {
    return `${installmentLabel}-${cutoffValid}`;
  }

  if (cutoffValid != null) {
    return `cutoff-${cutoffValid}`;
  }

  if (installmentLabel != null) {
    return `installment-${installmentLabel}`;
  }

  return null;
};

export default function AnnouncementPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [filteredAnnouncements, setFilteredAnnouncements] = useState([]);
  const [fundForms, setFundForms] = useState([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [loadingForms, setLoadingForms] = useState(true);
  const [systemConfigAnnouncementIds, setSystemConfigAnnouncementIds] = useState([]);
  const [announcementVisibilityFilter, setAnnouncementVisibilityFilter] = useState("current");
  const [selectedYearId, setSelectedYearId] = useState("all");
  const [selectedFormYearId, setSelectedFormYearId] = useState("all");
  const [years, setYears] = useState([]);
  const [yearsLoading, setYearsLoading] = useState(false);
  const [currentYearLabel, setCurrentYearLabel] = useState(null);
  const [installmentPeriods, setInstallmentPeriods] = useState([]);
  const [systemNow, setSystemNow] = useState(null);
  const [loadingInstallments, setLoadingInstallments] = useState(true);

  useEffect(() => {
    loadAnnouncements();
    loadFundForms();
    loadSystemConfig();
    loadYears();
    loadInstallmentPeriods();
  }, []);

  const loadAnnouncements = async () => {
    try {
      setLoadingAnnouncements(true);
      const response = await announcementAPI.getAnnouncements({ active_only: true });
      if (response.success) {
        const normalizedAnnouncements = (response.data || []).map((item) => {
          const yearLabel =
            item?.year?.year ??
            item?.Year?.year ??
            item?.year ??
            item?.Year ??
            null;

          const yearId =
            item?.year?.year_id ??
            item?.Year?.year_id ??
            item?.year_id ??
            item?.YearId ??
            null;

          return {
            ...item,
            year: yearLabel ?? null,
            year_id: yearId ?? null,
          };
        });
        setAnnouncements(normalizedAnnouncements);
      } else {
        setAnnouncements([]);
      }
    } catch (error) {
      console.error('Error loading announcements:', error);
      setAnnouncements([]);
    } finally {
      setLoadingAnnouncements(false);
    }
  };

  const loadFundForms = async () => {
    try {
      setLoadingForms(true);
      const response = await fundFormAPI.getFundForms({ active_only: true });
      if (response.success) {
        const normalizedFundForms = (response.data || []).map((item) => {
          const yearLabel =
            item?.year?.year ??
            item?.Year?.year ??
            item?.year ??
            item?.Year ??
            null;

          const yearId =
            item?.year?.year_id ??
            item?.Year?.year_id ??
            item?.year_id ??
            item?.YearId ??
            null;

          return {
            ...item,
            year: yearLabel ?? null,
            year_id: yearId != null ? String(yearId) : null,
          };
        });

        setFundForms(normalizedFundForms);
      } else {
        setFundForms([]);
      }
    } catch (error) {
      console.error('Error loading fund forms:', error);
      // ใช้ mock data เมื่อเกิด error
      setFundForms([]);
    } finally {
      setLoadingForms(false);
    }
  };

  const loadInstallmentPeriods = async () => {
    try {
      setLoadingInstallments(true);
      const periods = await fundInstallmentAPI.list();
      if (Array.isArray(periods)) {
        setInstallmentPeriods(periods);
      } else {
        setInstallmentPeriods([]);
      }
    } catch (error) {
      console.error("Error loading installment periods:", error);
      setInstallmentPeriods([]);
    } finally {
      setLoadingInstallments(false);
    }
  };

  const loadSystemConfig = async () => {
    try {
      const rawConfig = await systemConfigAPI.getWindow();
      const normalized = systemConfigAPI.normalizeWindow(rawConfig);

      const candidateKeys = [
        "main_annoucement",
        "main_announcement",
        "main_ann_id",
        "reward_annoucement",
        "reward_announcement",
        "reward_ann_id",
        "activity_support_annoucement",
        "activity_support_announcement",
        "activity_support_ann_id",
        "conference_annoucement",
        "conference_announcement",
        "conference_ann_id",
        "service_annoucement",
        "service_announcement",
        "service_ann_id",
      ];

      const configIds = new Set();

      candidateKeys.forEach((key) => {
        const value = normalized?.[key];
        if (value != null && value !== "") {
          configIds.add(String(value));
        }
      });

      const slotWindows = ["main", "reward", "activity_support", "conference", "service"];
      slotWindows.forEach((slot) => {
        const slotId = normalized?.[`${slot}_window`]?.id ?? null;
        if (slotId != null && slotId !== "") {
          configIds.add(String(slotId));
        }
      });

      setSystemConfigAnnouncementIds(Array.from(configIds));

      const nowISO = normalized?.now ?? new Date().toISOString();
      setSystemNow(nowISO);

      const normalizedCurrentYear =
        normalized?.current_year != null && normalized.current_year !== ""
          ? String(normalized.current_year)
          : null;

      if (normalizedCurrentYear != null) {
        setCurrentYearLabel((prev) => prev ?? normalizedCurrentYear);
      }
    } catch (error) {
      console.error("Error loading system config:", error);
      setSystemConfigAnnouncementIds([]);
      setSystemNow(null);
    }
  };

  const loadYears = async () => {
    setYearsLoading(true);
    try {
      const [yearsResponse, currentYearResponse] = await Promise.all([
        systemAPI.getYears().catch((error) => {
          console.error("Error fetching years list:", error);
          return null;
        }),
        systemConfigAPI.getCurrentYear().catch((error) => {
          console.error("Error fetching current year:", error);
          return null;
        }),
      ]);

      const rawYears = Array.isArray(yearsResponse?.years)
        ? yearsResponse.years
        : Array.isArray(yearsResponse?.data)
        ? yearsResponse.data
        : Array.isArray(yearsResponse)
        ? yearsResponse
        : [];

      const normalizedYears = rawYears
        .map((year) => ({
          year_id:
            year?.year_id != null
              ? String(year.year_id)
              : year?.YearID != null
              ? String(year.YearID)
              : year?.id != null
              ? String(year.id)
              : null,
          year:
            year?.year != null
              ? String(year.year)
              : year?.Year != null
              ? String(year.Year)
              : null,
        }))
        .filter((year) => year.year_id && year.year);

      setYears(normalizedYears);

      const defaultYearCandidate =
        currentYearResponse?.current_year ??
        currentYearResponse?.data?.current_year ??
        currentYearResponse?.year ??
        null;

      const normalizedDefaultYear =
        defaultYearCandidate != null && defaultYearCandidate !== ""
          ? String(defaultYearCandidate)
          : null;

      if (normalizedDefaultYear != null) {
        setCurrentYearLabel((prev) => prev ?? normalizedDefaultYear);

        const matchingYear = normalizedYears.find(
          (year) => String(year.year) === normalizedDefaultYear
        );

        if (matchingYear?.year_id != null) {
          const matchingYearId = String(matchingYear.year_id);
          setSelectedYearId((prev) => (prev === "all" ? matchingYearId : prev));
          setSelectedFormYearId((prev) => (prev === "all" ? matchingYearId : prev));
        }
      }
    } catch (error) {
      console.error("Error loading years:", error);
      setYears([]);
    } finally {
      setYearsLoading(false);
    }
  };

  useEffect(() => {
    if (!currentYearLabel || (selectedYearId !== "all" && selectedFormYearId !== "all")) {
      return;
    }

    if (!Array.isArray(years) || years.length === 0) {
      return;
    }

    const normalizedLabel = String(currentYearLabel);
    const matchedYear = years.find((year) => String(year.year) === normalizedLabel);

    if (matchedYear?.year_id != null) {
      const matchedYearId = String(matchedYear.year_id);
      setSelectedYearId((prev) => (prev === "all" ? matchedYearId : prev));
      setSelectedFormYearId((prev) => (prev === "all" ? matchedYearId : prev));
    }
  }, [years, currentYearLabel, selectedYearId, selectedFormYearId]);

  const handleViewFile = (filePath) => {
    if (!filePath) return;
    const baseUrl = apiClient.baseURL.replace(/\/?api\/v1$/, '');
    const url = new URL(filePath, baseUrl).href;
    window.open(url, '_blank');
  };

  const handleDownloadFile = async (filePath) => {
    if (!filePath) return;
    const baseUrl = apiClient.baseURL.replace(/\/?api\/v1$/, '');
    const url = new URL(filePath, baseUrl).href;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filePath.split('/').pop() || 'file';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const extractAnnouncementId = (item) => {
    if (!item || typeof item !== "object") return null;

    const candidates = [
      item.announcement_id,
      item.announcementId,
      item.id,
      item.AnnouncementID,
      item.announcement?.id,
      item.announcement?.announcement_id,
    ];

    for (const candidate of candidates) {
      if (candidate != null && candidate !== "") {
        return String(candidate);
      }
    }

    return null;
  };

  const systemNowDate = useMemo(() => {
    const parsed = parseISODate(systemNow);
    if (!parsed || Number.isNaN(parsed.getTime())) {
      return new Date();
    }
    return parsed;
  }, [systemNow]);

  const yearLabelMap = useMemo(() => {
    const map = new Map();
    if (!Array.isArray(years)) {
      return map;
    }

    years.forEach((year) => {
      if (!year) return;
      const idCandidate =
        year.year_id ?? year.YearID ?? year.id ?? year.yearId ?? null;
      const labelCandidate = year.year ?? year.Year ?? null;
      if (idCandidate != null && labelCandidate != null) {
        map.set(String(idCandidate), String(labelCandidate));
      }
    });

    return map;
  }, [years]);

  const activeInstallmentYearId = useMemo(() => {
    if (selectedYearId && selectedYearId !== "all") {
      return String(selectedYearId);
    }

    if (currentYearLabel != null) {
      const matchedYear = Array.isArray(years)
        ? years.find((year) => String(year.year) === String(currentYearLabel))
        : null;
      if (matchedYear?.year_id != null) {
        return String(matchedYear.year_id);
      }
    }

    return null;
  }, [selectedYearId, currentYearLabel, years]);

  const normalizedInstallments = useMemo(() => {
    if (!Array.isArray(installmentPeriods)) {
      return [];
    }

    return installmentPeriods.filter((period) => {
      if (!period) return false;
      const cutoff = period.cutoffDate;
      return cutoff instanceof Date && !Number.isNaN(cutoff.getTime());
    });
  }, [installmentPeriods]);

  const filteredInstallments = useMemo(() => {
    if (!activeInstallmentYearId) {
      return normalizedInstallments;
    }

    return normalizedInstallments.filter((period) => {
      if (period.yearId == null) {
        return true;
      }

      return String(period.yearId) === activeInstallmentYearId;
    });
  }, [normalizedInstallments, activeInstallmentYearId]);

  const sortedInstallments = useMemo(() => {
    const items = [...filteredInstallments];
    items.sort((a, b) => a.cutoffDate.getTime() - b.cutoffDate.getTime());
    return items;
  }, [filteredInstallments]);

  const upcomingInstallments = useMemo(() => {
    const nowTime = systemNowDate.getTime();
    return sortedInstallments.filter((period) => period.cutoffDate.getTime() >= nowTime);
  }, [sortedInstallments, systemNowDate]);

  const nextInstallment = upcomingInstallments[0] ?? null;
  const latestPastInstallment =
    !nextInstallment && sortedInstallments.length > 0
      ? sortedInstallments[sortedInstallments.length - 1]
      : null;

  const nextInstallmentDisplay = useMemo(() => {
    if (!nextInstallment) {
      return null;
    }

    const yearLabel =
      nextInstallment.yearId != null
        ? yearLabelMap.get(String(nextInstallment.yearId)) ?? null
        : null;

    return {
      installmentNumber: nextInstallment.installmentNumber,
      cutoffLabel: formatThaiDate(nextInstallment.cutoffDate),
      yearLabel,
      countdownLabel: getCountdownLabel(nextInstallment.cutoffDate, systemNowDate),
      status: nextInstallment.status ?? null,
    };
  }, [nextInstallment, yearLabelMap, systemNowDate]);

  const latestPastInstallmentDisplay = useMemo(() => {
    if (!latestPastInstallment) {
      return null;
    }

    const yearLabel =
      latestPastInstallment.yearId != null
        ? yearLabelMap.get(String(latestPastInstallment.yearId)) ?? null
        : null;

    return {
      installmentNumber: latestPastInstallment.installmentNumber,
      cutoffLabel: formatThaiDate(latestPastInstallment.cutoffDate),
      yearLabel,
      countdownLabel: getCountdownLabel(latestPastInstallment.cutoffDate, systemNowDate),
    };
  }, [latestPastInstallment, yearLabelMap, systemNowDate]);

  useEffect(() => {
    const configIdSet = new Set(systemConfigAnnouncementIds.map(String));

    const shouldFilterByYear =
      announcementVisibilityFilter === "all" && selectedYearId !== "all";

    const filtered = announcements.filter((announcement) => {
      const announcementId = extractAnnouncementId(announcement);

      const matchesCurrent =
        announcementVisibilityFilter === "current"
          ? announcementId != null && configIdSet.has(String(announcementId))
          : true;

      if (!matchesCurrent) {
        return false;
      }

      if (!shouldFilterByYear) {
        return true;
      }

      const candidateYearIds = [
        announcement?.year_id,
        announcement?.YearId,
        announcement?.year?.year_id,
        announcement?.Year?.year_id,
      ]
        .map((value) => (value != null && value !== "" ? String(value) : null))
        .filter(Boolean);

      if (candidateYearIds.length === 0) {
        return false;
      }

      return candidateYearIds.some((yearId) => yearId === selectedYearId);
    });

    setFilteredAnnouncements(filtered);
  }, [
    announcements,
    announcementVisibilityFilter,
    selectedYearId,
    systemConfigAnnouncementIds,
  ]);

  const filteredFundForms = useMemo(() => {
    if (selectedFormYearId === "all") {
      return fundForms;
    }

    return fundForms.filter((form) => {
      const candidateYearIds = [
        form?.year_id,
        form?.YearId,
        form?.year?.year_id,
        form?.Year?.year_id,
      ]
        .map((value) => (value != null && value !== "" ? String(value) : null))
        .filter(Boolean);

      if (candidateYearIds.length === 0) {
        return false;
      }

      return candidateYearIds.some((yearId) => yearId === selectedFormYearId);
    });
  }, [fundForms, selectedFormYearId]);

  const sortedYears = useMemo(() => {
    const yearsCopy = Array.isArray(years) ? [...years] : [];
    return yearsCopy.sort((a, b) => {
      const aYear = Number(a.year);
      const bYear = Number(b.year);

      if (Number.isNaN(aYear) || Number.isNaN(bYear)) {
        return String(b.year).localeCompare(String(a.year));
      }

      return bYear - aYear;
    });
  }, [years]);

  const getAnnouncementTypeColor = (type) => {
    switch (type) {
      case 'research_fund':
        return 'bg-blue-100 text-blue-800';
      case 'promotion_fund':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAnnouncementTypeName = (type) => {
    switch (type) {
      case 'research_fund':
        return 'ทุนวิจัย';
      case 'promotion_fund':
        return 'ทุนกิจกรรม';
      default:
        return 'ทั่วไป';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getPriorityName = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'ด่วน';
      case 'high':
        return 'สำคัญ';
      default:
        return 'ปกติ';
    }
  };

  const announcementColumns = [
    {
      header: "ชื่อไฟล์",
      accessor: "file_name",
      className: "font-medium",
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">{row.title}</div>
        </div>
      )
    },
    {
      header: "ปี",
      accessor: "year",
      render: (_, row) => <span className="text-gray-700">{row.year || '-'}</span>
    },
    {
      header: "หมวดหมู่กองทุน",
      accessor: "announcement_type",
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getAnnouncementTypeColor(value)}`}>
          {getAnnouncementTypeName(value)}
        </span>
      )
    },
    // {
    //   header: "ความสำคัญ",
    //   accessor: "priority",
    //   render: (value) => (
    //     <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(value)}`}>
    //       {getPriorityName(value)}
    //     </span>
    //   )
    // },
    {
      header: "รายละเอียด",
      accessor: "description",
      render: (value) => (
        <span
          className="text-gray-700 whitespace-pre-wrap break-words max-h-24 overflow-auto"
          title={value || "-"}
        >
          {value || "-"}
        </span>
      )
    },
    {
      header: "ดูไฟล์/ดาวน์โหลด",
      accessor: "actions",
      render: (_, row) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleViewFile(row.file_path)}
            className="inline-flex items-center gap-1 px-3 py-1 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
            title="ดูไฟล์"
          >
            <Eye size={16} />
            ดู
          </button>
          <button
            onClick={() => handleDownloadFile(row.file_path)}
            className="inline-flex items-center gap-1 px-3 py-1 text-sm text-green-600 bg-green-50 hover:bg-green-100 rounded-md transition-colors"
            title="ดาวน์โหลดไฟล์"
          >
            <Download size={16} />
            ดาวน์โหลด
          </button>
        </div>
      )
    }
  ];

  const fundFormColumns = [
    {
      header: "ชื่อไฟล์",
      accessor: "file_name",
      className: "font-medium",
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">{row.title}</div>
        </div>
      )
    },
    {
      header: "ปี",
      accessor: "year",
      render: (_, row) => <span className="text-gray-700">{row.year || '-'}</span>
    },
    {
      header: "ประเภทฟอร์ม",
      accessor: "form_type",
      render: (value) => {
        const typeNames = {
          application: 'แบบฟอร์มสมัคร',
          report: 'แบบฟอร์มรายงาน',
          evaluation: 'แบบฟอร์มประเมิน',
          guidelines: 'แนวทางปฏิบัติ',
          other: 'อื่นๆ'
        };
        return (
          <span className="inline-flex px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
            {typeNames[value] || value}
          </span>
        );
      }
    },
    {
      header: "หมวดหมู่กองทุน",
      accessor: "fund_category",
      render: (value) => {
        const categoryNames = {
          research_fund: 'ทุนวิจัย',
          promotion_fund: 'ทุนกิจกรรม',
          both: 'ทั้งสองประเภท'
        };
        const colors = {
          research_fund: 'bg-blue-100 text-blue-800',
          promotion_fund: 'bg-green-100 text-green-800',
          both: 'bg-gray-100 text-gray-800'
        };
        return (
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${colors[value] || colors.both}`}>
            {categoryNames[value] || value}
          </span>
        );
      }
    },
    {
      header: "รายละเอียด",
      accessor: "description",
      render: (value) => (
        <span
          className="text-gray-700 whitespace-pre-wrap break-words max-h-24 overflow-auto"
          title={value || "-"}
        >
          {value || "-"}
        </span>
      )
    },
    {
      header: "ดูไฟล์/ดาวน์โหลด",
      accessor: "actions",
      render: (_, row) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleViewFile(row.file_path)}
            className="inline-flex items-center gap-1 px-3 py-1 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
            title="ดูไฟล์"
          >
            <Eye size={16} />
            ดู
          </button>
          <button
            onClick={() => handleDownloadFile(row.file_path)}
            className="inline-flex items-center gap-1 px-3 py-1 text-sm text-green-600 bg-green-50 hover:bg-green-100 rounded-md transition-colors"
            title="ดาวน์โหลดไฟล์"
          >
            <Download size={16} />
            ดาวน์โหลด
          </button>
        </div>
      )
    }
  ];

  return (
    <PageLayout
      title="ประกาศกองทุนวิจัยและนวัตกรรม"
      subtitle="ดูประกาศ รอบการพิจารณา และแบบฟอร์มที่เกี่ยวข้องกับการขอทุน"
      icon={Bell}
      breadcrumbs={[
        { label: "หน้าแรก", href: "/member" },
        { label: "ประกาศ" },
      ]}
    >
      <div className="space-y-8">
        {/* Announcements Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bell size={20} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">ประกาศ</h2>
                <p className="text-sm text-gray-600">ข่าวสารและประกาศจากกองทุน</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="mb-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label htmlFor="announcement-visibility-filter" className="text-sm font-medium text-gray-700">
                  แสดง
                </label>
                <select
                  id="announcement-visibility-filter"
                  value={announcementVisibilityFilter}
                  onChange={(event) => setAnnouncementVisibilityFilter(event.target.value)}
                  className="block rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="current">ประกาศปัจจุบัน</option>
                  <option value="all">ทั้งหมด</option>
                </select>
              </div>

              {announcementVisibilityFilter === "all" && (
                <div className="flex items-center gap-2">
                  <label htmlFor="announcement-year-filter" className="text-sm font-medium text-gray-700">
                    ปี
                  </label>
                  <select
                    id="announcement-year-filter"
                    value={selectedYearId}
                    onChange={(event) => setSelectedYearId(event.target.value)}
                    disabled={yearsLoading}
                    className="block rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
                  >
                    <option value="all">ทั้งหมด</option>
                    {sortedYears.map((year) => (
                      <option key={year.year_id} value={year.year_id}>
                        {year.year}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {loadingAnnouncements ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <span className="ml-2 text-gray-600">กำลังโหลด...</span>
              </div>
            ) : (
              <DataTable
                columns={announcementColumns}
                data={filteredAnnouncements}
                emptyMessage="ไม่มีประกาศในขณะนี้"
              />
            )}
          </div>
        </div>

        {/* Evaluation Windows Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <CalendarClock size={20} className="text-indigo-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">รอบการพิจารณา</h2>
                <p className="text-sm text-gray-600">
                  รอบการพิจารณาขอทุนส่งเสริมการวิจัยและนวัตกรรม และทุนอุดหนุนกิจกรรม
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {loadingInstallments ? (
              <div className="flex items-center justify-center py-8 text-gray-600">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <span className="ml-2">กำลังโหลด...</span>
              </div>
            ) : nextInstallmentDisplay ? (
              <div className="space-y-6">
                <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-5 shadow-sm">
                  <p className="text-sm font-medium text-indigo-700">รอบถัดไป</p>
                  <div className="mt-2 space-y-2">
                    <p className="text-2xl font-semibold text-indigo-900">
                      รอบพิจารณาครั้งที่ {formatInstallmentNumber(nextInstallmentDisplay.installmentNumber)}
                    </p>
                    <p className="text-lg text-indigo-800">{nextInstallmentDisplay.cutoffLabel}</p>
                    {nextInstallmentDisplay.yearLabel ? (
                      <p className="text-sm text-indigo-700">
                        ปีงบประมาณ {nextInstallmentDisplay.yearLabel}
                      </p>
                    ) : null}
                    {nextInstallmentDisplay.countdownLabel ? (
                      <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-medium text-indigo-700 shadow-sm">
                        {nextInstallmentDisplay.countdownLabel}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : latestPastInstallmentDisplay ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-800">
                <p className="text-base font-semibold">ยังไม่มีรอบถัดไปในระบบ</p>
                <p className="mt-2 text-sm">
                  รอบล่าสุดที่บันทึกคือรอบที่ {formatInstallmentNumber(latestPastInstallmentDisplay.installmentNumber)}
                  {" "}
                  เมื่อวันที่ {latestPastInstallmentDisplay.cutoffLabel}
                  {latestPastInstallmentDisplay.yearLabel
                    ? ` (ปีงบประมาณ ${latestPastInstallmentDisplay.yearLabel})`
                    : ""}
                  .
                </p>
                {latestPastInstallmentDisplay.countdownLabel ? (
                  <p className="mt-2 text-sm">{latestPastInstallmentDisplay.countdownLabel}</p>
                ) : null}
              </div>
            ) : (
              <div className="py-10 text-center text-sm text-gray-500">
                ยังไม่มีข้อมูลงวดการพิจารณาในระบบ
              </div>
            )}
          </div>
        </div>

        {/* Fund Forms Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <BookOpen size={20} className="text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">แบบฟอร์มการขอทุน</h2>
                <p className="text-sm text-gray-600">แบบฟอร์มและเอกสารที่จำเป็น</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label htmlFor="fund-form-year-filter" className="text-sm font-medium text-gray-700">
                  ปี
                </label>
                <select
                  id="fund-form-year-filter"
                  value={selectedFormYearId}
                  onChange={(event) => setSelectedFormYearId(event.target.value)}
                  disabled={yearsLoading}
                  className="block rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:cursor-not-allowed disabled:bg-gray-100"
                >
                  <option value="all">ทั้งหมด</option>
                  {sortedYears.map((year) => (
                    <option key={year.year_id} value={year.year_id}>
                      {year.year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loadingForms ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
                <span className="ml-2 text-gray-600">กำลังโหลด...</span>
              </div>
            ) : (
              <DataTable
                columns={fundFormColumns}
                data={filteredFundForms}
                emptyMessage="ไม่มีแบบฟอร์มในขณะนี้"
              />
            )}
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FileText size={20} className="text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-blue-800 mb-2">คำแนะนำการใช้งาน</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• คลิก "ดู" เพื่อเปิดไฟล์ในหน้าต่างใหม่</li>
              <li>• คลิก "ดาวน์โหลด" เพื่อบันทึกไฟล์ลงเครื่องคอมพิวเตอร์</li>
              <li>• ตรวจสอบประกาศและแบบฟอร์มให้ล่าสุดก่อนยื่นคำร้อง</li>
              <li>• หากมีปัญหาการดาวน์โหลด กรุณาติดต่อผู้ดูแลระบบ</li>
            </ul>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
