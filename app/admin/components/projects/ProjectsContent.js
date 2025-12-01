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
  Paperclip,
  Save,
  Loader2,
  UserPlus,
  UserCog,
} from "lucide-react";
import Swal from "sweetalert2";
import PageLayout from "@/app/admin/components/common/PageLayout";
import adminAPI from "@/app/lib/admin_api";
import apiClient from "@/app/lib/api";

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

const normalizeText = (value) =>
  (value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const initialProjectForm = {
  project_name: "",
  type_id: "",
  event_date: "",
  plan_id: "",
  budget_amount: "",
  participants: "",
  beneficiaries_count: "",
  notes: "",
  attachment: null,
};

const initialMemberForm = {
  user_id: "",
  duty: "",
  workload_hours: "",
  notes: "",
};

const MAX_BUDGET_AMOUNT = 9999999999.99;
const budgetAmountPattern = /^(?:\d{1,10})(?:\.\d{1,2})?$/;
const workloadInputPattern = /^\d*(?:\.\d{0,2})?$/;

const normalizeBudgetInputValue = (rawValue) => {
  if (rawValue === null || rawValue === undefined) {
    return "";
  }

  const stringValue = rawValue.toString();
  if (stringValue === "") {
    return "";
  }

  const cleaned = stringValue.replace(/[^0-9.]/g, "");
  if (cleaned === "") {
    return "";
  }

  const firstDotIndex = cleaned.indexOf(".");
  const hasDot = firstDotIndex !== -1;
  const hasTrailingDot =
    hasDot && (stringValue.endsWith(".") || cleaned.endsWith("."));

  let integerPart = hasDot ? cleaned.slice(0, firstDotIndex) : cleaned;
  let decimalRaw = hasDot
    ? cleaned.slice(firstDotIndex + 1).replace(/\./g, "")
    : "";

  if (integerPart === "" && hasDot) {
    integerPart = "0";
  }

  if (integerPart !== "") {
    const stripped = integerPart.replace(/^0+(?=\d)/, "");
    integerPart = stripped.length > 0 ? stripped : "0";
  }

  integerPart = integerPart.slice(0, 10);
  decimalRaw = decimalRaw.slice(0, 2);

  if (integerPart === "" && decimalRaw.length === 0 && !hasTrailingDot) {
    return "";
  }

  const integerOutput = integerPart === "" ? "0" : integerPart;

  if (decimalRaw.length > 0) {
    return `${integerOutput}.${decimalRaw}`;
  }

  if (hasTrailingDot) {
    return `${integerOutput}.`;
  }

  return integerPart;
};

const formatWorkloadHours = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "0 ชม.";
  }

  const fractionDigits = Number.isInteger(numeric) ? 0 : 2;
  return `${numeric.toLocaleString("th-TH", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: 2,
  })} ชม.`;
};

const buildUserDisplayName = (user) => {
  if (!user || typeof user !== "object") {
    return "-";
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
  return email || "-";
};

const getUserPositionLabel = (user) => {
  if (!user || typeof user !== "object") {
    return "";
  }

  return (
    (user.manage_position ?? user.ManagePosition ?? "").toString().trim() ||
    (user.position_title ?? user.PositionTitle ?? "").toString().trim() ||
    (user.position?.position_name ??
      user.Position?.position_name ??
      user.Position?.PositionName ??
      "").toString().trim()
  );
};

const normalizeWorkloadInputValue = (rawValue) => {
  if (rawValue === null || rawValue === undefined) {
    return "";
  }

  const stringValue = rawValue.toString();
  if (stringValue === "") {
    return "";
  }

  const cleaned = stringValue.replace(/[^0-9.]/g, "");
  if (cleaned === "") {
    return "";
  }

  const firstDotIndex = cleaned.indexOf(".");
  if (firstDotIndex === -1) {
    return cleaned;
  }

  const integerPart = cleaned.slice(0, firstDotIndex) || "0";
  const decimalRaw = cleaned.slice(firstDotIndex + 1).replace(/\./g, "");
  const decimalPart = decimalRaw.slice(0, 2);
  const hasTrailingDot = stringValue.endsWith(".");

  if (decimalPart.length === 0 && hasTrailingDot) {
    return `${integerPart}.`;
  }

  if (decimalPart.length === 0) {
    return integerPart;
  }

  return `${integerPart}.${decimalPart}`;
};

const normalizeProjectMemberCandidate = (user) => {
  if (!user || typeof user !== "object") {
    return null;
  }

  const rawId = user.user_id ?? user.UserID;
  const parsedId = Number(rawId);
  if (!Number.isFinite(parsedId) || parsedId <= 0) {
    return null;
  }

  const prefix = (user.prefix ?? user.Prefix ?? "").toString().trim();
  const firstName = (user.user_fname ?? user.UserFname ?? "").toString().trim();
  const lastName = (user.user_lname ?? user.UserLname ?? "").toString().trim();
  const baseName = [firstName, lastName].filter(Boolean).join(" ").trim();
  const displayName = prefix && baseName ? `${prefix}${baseName}` : prefix || baseName || `${parsedId}`;

  const managePosition = (user.manage_position ?? user.ManagePosition ?? "").toString().trim();
  const positionTitle =
    (user.position_title ?? user.PositionTitle ?? "").toString().trim() ||
    (user.position_en ?? user.PositionEn ?? "").toString().trim() ||
    (user.position?.position_name ??
      user.Position?.position_name ??
      user.Position?.PositionName ??
      "").toString().trim();

  return {
    user_id: parsedId,
    prefix,
    user_fname: firstName,
    user_lname: lastName,
    email: (user.email ?? user.Email ?? "").toString(),
    role_id: Number(user.role_id ?? user.RoleID ?? 0) || 0,
    manage_position: managePosition,
    position_title: positionTitle,
    role: user.role ?? user.Role ?? null,
    position: user.position ?? user.Position ?? null,
    display_name: displayName,
  };
};

const getMemberUser = (member) => member?.user ?? member?.User ?? null;

const getMemberUserId = (member) => {
  const directId = Number(member?.user_id ?? member?.UserID);
  if (Number.isFinite(directId) && directId > 0) {
    return directId;
  }

  const nested = getMemberUser(member);
  const nestedId = Number(nested?.user_id ?? nested?.UserID);
  return Number.isFinite(nestedId) && nestedId > 0 ? nestedId : null;
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
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">ประเภทโครงการ</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">วันที่จัด</th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">งบประมาณ</th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">ผู้เข้าร่วม</th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">หน่วยงาน/ชุมชนที่ได้รับประโยชน์</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">หมายเหตุ</th>
            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">จัดการ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
          {projects.map((project) => (
            <tr key={project.project_id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3">
                <div
                  className="font-semibold text-gray-900 max-w-xs truncate"
                  title={project.project_name}
                >
                  {project.project_name}
                </div>
                <div
                  className="text-xs text-gray-500 flex items-center gap-1 mt-1 max-w-xs min-w-0"
                  title={
                    project.budget_plan?.name_th ||
                    project.budget_plan?.name_en ||
                    "-"
                  }
                >
                  <Wallet size={14} className="text-gray-400 shrink-0" />
                  <span className="truncate">
                    {project.budget_plan?.name_th || project.budget_plan?.name_en || "-"}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3">
                <div
                  className="flex items-center gap-1 text-gray-700 max-w-[250px] min-w-0"
                  title={project.type?.name_th || project.type?.name_en || "-"}
                >
                  <Layers size={15} className="text-blue-500 shrink-0" />
                  <span className="truncate">
                    {project.type?.name_th || project.type?.name_en || "-"}
                  </span>
                </div>
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
              <td className="px-4 py-3 text-right">
                <span className="inline-flex items-center gap-1 justify-end">
                  <Users size={15} className="text-indigo-500" />
                  {typeof project.beneficiaries_count === "number"
                    ? project.beneficiaries_count.toLocaleString("th-TH")
                    : project.beneficiaries_count || "-"}
                </span>
              </td>
              <td className="px-4 py-3">
                {project.notes ? (
                  <span
                    className="text-gray-600 max-w-[220px] truncate block"
                    title={project.notes}
                  >
                    {project.notes}
                  </span>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td className="px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-3">
                  {project.attachments?.length ? (
                    <a
                      href={buildAttachmentUrl(project.attachments[0])}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700"
                    >
                      <FileText size={16} />
                      ดูไฟล์
                    </a>
                  ) : null}
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

function ProjectFormMembersSection({
  memberOptions = [],
  allCandidates = [],
  form = initialMemberForm,
  members = [],
  onFormChange = () => {},
  onSubmit = () => {},
  onEdit = () => {},
  onRemove = () => {},
  onCancelEdit = () => {},
  editingIndex = null,
  disabled = false,
  loading = false,
  deleteLoadingIds = new Set(),
  saving = false,
}) {
  const totalWorkload = members.reduce((sum, member) => {
    const value = Number(member?.workload_hours ?? 0);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);

  const selectedCandidateId = Number(form?.user_id ?? 0);
  const selectedCandidate = Number.isFinite(selectedCandidateId)
    ? allCandidates.find((candidate) => candidate.user_id === selectedCandidateId)
    : null;

  const isEditing = typeof editingIndex === "number" && editingIndex >= 0;
  const disableAddButton =
    disabled || loading || saving || (!isEditing && memberOptions.length === 0);
  const highlightClass = isEditing
    ? "border-blue-400 bg-blue-50 ring-2 ring-blue-200"
    : "";
  const panelHighlightClass = isEditing
    ? "border-blue-300 bg-blue-50 ring-2 ring-blue-200"
    : "border-gray-200 bg-white";
  const deleteSet =
    deleteLoadingIds instanceof Set
      ? deleteLoadingIds
      : new Set(Array.isArray(deleteLoadingIds) ? deleteLoadingIds : []);
  const actionsDisabled = disabled || loading || saving;

  const handleChange = (field) => (event) => {
    onFormChange(field, event.target.value);
  };

  const resolveMemberCandidate = (member) => {
    if (!member) return null;
    if (member.candidate) return member.candidate;

    const memberId = Number(member.user_id);
    if (!Number.isFinite(memberId)) return null;
    return allCandidates.find((candidate) => candidate.user_id === memberId) || null;
  };

  return (
    <div className="md:col-span-2">
      <div
        className={`rounded-lg border shadow-sm ${panelHighlightClass}`}
      >
        <div className="flex flex-col gap-2 border-b border-gray-200 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <UserCog size={18} className="text-blue-600" />
              ผู้ร่วมโครงการ
            </h4>
            <p className="text-xs text-gray-500">
              เพิ่มรายชื่อบุคลากรเพื่อบันทึกพร้อมโครงการ ระบบจะจัดเรียงตามลำดับการเพิ่ม
            </p>
          </div>
          <div className="text-xs text-gray-500">
            รวมภาระงาน {formatWorkloadHours(totalWorkload)}
          </div>
        </div>

        <div className="px-4 py-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ผู้ร่วมโครงการ
              </label>
              <select
                name="user_id"
                value={form?.user_id ?? ""}
                onChange={handleChange("user_id")}
                disabled={disableAddButton}
                className={`w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 px-3 py-2 disabled:bg-gray-100 disabled:text-gray-400 ${highlightClass}`}
              >
                <option value="">เลือกบุคลากร</option>
                {memberOptions.map((candidate) => (
                  <option key={candidate.user_id} value={candidate.user_id}>
                    {candidate.display_name}
                    {candidate.position_title ? ` — ${candidate.position_title}` : ""}
                  </option>
                ))}
              </select>
              {!disabled && !loading && !saving && !isEditing && memberOptions.length === 0 ? (
                <p className="mt-1 text-xs text-amber-600">
                  {allCandidates.length === 0
                    ? "ยังไม่มีรายชื่อบุคลากรที่สามารถเลือกได้"
                    : "บุคลากรถูกเลือกครบแล้ว หากต้องการแก้ไขกรุณาลบหรือแก้ไขรายการเดิม"}
                </p>
              ) : null}
              {selectedCandidate?.position_title ? (
                <p className="mt-1 text-xs text-gray-500">
                  ตำแหน่ง: {selectedCandidate.position_title}
                </p>
              ) : null}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                หน้าที่ภายในโครงการ
              </label>
              <input
                type="text"
                name="duty"
                value={form?.duty ?? ""}
                onChange={handleChange("duty")}
                maxLength={255}
                placeholder="เช่น ผู้รับผิดชอบหลัก"
                disabled={disabled}
                className={`w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 px-3 py-2 disabled:bg-gray-100 disabled:text-gray-400 ${highlightClass}`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ภาระงาน (ชม.)
              </label>
              <input
                type="number"
                name="workload_hours"
                value={form?.workload_hours ?? ""}
                onChange={handleChange("workload_hours")}
                min="0"
                step="0.01"
                placeholder="เช่น 6"
                disabled={disabled}
                className={`w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 px-3 py-2 disabled:bg-gray-100 disabled:text-gray-400 ${highlightClass}`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                หมายเหตุ (ถ้ามี)
              </label>
              <input
                type="text"
                name="notes"
                value={form?.notes ?? ""}
                onChange={handleChange("notes")}
                maxLength={255}
                placeholder="รายละเอียดเพิ่มเติม"
                disabled={disabled}
                className={`w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 px-3 py-2 disabled:bg-gray-100 disabled:text-gray-400 ${highlightClass}`}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-gray-500">
              {isEditing
                ? "กำลังแก้ไขข้อมูลผู้ร่วมโครงการในฟอร์ม"
                : "สามารถเพิ่มได้หลายคนก่อนบันทึกโครงการ"}
            </div>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={onCancelEdit}
                    className="px-3 py-2 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={actionsDisabled}
                  >
                    ยกเลิกแก้ไข
                  </button>
                  <button
                    type="button"
                    onClick={onSubmit}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={actionsDisabled}
                  >
                    {saving ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        กำลังบันทึก...
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        บันทึกการแก้ไข
                      </>
                    )}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={disableAddButton}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      กำลังบันทึก...
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} />
                      เพิ่มผู้ร่วมโครงการ
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-600">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                กำลังโหลดผู้ร่วมโครงการ...
              </div>
            ) : members.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">
                ยังไม่มีผู้ร่วมโครงการในแบบฟอร์ม
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-xs font-semibold text-gray-600">
                  <tr>
                    <th className="px-4 py-3 text-left">ลำดับ</th>
                    <th className="px-4 py-3 text-left">ชื่อบุคลากร</th>
                    <th className="px-4 py-3 text-left">หน้าที่</th>
                    <th className="px-4 py-3 text-left">ภาระงาน</th>
                    <th className="px-4 py-3 text-left">หมายเหตุ</th>
                    <th className="px-4 py-3 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {members.map((member, index) => {
                    const snapshot = resolveMemberCandidate(member);
                    const name = snapshot?.display_name ?? `ผู้ใช้ #${member.user_id}`;
                    const position = snapshot?.position_title ?? "";
                    const workloadLabel = formatWorkloadHours(
                      member.workload_hours ?? 0
                    );
                    const notesValue = member.notes?.trim?.() ?? member.notes ?? "";
                    const isActive = isEditing && editingIndex === index;
                    const orderLabel =
                      member.display_order ?? member.DisplayOrder ?? index + 1;
                    const memberIdRaw =
                      member.member_id ?? member.MemberID ?? member.memberId;
                    const memberId = Number(memberIdRaw);
                    const isDeleting =
                      Number.isFinite(memberId) && deleteSet.has(memberId);

                    const rowKey =
                      Number.isFinite(memberId) && memberId > 0
                        ? `member-${memberId}`
                        : `${member.user_id}-${index}`;

                    return (
                      <tr
                        key={rowKey}
                        className={isActive ? "bg-blue-50" : "bg-white"}
                      >
                        <td className="px-4 py-3 text-gray-600">{orderLabel}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{name}</div>
                          {position ? (
                            <div className="text-xs text-gray-500 mt-1">{position}</div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{member.duty || "-"}</td>
                        <td className="px-4 py-3 text-gray-700">{workloadLabel}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {notesValue ? notesValue : <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => onEdit(index, member)}
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 disabled:opacity-60 disabled:cursor-not-allowed"
                              disabled={actionsDisabled}
                            >
                              <Pencil size={16} /> แก้ไข
                            </button>
                            <button
                              type="button"
                              onClick={() => onRemove(index, member)}
                              className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
                              disabled={actionsDisabled || isDeleting}
                            >
                              {isDeleting ? (
                                <>
                                  <Loader2 size={16} className="animate-spin" />
                                  กำลังลบ...
                                </>
                              ) : (
                                <>
                                  <Trash2 size={16} /> ลบ
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function buildAttachmentUrl(attachment) {
  if (!attachment) {
    return "#";
  }

  const storedPath =
    attachment.stored_path ||
    attachment.storedPath ||
    attachment.StoredPath ||
    "";
  if (!storedPath) {
    return "#";
  }

  const normalizedPath = storedPath.startsWith("/uploads/")
    ? storedPath
    : `/uploads/${storedPath.replace(/^\/+/, "")}`;

  const base = (apiClient?.baseURL || "").replace(/\/?api\/v1$/, "");
  const fallbackBase =
    base || (typeof window !== "undefined" ? window.location.origin : "");

  try {
    return fallbackBase
      ? new URL(normalizedPath, fallbackBase).href
      : normalizedPath;
  } catch (error) {
    if (fallbackBase) {
      return `${fallbackBase.replace(/\/$/, "")}${normalizedPath}`;
    }
    return normalizedPath;
  }
}

function ProjectForm({
  open,
  formData,
  types,
  plans,
  onClose,
  onChange,
  onFileChange,
  onClearAttachment,
  onSubmit,
  saving,
  isEditing,
  fileInputKey,
  attachmentFile,
  existingAttachment,
  memberCandidates = [],
  availableMemberCandidates = [],
  draftMembers = [],
  draftMemberForm = initialMemberForm,
  onDraftMemberChange = () => {},
  onDraftMemberSubmit = () => {},
  onDraftMemberEdit = () => {},
  onDraftMemberRemove = () => {},
  draftMemberEditingIndex = null,
  onDraftMemberCancel = () => {},
  editMembersPanel = null,
}) {
  if (!open) return null;

  const disableTypeSelect = types.length === 0;
  const disablePlanSelect = plans.length === 0;
  const selectedTypeInactive =
    isEditing &&
    formData.type_id &&
    types.some(
      (type) =>
        type.type_id === Number(formData.type_id) && type.is_active === false
    );
  const selectedPlanInactive =
    isEditing &&
    formData.plan_id &&
    plans.some(
      (plan) =>
        plan.plan_id === Number(formData.plan_id) && plan.is_active === false
    );

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
            disabled={disableTypeSelect}
            className={`w-full rounded-md border focus:border-blue-500 focus:ring-blue-500 px-3 py-2 ${
              disableTypeSelect
                ? "bg-gray-100 cursor-not-allowed border-gray-200"
                : "border-gray-300"
            }`}
          >
            <option value="">-- เลือกประเภท --</option>
            {types.map((type) => (
              <option key={type.type_id} value={type.type_id}>
                {type.name_th || type.name_en}
                {type.is_active ? "" : " (ปิดใช้งาน)"}
              </option>
            ))}
          </select>
          {disableTypeSelect ? (
            <p className="mt-2 text-xs text-red-500">
              ไม่มีประเภทโครงการที่เปิดใช้งาน กรุณาเปิดใช้งานก่อนบันทึกโครงการ
            </p>
          ) : null}
          {selectedTypeInactive ? (
            <p className="mt-2 text-xs text-amber-500">
              ประเภทที่เลือกถูกปิดใช้งานอยู่ หากต้องการเปลี่ยนกรุณาเลือกประเภทที่เปิดใช้งาน
            </p>
          ) : null}
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
            disabled={disablePlanSelect}
            className={`w-full rounded-md border focus:border-blue-500 focus:ring-blue-500 px-3 py-2 ${
              disablePlanSelect
                ? "bg-gray-100 cursor-not-allowed border-gray-200"
                : "border-gray-300"
            }`}
          >
            <option value="">-- เลือกแผนงบประมาณ --</option>
            {plans.map((plan) => (
              <option key={plan.plan_id} value={plan.plan_id}>
                {plan.name_th || plan.name_en}
                {plan.is_active ? "" : " (ปิดใช้งาน)"}
              </option>
            ))}
          </select>
          {disablePlanSelect ? (
            <p className="mt-2 text-xs text-red-500">
              ไม่มีแผนงบประมาณที่เปิดใช้งาน กรุณาเปิดใช้งานก่อนบันทึกโครงการ
            </p>
          ) : null}
          {selectedPlanInactive ? (
            <p className="mt-2 text-xs text-amber-500">
              แผนงบประมาณที่เลือกถูกปิดใช้งานอยู่ หากต้องการเปลี่ยนกรุณาเลือกแผนที่เปิดใช้งาน
            </p>
          ) : null}
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
            max={MAX_BUDGET_AMOUNT}
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            หน่วยงาน/ชุมชนที่ได้รับประโยชน์ (แห่ง)
          </label>
          <input
            type="number"
            name="beneficiaries_count"
            value={formData.beneficiaries_count}
            onChange={onChange}
            min="0"
            className="w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
            placeholder="เช่น 10"
          />
        </div>

        {isEditing ? (
          editMembersPanel ? (
            <div className="md:col-span-2">{editMembersPanel}</div>
          ) : null
        ) : (
          <ProjectFormMembersSection
            memberOptions={availableMemberCandidates}
            allCandidates={memberCandidates}
            form={draftMemberForm}
            members={draftMembers}
            onFormChange={onDraftMemberChange}
            onSubmit={onDraftMemberSubmit}
            onEdit={onDraftMemberEdit}
            onRemove={onDraftMemberRemove}
            onCancelEdit={onDraftMemberCancel}
            editingIndex={draftMemberEditingIndex}
            disabled={saving}
          />
        )}

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ไฟล์แนบโครงการ (สูงสุด 1 ไฟล์)
          </label>
          <input
            key={fileInputKey}
            type="file"
            name="attachment"
            onChange={onFileChange}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
            disabled={saving}
            className="block w-full rounded-md border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:ring-blue-500 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-600 hover:file:bg-blue-100 disabled:cursor-not-allowed"
          />
          {attachmentFile ? (
            <div className="mt-3 flex items-center justify-between rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">
              <span className="flex items-center gap-2">
                <Paperclip size={16} />
                {attachmentFile.name}
              </span>
              <button
                type="button"
                onClick={onClearAttachment}
                disabled={saving}
                className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                ล้างไฟล์
              </button>
            </div>
          ) : existingAttachment ? (
            <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
              <div className="flex flex-wrap items-center gap-2">
                <Paperclip size={16} className="text-gray-400" />
                <a
                  href={buildAttachmentUrl(existingAttachment)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-blue-600 hover:underline"
                  title={existingAttachment.original_name || existingAttachment.stored_path}
                >
                  ไฟล์ที่บันทึกล่าสุด: {existingAttachment.original_name || existingAttachment.stored_path}
                </a>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                การเลือกไฟล์ใหม่จะทับไฟล์เดิมโดยอัตโนมัติ
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-gray-400">ยังไม่ได้เลือกไฟล์แนบ</p>
          )}
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

export default function ProjectsContent() {
  const [loading, setLoading] = useState(true);
  const [savingProject, setSavingProject] = useState(false);

  const [projects, setProjects] = useState([]);
  const [projectTypes, setProjectTypes] = useState([]);
  const [budgetPlans, setBudgetPlans] = useState([]);

  const [projectForm, setProjectForm] = useState(() => ({
    ...initialProjectForm,
  }));
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [projectFileKey, setProjectFileKey] = useState(0);

  const [memberCandidates, setMemberCandidates] = useState([]);
  const [projectMembers, setProjectMembers] = useState([]);
  const [projectDraftMembers, setProjectDraftMembers] = useState([]);
  const [projectDraftMemberForm, setProjectDraftMemberForm] =
    useState(initialMemberForm);
  const [projectDraftEditingIndex, setProjectDraftEditingIndex] =
    useState(null);
  const [memberForm, setMemberForm] = useState(initialMemberForm);
  const [editingMember, setEditingMember] = useState(null);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [savingMember, setSavingMember] = useState(false);
  const [memberDeleteLoading, setMemberDeleteLoading] = useState(() => new Set());

  const projectTypeOptions = useMemo(() => {
    const selectedTypeId = editingProject?.type_id;
    return projectTypes.filter((type) =>
      type.is_active || type.type_id === selectedTypeId
    );
  }, [projectTypes, editingProject]);

  const budgetPlanOptions = useMemo(() => {
    const selectedPlanId = editingProject?.plan_id;
    return budgetPlans.filter((plan) =>
      plan.is_active || plan.plan_id === selectedPlanId
    );
  }, [budgetPlans, editingProject]);

  const availableMemberCandidates = useMemo(() => {
    if (!memberCandidates.length) {
      return [];
    }

    const usedIds = new Set(
      projectMembers
        .map((member) => getMemberUserId(member))
        .filter((id) => Number.isFinite(id) && id > 0)
    );

    if (editingMember) {
      const editingId = getMemberUserId(editingMember);
      if (Number.isFinite(editingId) && editingId > 0) {
        usedIds.delete(editingId);
      }
    }

    return memberCandidates.filter((candidate) =>
      Number.isFinite(candidate.user_id) && candidate.user_id > 0 && !usedIds.has(candidate.user_id)
    );
  }, [memberCandidates, projectMembers, editingMember]);

  const projectMemberRows = useMemo(() => {
    if (!Array.isArray(projectMembers) || projectMembers.length === 0) {
      return [];
    }

    return projectMembers.map((member) => {
      const userId = getMemberUserId(member);
      const user = getMemberUser(member);
      const candidateFromList = memberCandidates.find(
        (candidate) => candidate.user_id === userId
      );

      const rawDisplayName = candidateFromList?.display_name ?? buildUserDisplayName(user);
      const displayName = rawDisplayName && rawDisplayName !== "-"
        ? rawDisplayName
        : Number.isFinite(userId) && userId > 0
        ? `ผู้ใช้ #${userId}`
        : "-";
      const positionTitle =
        candidateFromList?.position_title ?? getUserPositionLabel(user) ?? "";
      const workloadValue = Number(
        member?.workload_hours ?? member?.WorkloadHours ?? 0
      );

      return {
        member_id: member?.member_id ?? member?.MemberID ?? null,
        user_id: Number.isFinite(userId) ? userId : null,
        duty: member?.duty ?? member?.Duty ?? "",
        workload_hours: Number.isFinite(workloadValue) ? workloadValue : 0,
        notes: member?.notes ?? member?.Notes ?? "",
        display_order: member?.display_order ?? member?.DisplayOrder ?? null,
        candidate:
          displayName && displayName !== "-"
            ? {
                user_id: Number.isFinite(userId) ? userId : null,
                display_name: displayName,
                position_title: positionTitle,
              }
            : positionTitle
            ? {
                user_id: Number.isFinite(userId) ? userId : null,
                display_name: displayName,
                position_title: positionTitle,
              }
            : null,
      };
    });
  }, [projectMembers, memberCandidates]);

  const availableDraftMemberCandidates = useMemo(() => {
    if (!memberCandidates.length) {
      return [];
    }

    const usedIds = new Set(
      projectDraftMembers
        .map((member) => Number(member?.user_id))
        .filter((id) => Number.isFinite(id) && id > 0)
    );

    if (
      typeof projectDraftEditingIndex === "number" &&
      projectDraftEditingIndex >= 0
    ) {
      const editingMember = projectDraftMembers[projectDraftEditingIndex];
      const editingId = Number(editingMember?.user_id);
      if (Number.isFinite(editingId) && editingId > 0) {
        usedIds.delete(editingId);
      }
    }

    return memberCandidates.filter(
      (candidate) =>
        Number.isFinite(candidate.user_id) &&
        candidate.user_id > 0 &&
        !usedIds.has(candidate.user_id)
    );
  }, [memberCandidates, projectDraftMembers, projectDraftEditingIndex]);

  const editingMemberIndex = useMemo(() => {
    if (!editingMember) {
      return null;
    }

    const editingId =
      editingMember?.member_id ?? editingMember?.MemberID ?? editingMember?.memberId ?? null;
    if (editingId !== null && editingId !== undefined) {
      const indexById = projectMembers.findIndex(
        (member) =>
          (member?.member_id ?? member?.MemberID ?? member?.memberId ?? null) ===
          editingId
      );
      if (indexById !== -1) {
        return indexById;
      }
    }

    const fallbackIndex = projectMembers.findIndex((member) => member === editingMember);
    return fallbackIndex === -1 ? null : fallbackIndex;
  }, [editingMember, projectMembers]);

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchCandidates = async () => {
      try {
        const users = await adminAPI.getProjectMemberCandidates();
        if (!isMounted) return;

        const normalized = Array.isArray(users)
          ? users.map(normalizeProjectMemberCandidate).filter(Boolean)
          : [];

        const collator = new Intl.Collator("th-TH", { sensitivity: "base" });
        normalized.sort((a, b) => collator.compare(a.display_name, b.display_name));
        setMemberCandidates(normalized);
      } catch (error) {
        if (!isMounted) return;
        console.error(error);
        Toast.fire({
          icon: "error",
          title: error?.message || "ไม่สามารถโหลดรายชื่อบุคลากรได้",
        });
      }
    };

    fetchCandidates();

    return () => {
      isMounted = false;
    };
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

  const loadProjectMembers = async (projectId) => {
    if (!projectId) {
      setProjectMembers([]);
      setMemberDeleteLoading(new Set());
      return;
    }

    setLoadingMembers(true);
    try {
      const members = await adminAPI.getProjectMembers(projectId);
      const normalized = Array.isArray(members) ? members : [];
      setProjectMembers(normalized);
      setMemberDeleteLoading(new Set());

      setProjects((prev) =>
        prev.map((project) => {
          const id = project.project_id ?? project.projectId ?? project.ProjectID;
          if (id === projectId) {
            return { ...project, members: normalized };
          }
          return project;
        })
      );

      setEditingProject((prev) =>
        prev ? { ...prev, members: normalized } : prev
      );
    } catch (error) {
      console.error(error);
      Toast.fire({
        icon: "error",
        title: error?.message || "ไม่สามารถโหลดผู้ร่วมโครงการได้",
      });
    } finally {
      setLoadingMembers(false);
    }
  };

  const resetProjectForm = () => {
    setProjectForm({ ...initialProjectForm });
    setEditingProject(null);
    setShowProjectForm(false);
    setProjectFileKey((key) => key + 1);
    setProjectMembers([]);
    setProjectDraftMembers([]);
    setProjectDraftMemberForm(initialMemberForm);
    setProjectDraftEditingIndex(null);
    setMemberForm(initialMemberForm);
    setEditingMember(null);
    setMemberDeleteLoading(new Set());
  };

  const handleDraftMemberFormChange = (field, value) => {
    if (field === "workload_hours") {
      const normalized = normalizeWorkloadInputValue(value);
      if (normalized === "" || workloadInputPattern.test(normalized)) {
        setProjectDraftMemberForm((prev) => ({
          ...prev,
          [field]: normalized,
        }));
      }
      return;
    }

    setProjectDraftMemberForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetDraftMemberState = () => {
    setProjectDraftMemberForm(initialMemberForm);
    setProjectDraftEditingIndex(null);
  };

  const handleSubmitDraftMember = () => {
    const userId = Number(projectDraftMemberForm.user_id);
    if (!Number.isFinite(userId) || userId <= 0) {
      Toast.fire({ icon: "warning", title: "กรุณาเลือกบุคลากร" });
      return;
    }

    const duty = (projectDraftMemberForm.duty ?? "").trim();
    if (!duty) {
      Toast.fire({ icon: "warning", title: "กรุณาระบุหน้าที่" });
      return;
    }
    if (Array.from(duty).length > 255) {
      Toast.fire({
        icon: "warning",
        title: "หน้าที่ต้องไม่เกิน 255 ตัวอักษร",
      });
      return;
    }

    const workloadInput = (projectDraftMemberForm.workload_hours ?? "")
      .toString()
      .trim();
    const workloadNumber = workloadInput === "" ? 0 : Number(workloadInput);
    if (!Number.isFinite(workloadNumber) || workloadNumber < 0) {
      Toast.fire({
        icon: "warning",
        title: "กรุณาระบุชั่วโมงภาระงานให้ถูกต้อง",
      });
      return;
    }
    if (workloadNumber > 9999.99) {
      Toast.fire({
        icon: "warning",
        title: "จำนวนชั่วโมงต้องไม่เกิน 9,999.99",
      });
      return;
    }

    const normalizedHours = Math.round(workloadNumber * 100) / 100;

    const notesInput = (projectDraftMemberForm.notes ?? "").trim();
    if (Array.from(notesInput).length > 255) {
      Toast.fire({
        icon: "warning",
        title: "หมายเหตุต้องไม่เกิน 255 ตัวอักษร",
      });
      return;
    }

    const duplicateIndex = projectDraftMembers.findIndex(
      (member, index) =>
        Number(member.user_id) === userId && index !== projectDraftEditingIndex
    );
    if (duplicateIndex !== -1) {
      Toast.fire({
        icon: "warning",
        title: "มีการเลือกผู้ใช้นี้ในรายการแล้ว",
      });
      return;
    }

    const candidate = memberCandidates.find(
      (entry) => entry.user_id === userId
    );
    if (!candidate) {
      Toast.fire({
        icon: "warning",
        title: "ไม่พบข้อมูลบุคลากรที่เลือก",
      });
      return;
    }

    const entry = {
      user_id: userId,
      duty,
      workload_hours: normalizedHours,
      notes: notesInput,
      candidate: {
        user_id: candidate.user_id,
        display_name: candidate.display_name,
        position_title: candidate.position_title,
      },
    };

    setProjectDraftMembers((prev) => {
      const next = [...prev];
      if (
        typeof projectDraftEditingIndex === "number" &&
        projectDraftEditingIndex >= 0 &&
        projectDraftEditingIndex < next.length
      ) {
        next[projectDraftEditingIndex] = entry;
      } else {
        next.push(entry);
      }
      return next;
    });

    Toast.fire({
      icon: "success",
      title:
        typeof projectDraftEditingIndex === "number" &&
        projectDraftEditingIndex >= 0
          ? "อัปเดตรายการผู้ร่วมโครงการแล้ว"
          : "เพิ่มผู้ร่วมโครงการในฟอร์มแล้ว",
    });

    resetDraftMemberState();
  };

  const handleEditDraftMember = (index) => {
    const target = projectDraftMembers[index];
    if (!target) return;

    setProjectDraftEditingIndex(index);
    setProjectDraftMemberForm({
      user_id: target.user_id?.toString() ?? "",
      duty: target.duty ?? "",
      workload_hours:
        target.workload_hours === null ||
        target.workload_hours === undefined
          ? ""
          : target.workload_hours.toString(),
      notes: target.notes ?? "",
    });
  };

  const handleRemoveDraftMember = (index) => {
    setProjectDraftMembers((prev) =>
      prev.filter((_, memberIndex) => memberIndex !== index)
    );

    setProjectDraftEditingIndex((prev) => {
      if (typeof prev !== "number") {
        return prev;
      }
      if (prev === index) {
        setProjectDraftMemberForm(initialMemberForm);
        return null;
      }
      if (prev > index) {
        return prev - 1;
      }
      return prev;
    });

    Toast.fire({ icon: "success", title: "ลบผู้ร่วมโครงการออกจากฟอร์มแล้ว" });
  };

  const handleCancelDraftMemberEdit = () => {
    if (
      typeof projectDraftEditingIndex === "number" &&
      projectDraftEditingIndex >= 0
    ) {
      Toast.fire({ icon: "info", title: "ยกเลิกการแก้ไขแล้ว" });
    }
    resetDraftMemberState();
  };

  const handleProjectChange = (event) => {
    const { name, value } = event.target;

    if (name === "budget_amount") {
      const normalized = normalizeBudgetInputValue(value);
      setProjectForm((prev) => ({
        ...prev,
        [name]: normalized,
      }));
      return;
    }

    setProjectForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProjectFileChange = (event) => {
    const file = event.target?.files?.[0] ?? null;
    setProjectForm((prev) => ({
      ...prev,
      attachment: file,
    }));
  };

  const handleClearProjectAttachment = () => {
    setProjectForm((prev) => ({
      ...prev,
      attachment: null,
    }));
    setProjectFileKey((key) => key + 1);
  };

  const handleSubmitProject = async (event) => {
    event.preventDefault();

    if (
      !editingProject &&
      typeof projectDraftEditingIndex === "number" &&
      projectDraftEditingIndex >= 0
    ) {
      Toast.fire({
        icon: "warning",
        title: "กรุณาบันทึกหรือยกเลิกการแก้ไขผู้ร่วมโครงการในฟอร์ม",
      });
      return;
    }

    if (!projectForm.project_name || !projectForm.type_id || !projectForm.plan_id || !projectForm.event_date) {
      Toast.fire({ icon: "warning", title: "กรุณากรอกข้อมูลให้ครบถ้วน" });
      return;
    }

    const normalizedProjectName = normalizeText(projectForm.project_name);
    const projectId = editingProject?.project_id ?? null;
    const duplicateProject = projects.some(
      (project) =>
        normalizeText(project.project_name) === normalizedProjectName &&
        (project.project_id ?? null) !== projectId
    );

    if (duplicateProject) {
      Toast.fire({ icon: "warning", title: "ชื่อโครงการซ้ำกัน" });
      return;
    }

    if (!editingProject && !projectForm.attachment) {
      Toast.fire({ icon: "warning", title: "กรุณาเลือกไฟล์แนบ" });
      return;
    }

    const typeId = Number(projectForm.type_id);
    const planId = Number(projectForm.plan_id);
    const participantsValue = projectForm.participants
      ? Number(projectForm.participants)
      : 0;
    const beneficiariesValue = projectForm.beneficiaries_count
      ? Number(projectForm.beneficiaries_count)
      : 0;
    const budgetString = projectForm.budget_amount
      ? projectForm.budget_amount.toString().trim()
      : "";
    const budgetValue = Number(budgetString);

    if (Number.isNaN(typeId) || Number.isNaN(planId)) {
      Toast.fire({ icon: "warning", title: "การเลือกประเภทหรือแผนงบประมาณไม่ถูกต้อง" });
      return;
    }

    if (!budgetString) {
      Toast.fire({ icon: "warning", title: "กรุณาระบุงบประมาณโครงการ" });
      return;
    }

    if (!budgetAmountPattern.test(budgetString)) {
      Toast.fire({
        icon: "warning",
        title: "งบประมาณต้องไม่เกิน 10 หลัก และทศนิยมไม่เกิน 2 ตำแหน่ง",
      });
      return;
    }

    if (!Number.isFinite(budgetValue)) {
      Toast.fire({ icon: "warning", title: "งบประมาณไม่ถูกต้อง" });
      return;
    }

    if (budgetValue < 0 || budgetValue > MAX_BUDGET_AMOUNT) {
      Toast.fire({
        icon: "warning",
        title: "งบประมาณต้องอยู่ในช่วง 0 - 9,999,999,999.99",
      });
      return;
    }

    if (participantsValue < 0) {
      Toast.fire({ icon: "warning", title: "จำนวนผู้เข้าร่วมต้องมากกว่าหรือเท่ากับ 0" });
      return;
    }

    if (beneficiariesValue < 0) {
      Toast.fire({
        icon: "warning",
        title: "จำนวนหน่วยงาน/ชุมชนที่ได้รับประโยชน์ต้องมากกว่าหรือเท่ากับ 0",
      });
      return;
    }

    const formPayload = new FormData();
    formPayload.append("project_name", projectForm.project_name.trim());
    formPayload.append("type_id", typeId.toString());
    formPayload.append("event_date", projectForm.event_date);
    formPayload.append("plan_id", planId.toString());
    formPayload.append("budget_amount", budgetString);
    formPayload.append("participants", participantsValue.toString());
    formPayload.append("beneficiaries_count", beneficiariesValue.toString());
    formPayload.append("notes", projectForm.notes ? projectForm.notes.trim() : "");

    if (projectForm.attachment) {
      formPayload.append("attachment", projectForm.attachment);
    }

    if (!editingProject && projectDraftMembers.length > 0) {
      const membersPayload = projectDraftMembers.map((member, index) => ({
        user_id: Number(member.user_id),
        duty: member.duty,
        workload_hours: Number(member.workload_hours ?? 0),
        notes: member.notes ?? "",
        display_order: index + 1,
      }));
      formPayload.append("members", JSON.stringify(membersPayload));
    }

    try {
      setSavingProject(true);
      if (editingProject) {
        await adminAPI.updateProject(editingProject.project_id, formPayload);
        Toast.fire({ icon: "success", title: "อัปเดตข้อมูลโครงการเรียบร้อย" });
      } else {
        await adminAPI.createProject(formPayload);
        Toast.fire({ icon: "success", title: "บันทึกโครงการใหม่เรียบร้อย" });
      }
      await loadAll();
      resetProjectForm();
    } catch (error) {
      if (error?.status === 409) {
        Toast.fire({ icon: "warning", title: "ชื่อโครงการซ้ำกัน" });
      } else {
        console.error(error);
        Toast.fire({ icon: "error", title: error.message || "บันทึกข้อมูลไม่สำเร็จ" });
      }
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
      budget_amount:
        project.budget_amount === null || project.budget_amount === undefined
          ? ""
          : normalizeBudgetInputValue(project.budget_amount),
      participants: project.participants?.toString() || "",
      beneficiaries_count: project.beneficiaries_count?.toString() || "",
      notes: project.notes || "",
      attachment: null,
    });
    setProjectFileKey((key) => key + 1);
    setMemberForm(initialMemberForm);
    setEditingMember(null);
    setMemberDeleteLoading(new Set());

    const existingMembers = Array.isArray(project.members)
      ? project.members
      : [];
    setProjectMembers(existingMembers);
    setProjectDraftMembers([]);
    setProjectDraftMemberForm(initialMemberForm);
    setProjectDraftEditingIndex(null);

    const projectId = Number(
      project.project_id ?? project.projectId ?? project.ProjectID
    );
    if (Number.isFinite(projectId) && projectId > 0) {
      loadProjectMembers(projectId);
    }

    setShowProjectForm(true);
  };

  const handleMemberFormChange = (field, value) => {
    if (field === "workload_hours") {
      const normalized = normalizeWorkloadInputValue(value);
      if (normalized === "" || workloadInputPattern.test(normalized)) {
        setMemberForm((prev) => ({
          ...prev,
          [field]: normalized,
        }));
      }
      return;
    }

    setMemberForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetMemberFormState = () => {
    setMemberForm(initialMemberForm);
    setEditingMember(null);
  };

  const updateMemberDeleteLoading = (memberId, isLoading) => {
    setMemberDeleteLoading((prev) => {
      const next = new Set(prev);
      if (isLoading) {
        next.add(memberId);
      } else {
        next.delete(memberId);
      }
      return next;
    });
  };

  const handleSubmitMember = async (event) => {
    event.preventDefault();

    if (!editingProject) {
      Toast.fire({ icon: "warning", title: "กรุณาเลือกโครงการก่อน" });
      return;
    }

    const projectId = Number(
      editingProject.project_id ??
        editingProject.projectId ??
        editingProject.ProjectID
    );
    if (!Number.isFinite(projectId) || projectId <= 0) {
      Toast.fire({ icon: "warning", title: "ไม่พบรหัสโครงการที่ถูกต้อง" });
      return;
    }

    const userId = Number(memberForm.user_id);
    if (!Number.isFinite(userId) || userId <= 0) {
      Toast.fire({ icon: "warning", title: "กรุณาเลือกบุคลากร" });
      return;
    }

    const duty = memberForm.duty.trim();
    if (!duty) {
      Toast.fire({ icon: "warning", title: "กรุณาระบุหน้าที่" });
      return;
    }
    if (Array.from(duty).length > 255) {
      Toast.fire({ icon: "warning", title: "หน้าที่ต้องไม่เกิน 255 ตัวอักษร" });
      return;
    }

    const workloadInput = (memberForm.workload_hours ?? "").toString().trim();
    const workloadNumber = workloadInput === "" ? 0 : Number(workloadInput);
    if (!Number.isFinite(workloadNumber) || workloadNumber < 0) {
      Toast.fire({ icon: "warning", title: "กรุณาระบุชั่วโมงภาระงานให้ถูกต้อง" });
      return;
    }
    if (workloadNumber > 9999.99) {
      Toast.fire({ icon: "warning", title: "จำนวนชั่วโมงต้องไม่เกิน 9,999.99" });
      return;
    }

    const normalizedHours = Math.round(workloadNumber * 100) / 100;

    const notesInput = (memberForm.notes ?? "").trim();
    if (Array.from(notesInput).length > 255) {
      Toast.fire({ icon: "warning", title: "หมายเหตุต้องไม่เกิน 255 ตัวอักษร" });
      return;
    }

    const payload = {
      user_id: userId,
      duty,
      workload_hours: normalizedHours,
      notes: notesInput,
    };

    try {
      setSavingMember(true);
      const existingMemberId =
        editingMember?.member_id ?? editingMember?.MemberID;

      if (existingMemberId) {
        await adminAPI.updateProjectMember(
          projectId,
          existingMemberId,
          payload
        );
        Toast.fire({ icon: "success", title: "อัปเดตข้อมูลผู้ร่วมโครงการแล้ว" });
      } else {
        await adminAPI.createProjectMember(projectId, payload);
        Toast.fire({ icon: "success", title: "เพิ่มผู้ร่วมโครงการเรียบร้อย" });
      }
      resetMemberFormState();
      await loadProjectMembers(projectId);
    } catch (error) {
      console.error(error);
      Toast.fire({
        icon: "error",
        title: error?.message || "ไม่สามารถบันทึกข้อมูลผู้ร่วมโครงการได้",
      });
    } finally {
      setSavingMember(false);
    }
  };

  const handleEditMember = (member) => {
    const userId = getMemberUserId(member);
    const rawHours = Number(
      member?.workload_hours ?? member?.WorkloadHours ?? 0
    );
    setEditingMember(member);
    setMemberForm({
      user_id: Number.isFinite(userId) && userId > 0 ? String(userId) : "",
      duty: member?.duty ?? member?.Duty ?? "",
      workload_hours: Number.isFinite(rawHours) ? String(rawHours) : "",
      notes: member?.notes ?? member?.Notes ?? "",
    });
  };

  const handleCancelMemberEdit = () => {
    resetMemberFormState();
  };

  const handleDeleteMember = async (member) => {
    if (!editingProject) {
      return;
    }

    const memberId = Number(member?.member_id ?? member?.MemberID);
    const projectId = Number(
      editingProject.project_id ??
        editingProject.projectId ??
        editingProject.ProjectID
    );

    if (!Number.isFinite(memberId) || memberId <= 0 || !Number.isFinite(projectId) || projectId <= 0) {
      Toast.fire({ icon: "warning", title: "ไม่สามารถลบผู้ร่วมโครงการได้" });
      return;
    }

    const name = buildUserDisplayName(getMemberUser(member));
    const result = await Swal.fire({
      title: "ยืนยันการลบ",
      text: `ต้องการลบผู้ร่วมโครงการ "${name}" หรือไม่?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "ลบข้อมูล",
      cancelButtonText: "ยกเลิก",
      reverseButtons: true,
    });

    if (!result.isConfirmed) {
      return;
    }

    updateMemberDeleteLoading(memberId, true);
    try {
      await adminAPI.deleteProjectMember(projectId, memberId);
      Toast.fire({ icon: "success", title: "ลบผู้ร่วมโครงการแล้ว" });
      if (
        editingMember &&
        (editingMember.member_id ?? editingMember.MemberID) === memberId
      ) {
        resetMemberFormState();
      }
      await loadProjectMembers(projectId);
    } catch (error) {
      console.error(error);
      Toast.fire({
        icon: "error",
        title: error?.message || "ไม่สามารถลบผู้ร่วมโครงการได้",
      });
    } finally {
      updateMemberDeleteLoading(memberId, false);
    }
  };

  const resolveMemberByIndex = (index, memberRow) => {
    if (!Array.isArray(projectMembers) || projectMembers.length === 0) {
      return null;
    }

    if (typeof index === "number" && index >= 0 && index < projectMembers.length) {
      return projectMembers[index];
    }

    if (memberRow) {
      const rowMemberId = Number(
        memberRow?.member_id ?? memberRow?.MemberID ?? memberRow?.memberId
      );
      if (Number.isFinite(rowMemberId) && rowMemberId > 0) {
        const matchById = projectMembers.find(
          (entry) =>
            Number(entry?.member_id ?? entry?.MemberID ?? entry?.memberId ?? 0) ===
            rowMemberId
        );
        if (matchById) {
          return matchById;
        }
      }

      const rowUserId = Number(memberRow?.user_id);
      if (Number.isFinite(rowUserId) && rowUserId > 0) {
        const matchByUser = projectMembers.find(
          (entry) => getMemberUserId(entry) === rowUserId
        );
        if (matchByUser) {
          return matchByUser;
        }
      }
    }

    return null;
  };

  const handleEditMemberAtIndex = (index, memberRow) => {
    const target = resolveMemberByIndex(index, memberRow);
    if (target) {
      handleEditMember(target);
    }
  };

  const handleDeleteMemberAtIndex = (index, memberRow) => {
    const target = resolveMemberByIndex(index, memberRow);
    if (target) {
      handleDeleteMember(target);
    }
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

  return (
    <PageLayout
      title="จัดการโครงการ"
      subtitle="สร้าง แก้ไข และติดตามข้อมูลโครงการ"
      icon={Briefcase}
      loading={loading}
      breadcrumbs={[
        { label: "หน้าแรก", href: "/admin" },
        { label: "จัดการโครงการ" },
      ]}
    >
      <div className="space-y-6">
        <div className="bg-white border border-blue-100 rounded-xl shadow-sm p-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <FileText size={18} />
            </div>
            <div>
              <p className="text-sm text-gray-600">รายการโครงการทั้งหมด</p>
              <p className="text-2xl font-semibold text-gray-900">{projects.length.toLocaleString("th-TH")} รายการ</p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowProjectForm(true);
              setEditingProject(null);
              setProjectForm({ ...initialProjectForm });
              setProjectFileKey((key) => key + 1);
              setProjectMembers([]);
              setProjectDraftMembers([]);
              setProjectDraftMemberForm(initialMemberForm);
              setProjectDraftEditingIndex(null);
              setMemberForm(initialMemberForm);
              setEditingMember(null);
              setMemberDeleteLoading(new Set());
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          >
            <Plus size={16} />
            เพิ่มโครงการ
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
          <ProjectForm
            open={showProjectForm}
            formData={projectForm}
            types={projectTypeOptions}
            plans={budgetPlanOptions}
            onClose={resetProjectForm}
            onChange={handleProjectChange}
            onFileChange={handleProjectFileChange}
            onClearAttachment={handleClearProjectAttachment}
            onSubmit={handleSubmitProject}
            saving={savingProject}
            isEditing={!!editingProject}
            fileInputKey={projectFileKey}
            attachmentFile={projectForm.attachment}
            existingAttachment={editingProject?.attachments?.[0] || null}
            memberCandidates={memberCandidates}
            availableMemberCandidates={availableDraftMemberCandidates}
            draftMembers={projectDraftMembers}
            draftMemberForm={projectDraftMemberForm}
            onDraftMemberChange={handleDraftMemberFormChange}
            onDraftMemberSubmit={handleSubmitDraftMember}
            onDraftMemberEdit={handleEditDraftMember}
            onDraftMemberRemove={handleRemoveDraftMember}
            draftMemberEditingIndex={projectDraftEditingIndex}
            onDraftMemberCancel={handleCancelDraftMemberEdit}
            editMembersPanel=
              {showProjectForm && editingProject ? (
                <ProjectFormMembersSection
                  memberOptions={availableMemberCandidates}
                  allCandidates={memberCandidates}
                  form={memberForm}
                  members={projectMemberRows}
                  onFormChange={handleMemberFormChange}
                  onSubmit={handleSubmitMember}
                  onEdit={handleEditMemberAtIndex}
                  onRemove={handleDeleteMemberAtIndex}
                  onCancelEdit={handleCancelMemberEdit}
                  editingIndex={editingMemberIndex}
                  disabled={savingMember || loadingMembers}
                  loading={loadingMembers}
                  deleteLoadingIds={memberDeleteLoading}
                  saving={savingMember}
                />
              ) : null}
          />

          <ProjectsTable
            projects={projects}
            onEdit={handleEditProject}
            onDelete={handleDeleteProject}
          />
        </div>
      </div>
    </PageLayout>
  );
}