export function tripDays(start: string, end: string): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return [];
  const first = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  if (!Number.isFinite(first.getTime()) || !Number.isFinite(last.getTime()) || first > last) return [];
  if (first.toISOString().slice(0, 10) !== start || last.toISOString().slice(0, 10) !== end) return [];
  const days: string[] = [];
  for (let time = first.getTime(); time <= last.getTime(); time += 86400000) {
    days.push(new Date(time).toISOString().slice(0, 10));
  }
  return days;
}
