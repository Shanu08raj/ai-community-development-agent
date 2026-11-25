export function buildReceiptContent({
  referenceId,
  trackingCode,
  title,
  category,
  area,
  district,
  state,
  submittedDate,
}) {
  const safeRef = String(referenceId || '').trim().toUpperCase();
  const safeCode = String(trackingCode || '').trim().toUpperCase();
  const issuedAt = new Date().toISOString();

  return [
    '====================================================================',
    '  JANSETU AI - CITIZEN COMPLAINT RECEIPT',
    '  Connecting Citizens. Improving Communities.',
    '====================================================================',
    '',
    'CONFIDENTIALITY WARNING:',
    '  Your Private Secret Tracking Code acts as a bearer credential.',
    '  Keep this receipt stored securely offline and NEVER share the',
    '  Tracking Code publicly or post it online. JanSetu AI stores only',
    '  a cryptographic hash and cannot recover lost tracking codes.',
    '',
    '--------------------------------------------------------------------',
    'REPORT SUMMARY',
    '--------------------------------------------------------------------',
    `Complaint Reference ID : ${safeRef}`,
    `Private Tracking Code  : ${safeCode}`,
    `Complaint Title        : ${title || 'Community Issue Report'}`,
    `Category               : ${category || 'Other'}`,
    `Area / Ward            : ${area || 'Not specified'}`,
    `Location               : ${[district, state].filter(Boolean).join(', ') || 'India'}`,
    `Submission Date        : ${submittedDate || new Date().toISOString().split('T')[0]}`,
    `Receipt Generated (UTC): ${issuedAt}`,
    '',
    '--------------------------------------------------------------------',
    'HOW TO TRACK YOUR COMPLAINT',
    '--------------------------------------------------------------------',
    '1. Visit the JanSetu AI Citizen Portal.',
    '2. Click "Track My Complaint" (or open a saved card in "My Reports").',
    '3. Enter BOTH your Complaint Reference ID and Private Tracking Code.',
    '4. View live status updates, lifecycle timeline, and AI advisory notes.',
    '',
    '--------------------------------------------------------------------',
    'PLATFORM NOTICE',
    '--------------------------------------------------------------------',
    'JanSetu AI is an independent civic-tech intelligence platform and',
    'is NOT an official government grievance portal. AI authority',
    'recommendations are advisory only; official review requires human',
    'administrator action.',
    '====================================================================',
    '',
  ].join('\n');
}

export function downloadComplaintReceipt(receiptData) {
  const content = buildReceiptContent(receiptData);
  const safeRef = String(receiptData?.referenceId || 'REPORT')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '');
  const filename = `JanSetu-Receipt-${safeRef}.txt`;

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);

  return { filename, content };
}
