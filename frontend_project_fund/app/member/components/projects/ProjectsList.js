"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Briefcase, RefreshCcw, Search, Paperclip } from "lucide-react";
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

const buildAttachmentUrl = (project, attachment) => {
  if (!attachment) {
    return null;
  }

  const storedPath = typeof attachment.stored_path === "string"
    ? attachment.stored_path.trim()
    : "";

  if (storedPath && /^https?:\/\//i.test(storedPath)) {
    return storedPath;
  }

  if (attachment.file_id && project?.project_id != null) {
    return `${apiClient.baseURL}/projects/${project.project_id}/attachments/${attachment.file_id}`;
  }

  if (storedPath) {
    console.warn("Project attachment missing file_id, falling back to stored_path", storedPath);
  }

  return null;
};

const SORT_FIELDS = [
  { id: "event_date", label: "วันที่จัดโครงการ" },
  { id: "project_name", label: "ชื่อโครงการ" },
  { id: "budget_amount", label: "งบประมาณโครงการ" },
  { id: "participants", label: "จำนวนผู้เข้าร่วม" },
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

  return (
    <PageLayout
      title="โครงการ"
      subtitle="ติดตามข้อมูลโครงการที่จัดโดยกองทุนวิจัยและนวัตกรรม"
      icon={Briefcase}
      loading={showInitialLoading}
    >
      {!showInitialLoading && (
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

                return (
                  <Card
                    key={project.project_id ?? project.project_name}
                    title={
                      <>
                        <span>{project.project_name || "ไม่พบชื่อโครงการ"}</span>
                        <span className="block text-sm font-normal text-gray-500">
                          {formatDate(project.event_date)} · {getProjectTypeLabel(project)}
                        </span>
                      </>
                    }
                    defaultCollapsed
                    bodyClassName="space-y-6"
                  >
                    <div className="grid gap-5 md:grid-cols-2">
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-gray-500">ประเภทโครงการ</p>
                          <p className="text-base font-medium text-gray-900">{getProjectTypeLabel(project)}</p>
                        </div>

                        <div>
                          <p className="text-sm text-gray-500">แผนงบประมาณ</p>
                          <p className="text-base font-medium text-gray-900">{getBudgetPlanLabel(project)}</p>
                          <p className="text-sm text-gray-600 mt-1">งบประมาณ {formatCurrency(project.budget_amount)}</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-gray-500">วันที่จัดโครงการ</p>
                          <p className="text-base font-medium text-gray-900">{formatDate(project.event_date)}</p>
                        </div>

                        <div>
                          <p className="text-sm text-gray-500">จำนวนผู้เข้าร่วม</p>
                          <p className="text-base font-medium text-gray-900">{formatParticipants(project.participants)}</p>
                        </div>
                      </div>
                    </div>

                    {project.notes && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">รายละเอียดเพิ่มเติม</h4>
                        <p className="text-gray-700 whitespace-pre-line leading-relaxed">{project.notes}</p>
                      </div>
                    )}

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
                            const key =
                              attachment.file_id ??
                              attachment.original_name ??
                              attachment.stored_path ??
                              `attachment-${index}`;

                            if (url) {
                              return (
                                <li key={key}>
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between gap-3 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800 transition hover:border-blue-200 hover:bg-blue-100"
                                  >
                                    <span className="font-medium">
                                      {attachment.original_name || "ไฟล์แนบ"}
                                    </span>
                                    <span className="flex items-center gap-2 text-xs text-blue-700">
                                      {sizeLabel && <span>{sizeLabel}</span>}
                                      <span className="font-semibold">เปิดไฟล์</span>
                                    </span>
                                  </a>
                                </li>
                              );
                            }

                            return (
                              <li key={key} className="flex items-center justify-between gap-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                                <span>{attachment.original_name || "ไฟล์แนบ"}</span>
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
