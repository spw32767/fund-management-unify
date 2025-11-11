"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  Layers,
  Wallet,
  Plus,
  Pencil,
  Trash2,
  RefreshCcw,
  CalendarDays,
  Users,
  FileText,
} from "lucide-react";
import Swal from "sweetalert2";
import PageLayout from "@/app/admin/components/common/PageLayout";
import adminAPI from "@/app/lib/admin_api";

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 2800,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  },
});

const initialProjectForm = {
  project_name: "",
  type_id: "",
  event_date: "",
  plan_id: "",
  budget_amount: "",
  participants: "",
  notes: "",
};

const initialTypeForm = {
  name_th: "",
  name_en: "",
  display_order: "",
  is_active: true,
};

const initialPlanForm = {
  name_th: "",
  name_en: "",
  display_order: "",
  is_active: true,
};

function formatCurrency(value) {
  const number = Number(value || 0);
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 2,
  }).format(number);
}

function formatDate(dateString) {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch (error) {
    return dateString;
  }
}

function ProjectsTable({ projects, onEdit, onDelete }) {
  if (!projects.length) {
    return (
      <div className="border border-dashed border-gray-300 rounded-lg p-10 text-center text-gray-500 bg-white">
        ยังไม่มีข้อมูลโครงการ
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white shadow-sm rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">ชื่อโครงการ</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">ประเภท</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">วันที่จัด</th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">งบประมาณ</th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">ผู้เข้าร่วม</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">หมายเหตุ</th>
            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">จัดการ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
          {projects.map((project) => (
            <tr key={project.project_id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3">
                <div className="font-semibold text-gray-900">{project.project_name}</div>
                <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                  <Wallet size={14} className="text-gray-400" />
                  {project.budget_plan?.name_th || project.budget_plan?.name_en || "-"}
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-1 text-gray-700">
                  <Layers size={15} className="text-blue-500" />
                  {project.type?.name_th || project.type?.name_en || "-"}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-1">
                  <CalendarDays size={15} className="text-amber-500" />
                  {formatDate(project.event_date)}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-medium text-gray-900">
                {formatCurrency(project.budget_amount)}
              </td>
              <td className="px-4 py-3 text-right">
                <span className="inline-flex items-center gap-1 justify-end">
                  <Users size={15} className="text-emerald-500" />
                  {typeof project.participants === "number"
                    ? project.participants.toLocaleString("th-TH")
                    : project.participants || "-"}
                </span>
              </td>
              <td className="px-4 py-3">
                {project.notes ? (
                  <span className="text-gray-600 line-clamp-2">{project.notes}</span>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td className="px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => onEdit(project)}
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                  >
                    <Pencil size={16} />
                    แก้ไข
                  </button>
                  <button
                    onClick={() => onDelete(project)}
                    className="inline-flex items-center gap-1 text-red-600 hover:text-red-700"
                  >
                    <Trash2 size={16} />
                    ลบ
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProjectForm({
  open,
  formData,
  types,
  plans,
  onClose,
  onChange,
  onSubmit,
  saving,
  isEditing,
}) {
  if (!open) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {isEditing ? "แก้ไขโครงการ" : "เพิ่มโครงการใหม่"}
          </h3>
          <p className="text-sm text-gray-500">
            กรอกข้อมูลให้ครบถ้วนตามฟิลด์ที่กำหนดไว้
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <RefreshCcw size={16} />
          ยกเลิก
        </button>
      </div>

      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ชื่อโครงการ
          </label>
          <input
            type="text"
            name="project_name"
            value={formData.project_name}
            onChange={onChange}
            required
            className="w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
            placeholder="ระบุชื่อโครงการ"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ประเภทโครงการ
          </label>
          <select
            name="type_id"
            value={formData.type_id}
            onChange={onChange}
            required
            className="w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
          >
            <option value="">-- เลือกประเภท --</option>
            {types.map((type) => (
              <option key={type.type_id} value={type.type_id}>
                {type.name_th || type.name_en}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            วันที่จัดกิจกรรม
          </label>
          <input
            type="date"
            name="event_date"
            value={formData.event_date}
            onChange={onChange}
            required
            className="w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            แผนงบประมาณ
          </label>
          <select
            name="plan_id"
            value={formData.plan_id}
            onChange={onChange}
            required
            className="w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
          >
            <option value="">-- เลือกแผนงบประมาณ --</option>
            {plans.map((plan) => (
              <option key={plan.plan_id} value={plan.plan_id}>
                {plan.name_th || plan.name_en}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            งบประมาณ (บาท)
          </label>
          <input
            type="number"
            name="budget_amount"
            value={formData.budget_amount}
            onChange={onChange}
            min="0"
            step="0.01"
            required
            className="w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
            placeholder="เช่น 50000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            จำนวนผู้เข้าร่วม (คน)
          </label>
          <input
            type="number"
            name="participants"
            value={formData.participants}
            onChange={onChange}
            min="0"
            className="w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
            placeholder="เช่น 120"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            หมายเหตุ / รายละเอียดเพิ่มเติม
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={onChange}
            rows={3}
            className="w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
            placeholder="ข้อมูลเพิ่มเติมที่ต้องการบันทึก"
          />
        </div>

        <div className="md:col-span-2 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <RefreshCcw size={16} className="animate-spin" />
                บันทึกข้อมูล...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Plus size={16} />
                {isEditing ? "อัปเดตข้อมูล" : "บันทึกโครงการ"}
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function ConfigList({
  title,
  description,
  icon: Icon,
  items,
  form,
  onFormChange,
  onSubmit,
  onCancel,
  editingItem,
  onEdit,
  saving,
  emptyText,
  disableDeleteNotice,
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Icon size={20} className="text-blue-600" />
            {title}
          </h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ชื่อ (ภาษาไทย)
          </label>
          <input
            type="text"
            name="name_th"
            value={form.name_th}
            onChange={onFormChange}
            required
            className="w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
            placeholder="ระบุชื่อภาษาไทย"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ชื่อ (ภาษาอังกฤษ)
          </label>
          <input
            type="text"
            name="name_en"
            value={form.name_en}
            onChange={onFormChange}
            className="w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
            placeholder="ระบุชื่อภาษาอังกฤษ (ถ้ามี)"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ลำดับแสดงผล
          </label>
          <input
            type="number"
            name="display_order"
            value={form.display_order}
            min="1"
            onChange={onFormChange}
            className="w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
            placeholder="เช่น 1"
          />
        </div>
        <div className="flex items-center gap-2 mt-6">
          <input
            type="checkbox"
            id={`${title}-is-active`}
            name="is_active"
            checked={form.is_active}
            onChange={(event) => {
              onFormChange({
                target: {
                  name: "is_active",
                  value: event.target.checked,
                  type: "checkbox",
                  checked: event.target.checked,
                },
              });
            }}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor={`${title}-is-active`} className="text-sm text-gray-700">
            ใช้งานอยู่
          </label>
        </div>
        <div className="md:col-span-4 flex justify-end gap-3">
          {editingItem && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100"
            >
              ยกเลิกการแก้ไข
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
          >
            {saving ? (
              <>
                <RefreshCcw size={16} className="animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              <>
                <Plus size={16} />
                {editingItem ? "อัปเดตข้อมูล" : "บันทึกข้อมูล"}
              </>
            )}
          </button>
        </div>
      </form>

      {disableDeleteNotice && (
        <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
          ไม่สามารถลบข้อมูลชุดนี้ได้ เพื่อรักษาลำดับรหัสให้ต่อเนื่อง
        </div>
      )}

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-500">
            {emptyText}
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id || item.type_id || item.plan_id}
              className="flex flex-wrap items-center justify-between gap-3 border border-gray-200 rounded-lg px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  {item.name_th || "-"}
                  <span className="text-xs text-gray-400 ml-2">ID: {item.type_id ?? item.plan_id}</span>
                </div>
                <div className="text-xs text-gray-500">{item.name_en || "ไม่มีชื่อภาษาอังกฤษ"}</div>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>ลำดับ: {item.display_order || "-"}</span>
                <span className={item.is_active ? "text-emerald-600" : "text-gray-400"}>
                  {item.is_active ? "ใช้งานอยู่" : "ปิดใช้งาน"}
                </span>
                <button
                  onClick={() => onEdit(item)}
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                >
                  <Pencil size={14} /> แก้ไข
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function ProjectsContent() {
  const [activeTab, setActiveTab] = useState("projects");
  const [loading, setLoading] = useState(true);
  const [savingProject, setSavingProject] = useState(false);
  const [savingType, setSavingType] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);

  const [projects, setProjects] = useState([]);
  const [projectTypes, setProjectTypes] = useState([]);
  const [budgetPlans, setBudgetPlans] = useState([]);

  const [projectForm, setProjectForm] = useState(initialProjectForm);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  const [typeForm, setTypeForm] = useState(initialTypeForm);
  const [editingType, setEditingType] = useState(null);

  const [planForm, setPlanForm] = useState(initialPlanForm);
  const [editingPlan, setEditingPlan] = useState(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [projectList, typeList, planList] = await Promise.all([
        adminAPI.getProjects(),
        adminAPI.getProjectTypes(),
        adminAPI.getProjectBudgetPlans(),
      ]);
      setProjects(projectList);
      setProjectTypes(typeList);
      setBudgetPlans(planList);
    } catch (error) {
      console.error(error);
      Toast.fire({ icon: "error", title: "ไม่สามารถโหลดข้อมูลได้" });
    } finally {
      setLoading(false);
    }
  };

  const resetProjectForm = () => {
    setProjectForm(initialProjectForm);
    setEditingProject(null);
    setShowProjectForm(false);
  };

  const handleProjectChange = (event) => {
    const { name, value } = event.target;
    setProjectForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmitProject = async (event) => {
    event.preventDefault();
    if (!projectForm.project_name || !projectForm.type_id || !projectForm.plan_id || !projectForm.event_date) {
      Toast.fire({ icon: "warning", title: "กรุณากรอกข้อมูลให้ครบถ้วน" });
      return;
    }

    const payload = {
      project_name: projectForm.project_name.trim(),
      type_id: Number(projectForm.type_id),
      event_date: projectForm.event_date,
      plan_id: Number(projectForm.plan_id),
      budget_amount: Number(projectForm.budget_amount) || 0,
      participants: projectForm.participants ? Number(projectForm.participants) : 0,
      notes: projectForm.notes ? projectForm.notes.trim() : "",
    };

    if (Number.isNaN(payload.type_id) || Number.isNaN(payload.plan_id)) {
      Toast.fire({ icon: "warning", title: "การเลือกประเภทหรือแผนงบประมาณไม่ถูกต้อง" });
      return;
    }

    if (payload.participants < 0) {
      Toast.fire({ icon: "warning", title: "จำนวนผู้เข้าร่วมต้องมากกว่าหรือเท่ากับ 0" });
      return;
    }

    try {
      setSavingProject(true);
      if (editingProject) {
        await adminAPI.updateProject(editingProject.project_id, payload);
        Toast.fire({ icon: "success", title: "อัปเดตข้อมูลโครงการเรียบร้อย" });
      } else {
        await adminAPI.createProject(payload);
        Toast.fire({ icon: "success", title: "บันทึกโครงการใหม่เรียบร้อย" });
      }
      await loadAll();
      resetProjectForm();
    } catch (error) {
      console.error(error);
      Toast.fire({ icon: "error", title: error.message || "บันทึกข้อมูลไม่สำเร็จ" });
    } finally {
      setSavingProject(false);
    }
  };

  const handleEditProject = (project) => {
    setEditingProject(project);
    setProjectForm({
      project_name: project.project_name || "",
      type_id: project.type_id?.toString() || "",
      event_date: project.event_date || "",
      plan_id: project.plan_id?.toString() || "",
      budget_amount: project.budget_amount?.toString() || "",
      participants: project.participants?.toString() || "",
      notes: project.notes || "",
    });
    setShowProjectForm(true);
  };

  const handleDeleteProject = async (project) => {
    const result = await Swal.fire({
      title: "ยืนยันการลบ",
      text: `ต้องการลบโครงการ "${project.project_name}" หรือไม่?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "ลบข้อมูล",
      cancelButtonText: "ยกเลิก",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      await adminAPI.deleteProject(project.project_id);
      Toast.fire({ icon: "success", title: "ลบโครงการเรียบร้อย" });
      await loadAll();
    } catch (error) {
      console.error(error);
      Toast.fire({ icon: "error", title: error.message || "ไม่สามารถลบโครงการได้" });
    }
  };

  const handleTypeFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    setTypeForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handlePlanFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    setPlanForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const submitTypeForm = async (event) => {
    event.preventDefault();
    if (!typeForm.name_th) {
      Toast.fire({ icon: "warning", title: "กรุณาระบุชื่อภาษาไทย" });
      return;
    }

    const payload = {
      name_th: typeForm.name_th.trim(),
      name_en: typeForm.name_en.trim(),
      display_order: typeForm.display_order ? Number(typeForm.display_order) : undefined,
      is_active: !!typeForm.is_active,
    };

    try {
      setSavingType(true);
      if (editingType) {
        await adminAPI.updateProjectType(editingType.type_id, payload);
        Toast.fire({ icon: "success", title: "อัปเดตประเภทโครงการแล้ว" });
      } else {
        await adminAPI.createProjectType(payload);
        Toast.fire({ icon: "success", title: "เพิ่มประเภทโครงการเรียบร้อย" });
      }
      await loadAll();
      setTypeForm(initialTypeForm);
      setEditingType(null);
    } catch (error) {
      console.error(error);
      Toast.fire({ icon: "error", title: error.message || "บันทึกประเภทไม่สำเร็จ" });
    } finally {
      setSavingType(false);
    }
  };

  const submitPlanForm = async (event) => {
    event.preventDefault();
    if (!planForm.name_th) {
      Toast.fire({ icon: "warning", title: "กรุณาระบุชื่อภาษาไทย" });
      return;
    }

    const payload = {
      name_th: planForm.name_th.trim(),
      name_en: planForm.name_en.trim(),
      display_order: planForm.display_order ? Number(planForm.display_order) : undefined,
      is_active: !!planForm.is_active,
    };

    try {
      setSavingPlan(true);
      if (editingPlan) {
        await adminAPI.updateProjectBudgetPlan(editingPlan.plan_id, payload);
        Toast.fire({ icon: "success", title: "อัปเดตแผนงบประมาณแล้ว" });
      } else {
        await adminAPI.createProjectBudgetPlan(payload);
        Toast.fire({ icon: "success", title: "เพิ่มแผนงบประมาณเรียบร้อย" });
      }
      await loadAll();
      setPlanForm(initialPlanForm);
      setEditingPlan(null);
    } catch (error) {
      console.error(error);
      Toast.fire({ icon: "error", title: error.message || "บันทึกแผนงบประมาณไม่สำเร็จ" });
    } finally {
      setSavingPlan(false);
    }
  };

  const tabItems = useMemo(() => ([
    { id: "projects", label: "รายการโครงการ", icon: Briefcase },
    { id: "types", label: "ประเภทโครงการ", icon: Layers },
    { id: "plans", label: "แผนงบประมาณ", icon: Wallet },
  ]), []);

  return (
    <PageLayout
      title="จัดการโครงการ"
      subtitle="สร้าง แก้ไข และติดตามข้อมูลโครงการ รวมถึงประเภทและแผนงบประมาณ"
      icon={Briefcase}
      loading={loading}
    >
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="border-b border-gray-200 px-6 pt-4">
          <nav className="-mb-px flex flex-wrap gap-4">
            {tabItems.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6 space-y-6 bg-gray-50">
          {activeTab === "projects" && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-gray-500 flex items-center gap-2">
                  <FileText size={16} className="text-blue-500" />
                  รายการทั้งหมด {projects.length} โครงการ
                </div>
                <button
                  onClick={() => {
                    setShowProjectForm(true);
                    setEditingProject(null);
                    setProjectForm(initialProjectForm);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus size={16} />
                  เพิ่มโครงการ
                </button>
              </div>

              <ProjectForm
                open={showProjectForm}
                formData={projectForm}
                types={projectTypes}
                plans={budgetPlans}
                onClose={resetProjectForm}
                onChange={handleProjectChange}
                onSubmit={handleSubmitProject}
                saving={savingProject}
                isEditing={!!editingProject}
              />

              <ProjectsTable
                projects={projects}
                onEdit={handleEditProject}
                onDelete={handleDeleteProject}
              />
            </>
          )}

          {activeTab === "types" && (
            <ConfigList
              title="ประเภทโครงการ"
              description="สร้างและแก้ไขชื่อประเภท โดยรหัสจะเรียงต่อเนื่องอัตโนมัติ"
              icon={Layers}
              items={projectTypes}
              form={typeForm}
              onFormChange={handleTypeFormChange}
              onSubmit={submitTypeForm}
              onCancel={() => {
                setTypeForm(initialTypeForm);
                setEditingType(null);
              }}
              editingItem={editingType}
              onEdit={(item) => {
                setEditingType(item);
                setTypeForm({
                  name_th: item.name_th || "",
                  name_en: item.name_en || "",
                  display_order: item.display_order?.toString() || "",
                  is_active: !!item.is_active,
                });
              }}
              saving={savingType}
              emptyText="ยังไม่มีประเภทโครงการ"
              disableDeleteNotice
            />
          )}

          {activeTab === "plans" && (
            <ConfigList
              title="แผนงบประมาณ"
              description="กำหนดแผนงบประมาณสำหรับอ้างอิงในการบันทึกโครงการ"
              icon={Wallet}
              items={budgetPlans}
              form={planForm}
              onFormChange={handlePlanFormChange}
              onSubmit={submitPlanForm}
              onCancel={() => {
                setPlanForm(initialPlanForm);
                setEditingPlan(null);
              }}
              editingItem={editingPlan}
              onEdit={(item) => {
                setEditingPlan(item);
                setPlanForm({
                  name_th: item.name_th || "",
                  name_en: item.name_en || "",
                  display_order: item.display_order?.toString() || "",
                  is_active: !!item.is_active,
                });
              }}
              saving={savingPlan}
              emptyText="ยังไม่มีแผนงบประมาณ"
              disableDeleteNotice
            />
          )}
        </div>
      </div>
    </PageLayout>
  );
}
