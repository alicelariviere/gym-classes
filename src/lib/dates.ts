const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function addMinutes(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 60 * 1000);
}

/** A date on the same day as `day` at the given "HH:MM" time. */
export function atTime(day: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const x = startOfDay(day);
  x.setHours(h, m, 0, 0);
  return x;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY_MS);
}

/** "YYYY-MM-DD" in local time. */
export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function time(d: Date): string {
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }).replace(/^0(\d):/, '$1:');
}

/** "Wednesday 18 November" */
export function longDay(d: Date): string {
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** "Tue 15 Dec" */
export function shortDay(d: Date): string {
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** "Sun 22" */
export function dayAndDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' });
}

/** "November 2026" */
export function monthYear(d: Date): string {
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

/** Label for a day relative to today: "Today", "Tomorrow" or "Sun 22". */
export function relativeDay(d: Date, today: Date): string {
  const diff = daysBetween(today, d);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return dayAndDate(d);
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** Next 15-minute gym slot at or after `now`. */
export function nextGymSlot(now: Date): Date {
  const x = new Date(now);
  x.setSeconds(0, 0);
  const m = x.getMinutes();
  const rounded = Math.ceil(m / 15) * 15;
  x.setMinutes(rounded);
  return x;
}
