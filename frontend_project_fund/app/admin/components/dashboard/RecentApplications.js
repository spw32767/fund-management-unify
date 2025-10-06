// dashboard/RecentApplications.js
import StatusBadge from "../../../member/components/common/StatusBadge";

const formatAmount = (value) => {
  const amount = Number(value);
  if (Number.isNaN(amount)) {
    return "฿0";
  }
  return `฿${amount.toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;
};

export default function RecentApplications({ applications = [] }) {
  const items = Array.isArray(applications) ? applications : [];

  if (items.length === 0) {
    return <p className="text-center text-gray-500 py-8">ไม่มีคำร้องล่าสุด</p>;
  }

  return (
    <div className="space-y-4">
      {items.map((app) => {
        const key =
          app.application_id ??
          app.submission_id ??
          app.application_number ??
          `${app.project_title}-${app.submitted_at}`;

        return (
          <div key={key} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2 gap-4">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-800 truncate">
                  {app.project_title || app.title || "-"}
                </h4>
                <p className="text-sm text-gray-600">
                  เลขที่: {app.application_number || app.submission_number || "-"}
                </p>
              </div>
              <StatusBadge
                statusId={
                  app.status_id ??
                  app.application_status_id ??
                  app.statusId ??
                  app._original?.status_id ??
                  app.status
                }
                fallbackLabel={app.status}
              />
            </div>
            <div className="flex justify-between text-sm text-gray-600 gap-4">
              <span className="truncate">
                {app.subcategory_name || app.category_name || "ไม่ระบุหมวดหมู่"}
              </span>
              <span className="font-semibold text-blue-600">{formatAmount(app.requested_amount ?? app.amount)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}