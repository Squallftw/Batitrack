// Date + currency utilities for Batitrack
// French formatting throughout

const MOIS_FR = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const MOIS_FR_SHORT = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc'];
const JOURS_FR = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];

function daysInMonth(year, monthIdx) {
  return new Date(year, monthIdx + 1, 0).getDate();
}

function quinzaineRange(year, monthIdx, half) {
  // half = 1 or 2
  const dim = daysInMonth(year, monthIdx);
  if (half === 1) return { start: 1, end: 15, count: 15 };
  return { start: 16, end: dim, count: dim - 15 };
}

function quinzaineKey(year, monthIdx, half) {
  return `${year}-${String(monthIdx+1).padStart(2,'0')}-Q${half}`;
}

function quinzaineLabel(year, monthIdx, half) {
  const r = quinzaineRange(year, monthIdx, half);
  return `Q${half} ${MOIS_FR[monthIdx][0].toUpperCase()+MOIS_FR[monthIdx].slice(1)} ${year} (${r.start}–${r.end})`;
}

function dateKey(year, monthIdx, day) {
  return `${year}-${String(monthIdx+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

function parseDateKey(k) {
  const [y, m, d] = k.split('-').map(Number);
  return { year: y, monthIdx: m-1, day: d };
}

function dayOfWeek(year, monthIdx, day) {
  return new Date(year, monthIdx, day).getDay();
}

function frenchDate(year, monthIdx, day) {
  return `${day} ${MOIS_FR[monthIdx]} ${year}`;
}

function frenchDateShort(year, monthIdx, day) {
  return `${day} ${MOIS_FR_SHORT[monthIdx]}`;
}

function formatMAD(n) {
  if (n == null || isNaN(n)) return '0,00 DH';
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  const [intPart, decPart='00'] = abs.toFixed(2).split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${sign}${grouped},${decPart} DH`;
}

function formatMADCompact(n) {
  if (n == null || isNaN(n)) return '0 DH';
  const sign = n < 0 ? '-' : '';
  const abs = Math.round(Math.abs(n));
  const grouped = String(abs).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${sign}${grouped} DH`;
}

function relativeTime(date) {
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return 'à l\'instant';
  if (diff < 3600) return `il y a ${Math.floor(diff/60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff/3600)}h`;
  return `il y a ${Math.floor(diff/86400)}j`;
}

// Get current quinzaine based on simulated "today"
const TODAY = { year: 2026, monthIdx: 4, day: 15 }; // 15 mai 2026

function currentQuinzaine() {
  return {
    year: TODAY.year,
    monthIdx: TODAY.monthIdx,
    half: TODAY.day <= 15 ? 1 : 2
  };
}

function previousQuinzaine(year, monthIdx, half) {
  if (half === 2) return { year, monthIdx, half: 1 };
  if (monthIdx === 0) return { year: year - 1, monthIdx: 11, half: 2 };
  return { year, monthIdx: monthIdx - 1, half: 2 };
}

function nextQuinzaine(year, monthIdx, half) {
  if (half === 1) return { year, monthIdx, half: 2 };
  if (monthIdx === 11) return { year: year + 1, monthIdx: 0, half: 1 };
  return { year, monthIdx: monthIdx + 1, half: 1 };
}

Object.assign(window, {
  MOIS_FR, MOIS_FR_SHORT, JOURS_FR,
  daysInMonth, quinzaineRange, quinzaineKey, quinzaineLabel,
  dateKey, parseDateKey, dayOfWeek,
  frenchDate, frenchDateShort,
  formatMAD, formatMADCompact, relativeTime,
  TODAY, currentQuinzaine, previousQuinzaine, nextQuinzaine
});
