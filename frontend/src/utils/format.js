export const fmt = n => new Intl.NumberFormat('th-TH').format(Math.round(n || 0));
export const fmtM = n => {
  const abs = Math.abs(n || 0);
  if (abs >= 1e6) return (n/1e6).toFixed(1) + 'M';
  if (abs >= 1e3) return (n/1e3).toFixed(0) + 'K';
  return fmt(n);
};
export const fmtPct = n => `${parseFloat(n || 0).toFixed(1)}%`;
export const MONTHS_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
export const MONTHS_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function varianceColor(val, type = 'revenue') {
  if (type === 'revenue') return val >= 0 ? 'text-green-600' : 'text-red-600';
  return val <= 0 ? 'text-green-600' : 'text-red-600';
}
export function varianceBg(val, type = 'revenue') {
  if (type === 'revenue') return val >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700';
  return val <= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700';
}
