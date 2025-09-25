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

const THAI_DIGITS = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];

const THAI_UNITS = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน'];

const AUTHOR_ROLE_TEXT = {
  first_author: 'เป็นผู้ประพันธ์ชื่อแรก (first author)',
  corresponding_author: 'เป็นผู้ประพันธ์บรรณกิจ (corresponding author)',
  coauthor: 'เป็นผู้ร่วมประพันธ์ (co-author)',
};

const QUARTILE_TEXT = {
  T5: 'บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอไทล์ 1 (ลำดับ 5% แรก) ที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS',
  T10: 'บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอไทล์ 1 (ลำดับ 10% แรก) ที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS',
  Q1: 'บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอไทล์ 1 ที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS',
  Q2: 'บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอไทล์ 2 ที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS',
  Q3: 'บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอไทล์ 3 ที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS',
  Q4: 'บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอไทล์ 4 ที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS',
  TCI: 'บทความตีพิมพ์ในวารสารระดับนานาชาติ อยู่ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS หรือวารสารที่อยู่ในฐานข้อมูล TCI',
};

const MONTH_NAMES_SHORT = {
  '01': 'มกราคม',
  '02': 'กุมภาพันธ์',
  '03': 'มีนาคม',
  '04': 'เมษายน',
  '05': 'พฤษภาคม',
  '06': 'มิถุนายน',
  '07': 'กรกฎาคม',
  '08': 'สิงหาคม',
  '09': 'กันยายน',
  '10': 'ตุลาคม',
  '11': 'พฤศจิกายน',
  '12': 'ธันวาคม',
};

const safeDisplay = (value, fallback = '—') => {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }

  if (typeof value === 'number' && Number.isNaN(value)) {
    return fallback;
  }

  return value;
};

const readThaiNumber = (value) => {
  const sanitized = `${value}`.replace(/[^0-9]/g, '');
  if (!sanitized) {
    return '';
  }

  if (sanitized.length > 6) {
    const head = sanitized.slice(0, -6);
    const tail = sanitized.slice(-6);
    const headText = readThaiNumber(head);
    const tailText = readThaiNumber(tail);
    return `${headText}ล้าน${tailText || ''}`;
  }

  const digits = sanitized.split('').map((ch) => parseInt(ch, 10));
  const len = digits.length;
  let result = '';

  digits.forEach((digit, index) => {
    if (Number.isNaN(digit) || digit === 0) {
      return;
    }

    const position = len - index - 1;
    if (position === 0) {
      if (digit === 1 && len > 1) {
        result += 'เอ็ด';
      } else {
        result += THAI_DIGITS[digit];
      }
      return;
    }

    if (position === 1) {
      if (digit === 2) {
        result += 'ยี่สิบ';
        return;
      }
      if (digit === 1) {
        result += 'สิบ';
        return;
      }
    }

    result += `${THAI_DIGITS[digit]}${THAI_UNITS[position]}`;
  });

  return result;
};

const toBahtText = (amount) => {
  if (amount === null || amount === undefined || amount === '') {
    return '';
  }

  const numeric = parseFloat(`${amount}`.toString().replace(/,/g, ''));
  if (Number.isNaN(numeric)) {
    return '';
  }

  if (numeric === 0) {
    return 'ศูนย์บาทถ้วน';
  }

  const fixed = Math.abs(numeric).toFixed(2);
  const [bahtPart, satangPart] = fixed.split('.');
  const bahtText = readThaiNumber(bahtPart) || 'ศูนย์';
  const satangValue = parseInt(satangPart, 10);

  let result = `${bahtText}บาท`;
  if (satangValue === 0) {
    result += 'ถ้วน';
  } else {
    result += `${readThaiNumber(satangPart)}สตางค์`;
  }

  return result;
};

const formatThaiDate = (value) => {
  if (!value) {
    return '—';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  const day = date.getDate();
  const month = THAI_MONTHS[date.getMonth()] ?? '';
  const year = date.getFullYear() + 543;
  return `${day} ${month} ${year}`;
};

const formatThaiMonthYear = (value) => {
  if (!value) {
    return '';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const month = (`0${date.getMonth() + 1}`).slice(-2);
  const year = date.getFullYear() + 543;
  const monthName = MONTH_NAMES_SHORT[month] ?? '';
  if (!monthName) {
    return `${year}`;
  }
  return `${monthName} ${year}`;
};

const getPublicationYear = (value) => {
  if (!value) {
    return '';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    const numericYear = parseInt(`${value}`, 10);
    if (!Number.isNaN(numericYear)) {
      return `${numericYear + 543}`;
    }
    return '';
  }

  return `${date.getFullYear() + 543}`;
};

const mapAuthorRole = (authorType) => AUTHOR_ROLE_TEXT[authorType] ?? '';

const mapQuartileLine = (quartile) => QUARTILE_TEXT[quartile] ?? '';

const formatCurrency = (value) => {
  const numeric = parseFloat(`${value}`.toString().replace(/,/g, ''));
  if (Number.isNaN(numeric)) {
    return '';
  }

  return numeric.toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const buildDocumentLines = (documents = []) => {
  if (!Array.isArray(documents) || documents.length === 0) {
    return ['☑ ไม่พบรายการเอกสารแนบ'];
  }

  return documents.map((doc) => {
    const label = safeDisplay(doc.type || doc.name, 'เอกสารแนบ');
    return `☑ ${label} — จำนวน 1 ฉบับ`;
  });
};

export const buildPublicationSummaryContext = ({
  formData = {},
  currentUser = {},
  documents = [],
  systemConfig = {},
  fiscalYear = null,
}) => {
  const dateThai = formatThaiDate(new Date());
  const employmentDate = formatThaiDate(currentUser?.date_of_employment);

  const applicantNameFromUser = [
    safeDisplay(currentUser?.user_fname, ''),
    safeDisplay(currentUser?.user_lname, ''),
  ].filter(Boolean).join(' ').trim();

  const applicantName = safeDisplay(formData?.applicant_name, applicantNameFromUser || '—');
  const positionName = safeDisplay(currentUser?.position_name, '—');
  const installmentDisplay = safeDisplay(systemConfig?.installment, '—');
  const fiscalYearDisplay = fiscalYear ? safeDisplay(fiscalYear, '—') : '—';

  const totalAmountNumeric = parseFloat(`${formData?.total_amount ?? 0}`.toString().replace(/,/g, '')) || 0;
  const totalAmountDisplay = formatCurrency(totalAmountNumeric);
  const totalAmountText = toBahtText(totalAmountNumeric);

  const authorNameList = safeDisplay(formData?.author_name_list, '');
  const paperTitle = safeDisplay(formData?.article_title, '');
  const journalName = safeDisplay(formData?.journal_name, '');
  const publicationDate = safeDisplay(formatThaiDate(formData?.publication_date), '—');
  const publicationYear = getPublicationYear(formData?.publication_date);
  const volumeIssue = safeDisplay(formData?.journal_issue, '');
  const pageNumbers = safeDisplay(formData?.journal_pages, '');

  const authorRoleSentence = mapAuthorRole(formData?.author_status);
  const quartileSentence = mapQuartileLine(formData?.journal_quartile);
  const signatureText = safeDisplay(formData?.signature, '........................................');
  const kkuReportYear = safeDisplay(systemConfig?.kku_report_year, '—');

  const documentLines = buildDocumentLines(documents);
  const documentListText = documentLines.join('\n');

  const articleDetailText = [
    authorNameList,
    paperTitle,
    journalName,
    publicationYear || publicationDate,
    volumeIssue,
    pageNumbers,
  ].filter((part) => part && `${part}`.trim() !== '').join(' ');

  const placeholders = {
    date_th: dateThai,
    applicant_name: applicantName,
    date_of_employment: employmentDate,
    position: positionName,
    installment: installmentDisplay,
    total_amount: totalAmountDisplay,
    total_amount_text: totalAmountText,
    author_name_list: authorNameList,
    paper_title: paperTitle,
    journal_name: journalName,
    publication_date: publicationDate,
    publication_year: publicationYear,
    volume_issue: volumeIssue,
    page_numbers: pageNumbers,
    page_number: pageNumbers,
    author_role: authorRoleSentence,
    quartile_line: quartileSentence,
    document_line: documentListText,
    kku_report_year: kkuReportYear,
    signature: signatureText,
  };

  return {
    placeholders,
    documentLines,
    meta: {
      dateThai,
      employmentDate,
      applicantName,
      positionName,
      installmentDisplay,
      fiscalYearDisplay,
      totalAmountDisplay,
      totalAmountText,
      authorNameList,
      paperTitle,
      journalName,
      publicationDate,
      publicationYear,
      volumeIssue,
      pageNumbers,
      authorRoleSentence,
      quartileSentence,
      documentListText,
      signatureText,
      kkuReportYear,
      articleDetailText,
    },
  };
};

export const publicationSummaryHelpers = {
  formatThaiDate,
  toBahtText,
  safeDisplay,
};

export default buildPublicationSummaryContext;