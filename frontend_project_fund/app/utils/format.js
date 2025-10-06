// app/utils/format.js

const THAI_MONTHS = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

const THAI_MONTHS_SHORT = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

const normalizeDateInput = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) return null;

  const isoLike = trimmed.includes('T') || trimmed.includes('Z')
    ? trimmed
    : trimmed.replace(' ', 'T');

  const date = new Date(isoLike);
  return Number.isNaN(date.getTime()) ? null : date;
};

// Format date to Thai locale
export const formatDate = (date) => {
  const d = normalizeDateInput(date);
  if (!d) return '-';

  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };

  return d.toLocaleDateString('th-TH', options);
};

// Format date short (without time)
export const formatDateShort = (date) => {
  const d = normalizeDateInput(date);
  if (!d) return '-';

  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };

  return d.toLocaleDateString('th-TH', options);
};

// Format currency
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || amount === '') return '-';

  const numeric = Number(amount);
  if (Number.isNaN(numeric)) return '-';

  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numeric);
};

// Format number with commas
export const formatNumber = (num) => {
  if (num === null || num === undefined || num === '') return '-';

  const numeric = Number(num);
  if (Number.isNaN(numeric)) return '-';

  return new Intl.NumberFormat('th-TH').format(numeric);
};

// Format Thai date from BE string (e.g. 2567-06-10)
export const formatThaiDateFromBEString = (value) => {
  if (!value) return '-';
  if (typeof value !== 'string') {
    return formatDateShort(value);
  }

  const [yearStr, monthStr, dayStr] = value.split('-');
  if (!yearStr || !monthStr || !dayStr) {
    return value;
  }

  const monthIndex = Number(monthStr) - 1;
  if (Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex >= THAI_MONTHS.length) {
    return value;
  }

  const day = Number(dayStr);
  const dayLabel = Number.isNaN(day) ? dayStr : day;

  return `${dayLabel} ${THAI_MONTHS[monthIndex]} ${yearStr}`;
};

// Format Thai month (YYYY-MM) to short label, optionally including BE year
export const formatThaiMonthShort = (value, options = {}) => {
  const { includeYear = true } = options;
  if (!value) return '-';

  const parts = String(value).split(/[-/]/);
  if (parts.length < 2) {
    return value;
  }

  const [yearStr, monthStr] = parts;
  const monthIndex = Number(monthStr) - 1;
  const monthLabel = THAI_MONTHS_SHORT[monthIndex];

  if (!monthLabel) {
    return value;
  }

  if (!includeYear) {
    return monthLabel;
  }

  const yearNum = Number(yearStr);
  const thaiYear = Number.isNaN(yearNum) ? yearStr : yearNum + 543;
  const shortYear = typeof thaiYear === 'number'
    ? String(thaiYear).slice(-2)
    : String(thaiYear).slice(-2);

  return shortYear ? `${monthLabel} ${shortYear}` : monthLabel;
};

// Format Thai date time (adds น. suffix)
export const formatThaiDateTime = (value) => {
  const date = normalizeDateInput(value);
  if (!date) return '-';

  const day = date.getDate();
  const monthLabel = THAI_MONTHS[date.getMonth()] || '';
  const thaiYear = date.getFullYear() + 543;
  const time = date.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${day} ${monthLabel} ${thaiYear} ${time} น.`;
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