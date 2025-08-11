// dashboard/RecentApplications.js
export default function RecentApplications({ applications }) {
  const getStatusStyle = (status) => {
    const styles = {
      'รอพิจารณา': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'อนุมัติ': 'bg-green-100 text-green-800 border-green-300',
      'ไม่อนุมัติ': 'bg-red-100 text-red-800 border-red-300'
    };
    return styles[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

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
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusStyle(app.status)}`}>
                {app.status}
              </span>
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