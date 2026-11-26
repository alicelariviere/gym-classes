/**
 * Glasgow Club sample timetable, generated relative to today so the app
 * always looks current. ALT is live from TeamUp (see teamup.ts). Replace this
 * with Gladstone Go data once Glasgow Club is connected.
 */
import { addDays, atTime, dayKey, startOfDay } from '../lib/dates';
import type { Category, Entry, GymClass, Level, Studio, StudioId } from './types';

export const STUDIOS: Record<StudioId, Studio> = {
  alt: { id: 'alt', name: 'ALT Fitness', venue: 'ALT Fitness, Southside', dot: '#111111' },
  gc: { id: 'gc', name: 'Glasgow Club', venue: 'Glasgow Club Gorbals', dot: '#004D57' },
};

interface Template {
  time: string;
  durationMin: number;
  title: string;
  category: Category;
  level: Level;
  instructor: string;
  capacity: number;
  /** Fixed places taken; otherwise generated. */
  taken?: number;
  waiting?: number;
}

const cycle = (time: string, instructor = 'Allan'): Template => ({
  time,
  durationMin: 45,
  title: 'G-Cycle',
  category: 'Cycle',
  level: 'All levels',
  instructor,
  capacity: 20,
});
const pilates = (time: string): Template => ({
  time,
  durationMin: 60,
  title: 'Pilates',
  category: 'Pilates',
  level: 'All levels',
  instructor: 'Viv',
  capacity: 16,
});
const step = (time: string): Template => ({
  time,
  durationMin: 45,
  title: 'Body Step',
  category: 'Step',
  level: 'All levels',
  instructor: 'Jo',
  capacity: 20,
});

/** Glasgow Club Gorbals timetable by weekday (0 = Sunday). */
const GC_WEEK: Record<number, Template[]> = {
  0: [cycle('9:45'), pilates('11:00')],
  1: [cycle('12:30'), step('18:15')],
  2: [pilates('11:00'), step('18:15')],
  3: [cycle('12:30'), pilates('19:00')],
  4: [pilates('11:00'), cycle('18:00')],
  5: [cycle('12:30')],
  6: [step('10:00'), cycle('11:15')],
};

/** Stable pseudo-random number from a string, 0 to 1. */
function seeded(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

function build(studio: StudioId, day: Date, t: Template, index: number, extra: Partial<GymClass> = {}): GymClass {
  const id = `${studio}-${dayKey(day)}-${t.time.replace(':', '')}-${index}`;
  const r = seeded(id);
  const taken = t.taken ?? Math.min(t.capacity, Math.floor(t.capacity * (0.35 + r * 0.7)));
  const waiting = t.waiting ?? (taken >= t.capacity ? 1 + Math.floor(r * 4) : 0);
  return {
    id,
    studio,
    title: t.title,
    category: t.category,
    level: t.level,
    instructor: t.instructor,
    start: atTime(day, t.time),
    durationMin: t.durationMin,
    capacity: t.capacity,
    taken,
    waiting,
    ...extra,
  };
}

export function buildGcTimetable(now = new Date()): GymClass[] {
  const today = startOfDay(now);
  const classes: GymClass[] = [];
  for (let offset = -7; offset <= 35; offset++) {
    const day = addDays(today, offset);
    GC_WEEK[day.getDay()].forEach((t, i) => classes.push(build('gc', day, t, i)));
  }
  return classes;
}

/** Starting Glasgow Club bookings, while that side is still sample data. */
export function initialEntries(classes: GymClass[], now = new Date()): Entry[] {
  const today = startOfDay(now);
  const find = (pred: (c: GymClass) => boolean) => classes.find(pred);
  const entries: Entry[] = [];

  // Her usual Sunday G-Cycle at Glasgow Club.
  const daysToSunday = (7 - today.getDay()) % 7 || 7;
  const sunday = addDays(today, daysToSunday);
  const gCycle = find((c) => c.studio === 'gc' && dayKey(c.start) === dayKey(sunday) && c.title === 'G-Cycle');
  if (gCycle) entries.push({ classId: gCycle.id, status: 'booked', at: 0 });

  const lastSunday = addDays(sunday, -7);
  const pastCycle = find((c) => c.studio === 'gc' && dayKey(c.start) === dayKey(lastSunday) && c.title === 'G-Cycle');
  if (pastCycle) entries.push({ classId: pastCycle.id, status: 'booked', at: 0 });

  return entries;
}

export const DESCRIPTION: Record<StudioId, string> = {
  alt: '',
  gc: "Class description from Glasgow Club's timetable sits here.",
};
