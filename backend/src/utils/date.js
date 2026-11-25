export function formatDateYYYYMMDD(date = new Date()) {
  return date.toISOString().split('T')[0];
}

export function formatTimelineDate(date = new Date()) {
  const datePart = formatDateYYYYMMDD(date);
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const hourStr = String(hours).padStart(2, '0');
  return `${datePart} ${hourStr}:${minutes} ${ampm}`;
}

export function formatAuditTimestamp(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}
