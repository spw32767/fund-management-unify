import apiClient from "./api";

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const normalizeAttachment = (attachment) => {
  if (!attachment || typeof attachment !== "object") {
    return null;
  }

  return {
    file_id: toNumber(attachment.file_id ?? attachment.FileID),
    original_name: attachment.original_name ?? attachment.OriginalName ?? "",
    stored_path: attachment.stored_path ?? attachment.StoredPath ?? "",
    file_size: toNumber(attachment.file_size ?? attachment.FileSize) ?? 0,
    mime_type: attachment.mime_type ?? attachment.MimeType ?? "",
    is_public: attachment.is_public ?? attachment.IsPublic ?? false,
    uploaded_at: attachment.uploaded_at ?? attachment.UploadedAt ?? null,
    display_order: toNumber(attachment.display_order ?? attachment.DisplayOrder) ?? 0,
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
    notes: project.notes ?? project.Notes ?? "",
    attachments,
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
