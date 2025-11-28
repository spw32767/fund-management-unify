"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Briefcase,
  RefreshCcw,
  Search,
  Paperclip,
  CalendarDays,
  Users,
  Layers,
  Wallet,
  Loader2,
  Info,
  User,
} from "lucide-react";
import PageLayout from "../common/PageLayout";
import Card from "../common/Card";
import EmptyState from "../common/EmptyState";
import LoadingSpinner from "../common/LoadingSpinner";
import projectAPI from "@/app/lib/project_api";
import { apiClient } from "@/app/lib/api";

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatCurrency = (amount) => {
  const numeric = Number(amount) || 0;
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 2,
  }).format(numeric);
};

const formatParticipants = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return "-";
  }
  return numeric.toLocaleString("th-TH");
};

const formatBeneficiaries = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return "-";
  }
  return numeric.toLocaleString("th-TH");
};

const formatFileSize = (size) => {
  const numeric = Number(size);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = numeric;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const precision = value >= 10 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
};

const getProjectTypeLabel = (project) => {
  return (
    project.type_name ||
    project.type?.name_th ||
    project.type?.name_en ||
    "-"
  );
};

const getBudgetPlanLabel = (project) => {
  const plan = project.budget_plan ?? project.plan;
  return (
    project.plan_name ||
    plan?.name_th ||
    plan?.name_en ||
    "-"
  );
};

const getMemberUser = (member) => member?.user ?? member?.User ?? null;

const buildMemberDisplayName = (member) => {
  const user = getMemberUser(member);
  if (!user || typeof user !== "object") {
    return "ไม่ระบุชื่อ";
  }

  const prefix = (user.prefix ?? user.Prefix ?? "").toString().trim();
  const firstName = (user.user_fname ?? user.UserFname ?? "").toString().trim();
  const lastName = (user.user_lname ?? user.UserLname ?? "").toString().trim();
  const baseName = [firstName, lastName].filter(Boolean).join(" ").trim();

  if (prefix && baseName) {
    return `${prefix}${baseName}`;
  }
  if (prefix) {
    return prefix;
  }
  if (baseName) {
    return baseName;
  }

  const email = (user.email ?? user.Email ?? "").toString().trim();
  return email || "ไม่ระบุชื่อ";
};

const joinBaseWithPath = (base, path) => {
  if (!path) {
    return null;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedBase = typeof base === "string" ? base.replace(/\/+$/, "") : "";
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (!normalizedBase) {
    return normalizedPath;
  }

  return `${normalizedBase}${normalizedPath}`;
};

const buildAttachmentEndpoint = (project, attachment) => {
  if (!attachment) {
    return null;
  }

  const downloadPath =
    attachment.download_url ??
    attachment.downloadUrl ??
    null;

  if (typeof downloadPath === "string" && downloadPath.trim() !== "") {
    return downloadPath.trim();
  }

  const fileId =
    attachment.file_id ??
    attachment.fileId ??
    attachment.FileID ??
    null;

  const projectId =
    project?.project_id ??
    project?.projectId ??
    project?.ProjectID ??
    null;

  if (fileId != null && projectId != null) {
    return `/projects/${projectId}/attachments/${fileId}`;
  }

  return null;
};

const buildAttachmentUrl = (project, attachment) => {
  if (!attachment) {
    return null;
  }

  const endpoint = buildAttachmentEndpoint(project, attachment);
  if (endpoint) {
    const resolved = joinBaseWithPath(apiClient.baseURL, endpoint);
    if (resolved) {
      return resolved;
    }
  }

  const storedPath = typeof attachment.stored_path === "string"
    ? attachment.stored_path.trim()
    : "";

  if (storedPath) {
    if (/^https?:\/\//i.test(storedPath)) {
      return storedPath;
    }

    const normalizedStoredPath = storedPath.startsWith("/") ? storedPath : `/${storedPath}`;
    const uploadsPath = normalizedStoredPath.startsWith("/uploads/")
      ? normalizedStoredPath
      : `/uploads${normalizedStoredPath}`;
    const normalizedBase = typeof apiClient.baseURL === "string"
      ? apiClient.baseURL.replace(/\/+$/, "")
      : "";
    const baseWithoutApi = normalizedBase.replace(/\/api\/v1$/, "");
    const resolved = joinBaseWithPath(baseWithoutApi, uploadsPath);

    if (resolved) {
      console.warn("Project attachment missing file_id, deriving URL from stored_path", storedPath);
      return resolved;
    }
  }

  return null;
};

const SORT_FIELDS = [
  { id: "event_date", label: "วันที่จัดโครงการ" },
  { id: "project_name", label: "ชื่อโครงการ" },
  { id: "budget_amount", label: "งบประมาณโครงการ" },
  { id: "participants", label: "จำนวนผู้เข้าร่วม" },
  { id: "beneficiaries_count", label: "หน่วยงาน/ชุมชนที่ได้รับประโยชน์" },
];

const SORT_DIRECTIONS = [
  { id: "desc", label: "มาก → น้อย" },
  { id: "asc", label: "น้อย → มาก" },
];

export default function ProjectsList() {
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [sortField, setSortField] = useState("event_date");
  const [sortDirection, setSortDirection] = useState("desc");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeAttachmentKey, setActiveAttachmentKey] = useState(null);
  const [attachmentError, setAttachmentError] = useState(null);
  const requestRef = useRef(0);

  useEffect(() => {
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProjects = async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    try {
      const { projects: projectList } = await projectAPI.getProjects();
      if (requestRef.current !== requestId) {
        return;
      }
      setProjects(projectList);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      if (requestRef.current !== requestId) {
        return;
      }
      console.error("Failed to load projects:", err);
      setError(err?.message || "ไม่สามารถโหลดข้อมูลโครงการได้");
    } finally {
      if (requestRef.current === requestId) {
        setLoading(false);
      }
    }
  };

  const handleRefresh = () => {
    loadProjects();
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch = normalizedSearch
        ? (project.project_name || "")
            .toLowerCase()
            .includes(normalizedSearch) ||
          getProjectTypeLabel(project).toLowerCase().includes(normalizedSearch) ||
          getBudgetPlanLabel(project).toLowerCase().includes(normalizedSearch)
        : true;

      if (!matchesSearch) {
        return false;
      }

      const matchesType =
        typeFilter === "all" || String(project.type_id) === String(typeFilter);

      if (!matchesType) {
        return false;
      }

      const matchesPlan =
        planFilter === "all" || String(project.plan_id) === String(planFilter);

      return matchesPlan;
    });
  }, [projects, normalizedSearch, typeFilter, planFilter]);

  const sortedProjects = useMemo(() => {
    const projectsToSort = [...filteredProjects];

    const directionMultiplier = sortDirection === "asc" ? 1 : -1;

    const getValue = (project) => {
      switch (sortField) {
        case "project_name":
          return (project.project_name || "").toLowerCase();
        case "budget_amount":
          return Number(project.budget_amount) || 0;
        case "participants":
          return Number(project.participants) || 0;
        case "beneficiaries_count":
          return Number(project.beneficiaries_count) || 0;
        case "event_date":
        default: {
          const date = project.event_date ? new Date(project.event_date) : null;
          return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
        }
      }
    };

    projectsToSort.sort((a, b) => {
      const aValue = getValue(a);
      const bValue = getValue(b);

      if (typeof aValue === "string" && typeof bValue === "string") {
        return aValue.localeCompare(bValue, "th-TH") * directionMultiplier;
      }

      if (aValue === bValue) {
        return 0;
      }

      return aValue > bValue ? directionMultiplier : -directionMultiplier;
    });

    return projectsToSort;
  }, [filteredProjects, sortField, sortDirection]);

  const typeOptions = useMemo(() => {
    const map = new Map();
    projects.forEach((project) => {
      if (project.type_id != null) {
        const id = String(project.type_id);
        if (!map.has(id)) {
          map.set(id, getProjectTypeLabel(project));
        }
      }
    });
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [projects]);

  const planOptions = useMemo(() => {
    const map = new Map();
    projects.forEach((project) => {
      if (project.plan_id != null) {
        const id = String(project.plan_id);
        if (!map.has(id)) {
          map.set(id, getBudgetPlanLabel(project));
        }
      }
    });
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [projects]);

  const showInitialLoading = loading && projects.length === 0 && !error;

  const createAttachmentKey = (project, attachment, index) => {
    const projectKey = project?.project_id ?? project?.projectId ?? "project";
    const attachmentKey =
      attachment?.file_id ??
      attachment?.fileId ??
      attachment?.stored_path ??
      attachment?.storedPath ??
      `attachment-${index}`;
    return `${projectKey}:${attachmentKey}`;
  };

  const handleOpenAttachment = async (project, attachment, index) => {
    if (!attachment) {
      return;
    }

    const key = createAttachmentKey(project, attachment, index);
    setActiveAttachmentKey(key);
    setAttachmentError(null);

    const endpoint = buildAttachmentEndpoint(project, attachment);
    const resolvedUrl = buildAttachmentUrl(project, attachment);

    if (!resolvedUrl) {
      setActiveAttachmentKey(null);
      setAttachmentError("ไม่พบข้อมูลไฟล์แนบสำหรับเปิดดู");
      return;
    }

    const isRelativeEndpoint =
      typeof endpoint === "string" && endpoint.trim() !== "" && !/^https?:\/\//i.test(endpoint);

    try {
      if (typeof window === "undefined") {
        return;
      }

      if (isRelativeEndpoint) {
        const token = apiClient.getToken?.();

        if (!token) {
          throw new Error("ไม่พบข้อมูลการเข้าสู่ระบบ กรุณาเข้าสู่ระบบใหม่อีกครั้ง");
        }

        const requestUrl = joinBaseWithPath(apiClient.baseURL, endpoint);
        const response = await fetch(requestUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          let message = "ไม่สามารถเปิดไฟล์แนบได้ กรุณาลองใหม่อีกครั้ง";
          try {
            const data = await response.json();
            if (data?.error) {
              message = data.error;
            } else if (data?.message) {
              message = data.message;
            } else if (data?.code) {
              message = data.code;
            }
          } catch (parseError) {
            // ignore JSON parse errors and use default message
          }

          if (message === "MISSING_AUTH_HEADER" || message === "Authorization header is required") {
            message = "ไม่พบข้อมูลการเข้าสู่ระบบ กรุณาเข้าสู่ระบบใหม่อีกครั้ง";
          }

          if (response.status === 401) {
            message = "สิทธิ์การเข้าถึงหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง";
          }

          throw new Error(message);
        }

        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        window.open(blobUrl, "_blank", "noopener,noreferrer");
        window.setTimeout(() => {
          window.URL.revokeObjectURL(blobUrl);
        }, 120000);
        return;
      }

      window.open(resolvedUrl, "_blank", "noopener,noreferrer");
    } catch (openError) {
      console.error("Failed to open project attachment", openError);
      setAttachmentError(
        openError?.message || "ไม่สามารถเปิดไฟล์แนบได้ กรุณาลองใหม่อีกครั้ง"
      );

      if (resolvedUrl && !isRelativeEndpoint && typeof window !== "undefined") {
        window.open(resolvedUrl, "_blank", "noopener,noreferrer");
      }
    } finally {
      setActiveAttachmentKey(null);
    }
  };

  return (
    <PageLayout
      title="โครงการ"
      subtitle="ติดตามข้อมูลโครงการที่จัดโดยกองทุนวิจัยและนวัตกรรม"
      icon={Briefcase}
      breadcrumbs={[
        { label: "หน้าแรก", href: "/member" },
        { label: "โครงการ" },
      ]}
    >
      {showInitialLoading ? (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="py-16 flex flex-col items-center gap-3 text-center">
            <LoadingSpinner size="large" />
            <p className="text-sm text-gray-500">กำลังโหลดข้อมูลโครงการ...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white shadow-sm rounded-lg p-5 border border-gray-200">
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
              <div className="relative w-full lg:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="ค้นหาโครงการตามชื่อ ประเภท หรือแผนงบประมาณ"
                  className="w-full border border-gray-300 rounded-md py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex flex-col lg:flex-row gap-3 w-full xl:w-auto">
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <select
                    value={typeFilter}
                    onChange={(event) => setTypeFilter(event.target.value)}
                    className="border border-gray-300 rounded-md py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">ทุกประเภทโครงการ</option>
                    {typeOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={planFilter}
                    onChange={(event) => setPlanFilter(event.target.value)}
                    className="border border-gray-300 rounded-md py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">ทุกแผนงบประมาณ</option>
                    {planOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                  <select
                    value={sortField}
                    onChange={(event) => setSortField(event.target.value)}
                    className="border border-gray-300 rounded-md py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {SORT_FIELDS.map((option) => (
                      <option key={option.id} value={option.id}>
                        เรียงตาม {option.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={sortDirection}
                    onChange={(event) => setSortDirection(event.target.value)}
                    className="border border-gray-300 rounded-md py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {SORT_DIRECTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleRefresh}
                  className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md px-4 py-2.5 transition-colors"
                >
                  <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
                  รีเฟรช
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <p className="text-sm text-gray-600">
                แสดง {filteredProjects.length.toLocaleString("th-TH")} จาก {projects.length.toLocaleString("th-TH")} โครงการ
              </p>
              {lastUpdated && (
                <p className="text-sm text-gray-500">
                  อัปเดตล่าสุด {lastUpdated.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              )}
          </div>
        </div>

        {attachmentError && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {attachmentError}
          </div>
        )}

        {error && projects.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="ไม่สามารถโหลดข้อมูลได้"
            message={error}
            action={
              <button
                type="button"
                onClick={handleRefresh}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
              >
                <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
                ลองใหม่อีกครั้ง
              </button>
            }
            variant="bordered"
          />
          ) : filteredProjects.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title={projects.length === 0 ? "ยังไม่มีข้อมูลโครงการ" : "ไม่พบโครงการที่ตรงกับเงื่อนไข"}
              message={
                projects.length === 0
                  ? "กรุณาติดต่อผู้ดูแลระบบเพื่อเพิ่มข้อมูลโครงการ"
                  : "ลองปรับการค้นหาหรือเลือกตัวกรองอื่น"
              }
              variant="bordered"
            />
          ) : (
            <div className="space-y-4">
              {loading && (
                <div className="bg-white rounded-lg border border-blue-100">
                  <LoadingSpinner size="small" />
                </div>
              )}
              {sortedProjects.map((project) => {
                const attachments = Array.isArray(project.attachments)
                  ? project.attachments
                  : [];
                const members = Array.isArray(project.members)
                  ? project.members
                  : [];

                return (
                  <Card
                    key={project.project_id ?? project.project_name}
                    defaultCollapsed
                    bodyClassName="space-y-6"
                    title={
                      <span className="flex flex-col items-start gap-1 text-left">
                        <span>{project.project_name || "ไม่พบชื่อโครงการ"}</span>
                        <span className="text-sm font-normal text-gray-500">
                          {formatDate(project.event_date)} · {getProjectTypeLabel(project)}
                        </span>
                      </span>
                    }
                  >
                    <div className="grid gap-5 md:grid-cols-2">
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="p-2 rounded-full bg-blue-50 text-blue-600">
                            <Layers size={18} />
                            </div>
                            <div>
                            <p className="text-sm text-gray-500">ประเภทโครงการ</p>
                            <p className="text-base font-medium text-gray-900">{getProjectTypeLabel(project)}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="p-2 rounded-full bg-emerald-50 text-emerald-600">
                            <Wallet size={18} />
                            </div>
                            <div>
                            <p className="text-sm text-gray-500">แผนงบประมาณ</p>
                            <p className="text-base font-medium text-gray-900">{getBudgetPlanLabel(project)}</p>
                            <p className="text-sm text-gray-600 mt-1">งบประมาณ {formatCurrency(project.budget_amount)}</p>
                            </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="p-2 rounded-full bg-amber-50 text-amber-600">
                            <CalendarDays size={18} />
                            </div>
                            <div>
                            <p className="text-sm text-gray-500">วันที่จัดโครงการ</p>
                            <p className="text-base font-medium text-gray-900">{formatDate(project.event_date)}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="p-2 rounded-full bg-purple-50 text-purple-600">
                            <Users size={18} />
                            </div>
                            <div>
                            <p className="text-sm text-gray-500">จำนวนผู้เข้าร่วม</p>
                            <p className="text-base font-medium text-gray-900">{formatParticipants(project.participants)}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="p-2 rounded-full bg-indigo-50 text-indigo-600">
                            <Users size={18} />
                            </div>
                            <div>
                            <p className="text-sm text-gray-500">หน่วยงาน/ชุมชนที่ได้รับประโยชน์</p>
                            <p className="text-base font-medium text-gray-900">{formatBeneficiaries(project.beneficiaries_count)}</p>
                            </div>
                        </div>
                      </div>
                    </div>

                    {project.notes && (
                        <div className="mt-6">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <Info size={18} className="text-blue-500" />
                            รายละเอียดเพิ่มเติม
                        </h4>
                        <p className="text-gray-700 whitespace-pre-line leading-relaxed">{project.notes}</p>
                        </div>
                    )}

                    <div className="mt-6">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <User size={18} className="text-gray-500" />
                        ผู้ร่วมโครงการ
                      </h4>
                      {members.length ? (
                        <ul className="space-y-3">
                          {members.map((member) => {
                            const memberId =
                              member?.member_id ??
                              member?.MemberID ??
                              `${project.project_id ?? "project"}-${
                                member?.user_id ?? member?.UserID ?? Math.random().toString(36).slice(2)
                              }`;
                            const duty = member?.duty ?? member?.Duty ?? "-";
                            const notesValue = member?.notes ?? member?.Notes ?? "";

                            return (
                              <li
                                key={memberId}
                                className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white/80 px-3 py-3 md:flex-row md:items-center md:justify-between"
                              >
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {buildMemberDisplayName(member)}
                                  </p>
                                  <p className="text-sm text-gray-600"> หน้าที่: {duty}</p>
                                  {notesValue ? (
                                    <p className="text-xs text-gray-500 mt-1 whitespace-pre-line">
                                      หมายเหตุ: {notesValue}
                                    </p>
                                  ) : null}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-500 italic">
                          ยังไม่มีการบันทึกผู้ร่วมโครงการ
                        </p>
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <Paperclip size={18} className="text-gray-500" />
                        ไฟล์แนบโครงการ
                      </h4>
                      {attachments.length ? (
                        <ul className="space-y-2">
                          {attachments.map((attachment, index) => {
                            const url = buildAttachmentUrl(project, attachment);
                            const sizeLabel = formatFileSize(attachment.file_size);
                            const attachmentKey = createAttachmentKey(project, attachment, index);
                            const displayName = attachment.original_name || "ไฟล์แนบ";
                            const isOpening = activeAttachmentKey === attachmentKey;

                            if (url) {
                              return (
                                <li key={attachmentKey}>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenAttachment(project, attachment, index)}
                                    disabled={isOpening}
                                    className="flex w-full items-center justify-between gap-3 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800 transition hover:border-blue-200 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-70"
                                  >
                                    <span className="font-medium text-left">
                                      {displayName}
                                    </span>
                                    <span className="flex items-center gap-2 text-xs text-blue-700">
                                      {sizeLabel && <span>{sizeLabel}</span>}
                                      {isOpening ? (
                                        <span className="inline-flex items-center gap-1 font-semibold">
                                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                          <span>กำลังเปิด...</span>
                                        </span>
                                      ) : (
                                        <span className="font-semibold">เปิดไฟล์</span>
                                      )}
                                    </span>
                                  </button>
                                </li>
                              );
                            }

                            return (
                              <li key={attachmentKey} className="flex items-center justify-between gap-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                                <span>{displayName}</span>
                                {sizeLabel && <span className="text-xs text-gray-500">{sizeLabel}</span>}
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-500 italic">
                          ยังไม่มีไฟล์แนบที่เผยแพร่สำหรับโครงการนี้
                        </p>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </PageLayout>
  );
}