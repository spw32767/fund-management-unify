// dashboard/RecentApplications.js
import StatusBadge from "../common/StatusBadge";

export default function RecentApplications({ applications = [] }) {
  return (
    <div className="space-y-4">
      {applications.length === 0 ? (
        <p className="text-center text-gray-500 py-8">ไม่มีคำร้องล่าสุด</p>
      ) : (
        applications.map((app) => (
          <div key={app.application_id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-800">{app.project_title}</h4>
                <p className="text-sm text-gray-600">เลขที่: {app.application_number}</p>
              </div>
              <StatusBadge
                statusId={
                  app.status_id ??
                  app.application_status_id ??
                  app.statusId ??
                  app._original?.status_id
                }
                fallbackLabel={app.status}
              />
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>{app.subcategory_name}</span>
              <span>฿{app.requested_amount.toLocaleString()}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}