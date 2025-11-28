import apiClient from "./api";

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const toBoolean = (value) => {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return ["true", "1", "yes", "y"].includes(normalized);
  }
  return Boolean(value);
};

const normalizeAttachment = (attachment) => {
  if (!attachment || typeof attachment !== "object") {
    return null;
  }

  const fileId = toNumber(
    attachment.file_id ??
      attachment.FileID ??
      attachment.fileId ??
      attachment.fileID
  );

  const projectId = toNumber(
    attachment.project_id ??
      attachment.ProjectID ??
      attachment.projectId ??
      attachment.projectID
  );

  const downloadUrl =
    attachment.download_url ??
    attachment.downloadUrl ??
    attachment.DownloadURL ??
    attachment.DownloadUrl ??
    null;

  const storedPath =
    attachment.stored_path ??
    attachment.StoredPath ??
    attachment.storedPath ??
    attachment.Storedpath ??
    "";

  return {
    file_id: fileId,
    project_id: projectId,
    original_name:
      attachment.original_name ??
      attachment.OriginalName ??
      attachment.originalName ??
      attachment.Originalname ??
      "",
    stored_path: storedPath,
    download_url: downloadUrl,
    file_size:
      toNumber(
        attachment.file_size ??
          attachment.FileSize ??
          attachment.fileSize ??
          attachment.Filesize
      ) ?? 0,
    mime_type:
      attachment.mime_type ??
      attachment.MimeType ??
      attachment.mimeType ??
      attachment.Mimetype ??
      "",
    is_public: toBoolean(
      attachment.is_public ??
        attachment.IsPublic ??
        attachment.isPublic ??
        attachment.Ispublic
    ),
    uploaded_at:
      attachment.uploaded_at ??
      attachment.UploadedAt ??
      attachment.uploadedAt ??
      attachment.Uploadedat ??
      null,
    display_order:
      toNumber(
        attachment.display_order ??
          attachment.DisplayOrder ??
          attachment.displayOrder ??
          attachment.Displayorder
      ) ?? 0,
  };
};

const normalizeMemberUser = (user) => {
  if (!user || typeof user !== "object") {
    return null;
  }

  return {
    user_id: toNumber(user.user_id ?? user.UserID),
    prefix: user.prefix ?? user.Prefix ?? "",
    user_fname: user.user_fname ?? user.UserFname ?? "",
    user_lname: user.user_lname ?? user.UserLname ?? "",
    email: user.email ?? user.Email ?? "",
    role_id: toNumber(user.role_id ?? user.RoleID),
    position_id: toNumber(user.position_id ?? user.PositionID),
    manage_position: user.manage_position ?? user.ManagePosition ?? "",
    position_title: user.position_title ?? user.PositionTitle ?? "",
    position_en: user.position_en ?? user.PositionEn ?? "",
    prefix_position_en: user.prefix_position_en ?? user.PrefixPositionEn ?? "",
    role: user.role ?? user.Role ?? null,
    position: user.position ?? user.Position ?? null,
  };
};

const normalizeMember = (member) => {
  if (!member || typeof member !== "object") {
    return null;
  }

  const workloadValue = member.workload_hours ?? member.WorkloadHours;
  const workloadNumeric = Number(workloadValue);

  return {
    member_id: toNumber(
      member.member_id ?? member.MemberID ?? member.memberId ?? member.memberID
    ),
    project_id: toNumber(
      member.project_id ?? member.ProjectID ?? member.projectId ?? member.projectID
    ),
    user_id: toNumber(
      member.user_id ?? member.UserID ?? member.userId ?? member.userID
    ),
    duty: member.duty ?? member.Duty ?? "",
    workload_hours: Number.isFinite(workloadNumeric)
      ? Number(workloadNumeric.toFixed(2))
      : 0,
    display_order:
      toNumber(
        member.display_order ??
          member.DisplayOrder ??
          member.displayOrder ??
          member.Displayorder
      ) ?? 0,
    notes: member.notes ?? member.Notes ?? null,
    created_at: member.created_at ?? member.CreatedAt ?? null,
    updated_at: member.updated_at ?? member.UpdatedAt ?? null,
    user: normalizeMemberUser(member.user ?? member.User ?? null),
  };
};

const normalizeProject = (project) => {
  if (!project || typeof project !== "object") {
    return null;
  }

  const type = project.type ?? project.Type ?? null;
  const budgetPlan = project.budget_plan ?? project.BudgetPlan ?? null;

  const attachments = Array.isArray(project.attachments ?? project.Attachments)
    ? (project.attachments ?? project.Attachments)
        .map(normalizeAttachment)
        .filter(Boolean)
    : [];

  const members = Array.isArray(project.members ?? project.Members)
    ? (project.members ?? project.Members)
        .map(normalizeMember)
        .filter(Boolean)
    : [];

  return {
    project_id: toNumber(project.project_id ?? project.ProjectID),
    project_name: project.project_name ?? project.ProjectName ?? "",
    type_id: toNumber(project.type_id ?? project.TypeID),
    type,
    type_name:
      type?.name_th ??
      type?.NameTH ??
      type?.name_en ??
      type?.NameEN ??
      null,
    plan_id: toNumber(project.plan_id ?? project.PlanID),
    plan_name:
      budgetPlan?.name_th ??
      budgetPlan?.NameTH ??
      budgetPlan?.name_en ??
      budgetPlan?.NameEN ??
      null,
    budget_plan: budgetPlan,
    event_date: project.event_date ?? project.EventDate ?? null,
    budget_amount: toNumber(project.budget_amount ?? project.BudgetAmount) ?? 0,
    participants: toNumber(project.participants ?? project.Participants) ?? 0,
    beneficiaries_count:
      toNumber(project.beneficiaries_count ?? project.BeneficiariesCount) ?? 0,
    notes: project.notes ?? project.Notes ?? "",
    attachments,
    members,
  };
};

const extractProjects = (response) => {
  if (!response) return [];
  if (Array.isArray(response.projects)) return response.projects;
  if (Array.isArray(response.data?.projects)) return response.data.projects;
  if (Array.isArray(response.data)) return response.data;
  if (Array.isArray(response)) return response;
  return [];
};

const projectAPI = {
  async getProjects(params = {}) {
    try {
      const response = await apiClient.get("/projects", params);
      const rawProjects = extractProjects(response);
      const projects = rawProjects
        .map(normalizeProject)
        .filter(Boolean);

      return {
        projects,
        total: Number(response?.total) || projects.length,
        raw: response,
      };
    } catch (error) {
      console.error("Error fetching projects:", error);
      throw error;
    }
  },
};

export { normalizeProject };
export default projectAPI;