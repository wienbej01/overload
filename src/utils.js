export const KG_TO_LB = 2.2046226218;

export function kgToLb(kg) {
  if (kg === null || kg === undefined) return 0;
  return kg * KG_TO_LB;
}

export function roundTo(value, step) {
  if (step === 0) return value;
  return Math.round(value / step) * step;
}

export function formatWeight(kg) {
  const lb = kgToLb(kg);
  return `${kg.toFixed(1)} kg / ${lb.toFixed(1)} lb`;
}

export function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function todayISO() {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}
