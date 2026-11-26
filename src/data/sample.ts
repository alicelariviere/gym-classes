/**
 * Sample timetable data. Everything is generated relative to today so the app
 * always looks current. Replace with TeamUp (ALT) and Gladstone Go (Glasgow
 * Club) data once the API layer is connected.
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

const hoop = (level: Level, time: string, instructor: string, extra: Partial<Template> = {}): Template => ({
  time,
  durationMin: 60,
  title: `Aerial Hoop: ${level === 'All levels' ? 'All Levels' : level}`,
  category: 'Hoop',
  level,
  instructor,
  capacity: 12,
  ...extra,
});
const silks = (level: Level, time: string, instructor: string, extra: Partial<Template> = {}): Template => ({
  ...hoop(level, time, instructor, extra),
  title: `Aerial Silks: ${level === 'All levels' ? 'All Levels' : level}`,
  category: 'Silks',
});
const trapeze = (time: string, instructor: string): Template => ({
  ...hoop('All levels', time, instructor),
  title: 'Trapeze: All Levels',
  category: 'Trapeze',
});
const flex = (time: string, instructor: string, extra: Partial<Template> = {}): Template => ({
  ...hoop('All levels', time, instructor, extra),
  title: 'Flexibility: All Levels',
  category: 'Flexibility',
});
const strong = (time: string, instructor: string, extra: Partial<Template> = {}): Template => ({
  ...hoop('All levels', time, instructor, extra),
  title: 'STRONG AF: All Levels',
  category: 'Strength',
});

/** Today's ALT timetable, matching the design boards. */
const ALT_TODAY: Template[] = [
  hoop('Beginners', '18:00', 'Lindsay', { taken: 10 }),
  silks('All levels', '18:00', 'Monica', { taken: 11 }),
  flex('18:00', 'Vikki', { taken: 12, waiting: 3 }),
  hoop('Experienced', '19:10', 'Monica', { taken: 12, waiting: 3 }),
  strong('19:10', 'Fraser', { taken: 11 }),
  hoop('Experienced', '20:15', 'Monica', { taken: 5 }),
];

/** ALT timetable by weekday (0 = Sunday). */
const ALT_WEEK: Record<number, Template[]> = {
  0: [trapeze('11:00', 'Caitlin'), flex('12:10', 'Vikki')],
  1: [silks('Beginners', '18:00', 'Monica'), trapeze('19:10', 'Caitlin'), flex('20:15', 'Vikki')],
  2: [hoop('Beginners', '18:00', 'Lindsay'), silks('All levels', '18:00', 'Monica'), hoop('Experienced', '19:10', 'Monica'), strong('19:10', 'Fraser')],
  3: [hoop('All levels', '18:00', 'Lindsay'), silks('Experienced', '19:10', 'Monica'), strong('20:15', 'Fraser')],
  4: [hoop('Beginners', '18:00', 'Lindsay'), hoop('Experienced', '19:10', 'Caitlin'), silks('All levels', '20:15', 'Monica')],
  5: [flex('17:30', 'Vikki'), hoop('All levels', '18:40', 'Lindsay')],
  6: [hoop('Beginners', '10:00', 'Lindsay'), silks('All levels', '11:10', 'Monica')],
};

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

/** ALT releases classes a month ahead. These are the "usual" ones just released. */
const JUST_RELEASED: { offset: number; template: Template }[] = [
  { offset: 28, template: hoop('Beginners', '18:00', 'Lindsay', { taken: 3 }) },
  { offset: 29, template: silks('Experienced', '19:10', 'Monica', { taken: 0 }) },
  { offset: 30, template: hoop('Experienced', '19:10', 'Caitlin', { taken: 1 }) },
];

export function buildTimetable(now = new Date()): GymClass[] {
  const today = startOfDay(now);
  const classes: GymClass[] = [];
  for (let offset = -7; offset <= 35; offset++) {
    const day = addDays(today, offset);
    const weekday = day.getDay();
    const alt = offset === 0 ? ALT_TODAY : ALT_WEEK[weekday];
    alt.forEach((t, i) => classes.push(build('alt', day, t, i)));
    GC_WEEK[weekday].forEach((t, i) => classes.push(build('gc', day, t, i)));
  }
  for (const r of JUST_RELEASED) {
    const day = addDays(today, r.offset);
    classes.push(build('alt', day, r.template, 90, { justReleased: true }));
  }
  return classes.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** Starting bookings, matching the design boards. */
export function initialEntries(classes: GymClass[], now = new Date()): Entry[] {
  const today = startOfDay(now);
  const todayKey = dayKey(today);
  const find = (pred: (c: GymClass) => boolean) => classes.find(pred);
  const entries: Entry[] = [];

  const hoopBeginners = find((c) => c.studio === 'alt' && dayKey(c.start) === todayKey && c.title === 'Aerial Hoop: Beginners');
  if (hoopBeginners) entries.push({ classId: hoopBeginners.id, status: 'booked', at: 0 });

  const hoopExperienced = find(
    (c) => c.studio === 'alt' && dayKey(c.start) === todayKey && c.title === 'Aerial Hoop: Experienced' && c.waiting > 0,
  );
  if (hoopExperienced) entries.push({ classId: hoopExperienced.id, status: 'waitlist', position: 2, at: 0 });

  // Her usual Sunday G-Cycle at Glasgow Club.
  const daysToSunday = (7 - today.getDay()) % 7 || 7;
  const sunday = addDays(today, daysToSunday);
  const gCycle = find((c) => c.studio === 'gc' && dayKey(c.start) === dayKey(sunday) && c.title === 'G-Cycle');
  if (gCycle) entries.push({ classId: gCycle.id, status: 'booked', at: 0 });

  // A few past bookings so the calendar shows history.
  for (const offset of [-6, -5, -4, -2, -1]) {
    const day = dayKey(addDays(today, offset));
    const c = find((x) => x.studio === 'alt' && dayKey(x.start) === day);
    if (c) entries.push({ classId: c.id, status: 'booked', at: 0 });
  }
  const lastSunday = addDays(sunday, -7);
  const pastCycle = find((c) => c.studio === 'gc' && dayKey(c.start) === dayKey(lastSunday) && c.title === 'G-Cycle');
  if (pastCycle) entries.push({ classId: pastCycle.id, status: 'booked', at: 0 });

  return entries;
}

export const DESCRIPTION: Record<StudioId, string> = {
  alt: "Class description from ALT's timetable sits here, pulled from TeamUp.",
  gc: "Class description from Glasgow Club's timetable sits here.",
};
