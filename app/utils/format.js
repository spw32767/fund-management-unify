// app/utils/format.js

// Format date to Thai locale
export const formatDate = (date) => {
  if (!date) return '-';
  
  const d = new Date(date);
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  return d.toLocaleDateString('th-TH', options);
};

// Format date short (without time)
export const formatDateShort = (date) => {
  if (!date) return '-';
  
  const d = new Date(date);
  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };
  
  return d.toLocaleDateString('th-TH', options);
};

// Format currency
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '-';
  
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
};

// Format number with commas
export const formatNumber = (num) => {
  if (num === null || num === undefined) return '-';
  
  return new Intl.NumberFormat('th-TH').format(num);
};

// Get submission type text in Thai
export const getSubmissionTypeText = (type) => {
  const types = {
    'fund_application': 'ใบสมัครทุนวิจัย',
    'publication_reward': 'เงินรางวัลตีพิมพ์',
    'conference_grant': 'ทุนประชุมวิชาการ',
    'training_request': 'ขอทุนฝึกอบรม'
  };
  return types[type] || type;
};

// Get status text in Thai
export const getStatusText = (statusId) => {
  const statuses = {
    1: 'รอพิจารณา',
    2: 'อนุมัติ',
    3: 'ไม่อนุมัติ',
    4: 'ต้องการข้อมูลเพิ่มเติม'
  };
  return statuses[statusId] || 'ไม่ทราบสถานะ';
};

// Get status badge color
export const getStatusBadgeClass = (statusId) => {
  const classes = {
    1: 'bg-yellow-100 text-yellow-800',
    2: 'bg-green-100 text-green-800',
    3: 'bg-red-100 text-red-800',
    4: 'bg-orange-100 text-orange-800'
  };
  return classes[statusId] || 'bg-gray-100 text-gray-800';
};

// Format file size
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

// Truncate text
export const truncateText = (text, maxLength = 50) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Get quartile badge color
export const getQuartileBadgeClass = (quartile) => {
  const classes = {
    'Q1': 'bg-purple-100 text-purple-800',
    'Q2': 'bg-blue-100 text-blue-800',
    'Q3': 'bg-cyan-100 text-cyan-800',
    'Q4': 'bg-gray-100 text-gray-800',
    'T5': 'bg-green-100 text-green-800',
    'T10': 'bg-emerald-100 text-emerald-800',
    'TCI': 'bg-orange-100 text-orange-800'
  };
  return classes[quartile] || 'bg-gray-100 text-gray-800';
};