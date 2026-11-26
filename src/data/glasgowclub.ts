/**
 * Glasgow Club (Gladstone Go) at Gorbals.
 * Their booking site blocks calls from other sites and sits behind bot
 * protection, so the Android app works through their own site in a web view,
 * signed in on the phone (see lib/native.ts and public/gc-*.js). In a plain
 * browser the app links to their pages instead.
 */
import { startOfDay } from '../lib/dates';
import type { Category, GymClass } from './types';

const SITE = 'https://glasgowclub.gladstonego.cloud';
const GORBALS = 'SRGLC';
const GYM_ACTIVITY = 'S0937';
const CACHE_KEY = 'gc-timetable-v1';

/** Today's 15-minute gym check-in slots at Gorbals. */
export function glasgowClubGymUrl(day: Date): string {
  return `${SITE}/book/calendar/${GYM_ACTIVITY}?activityDate=${startOfDay(day).toISOString()}`;
}

/** One class's booking page, on its day. */
export function glasgowClubClassUrl(activityId: string, start: Date): string {
  return `${SITE}/book/calendar/${activityId}?activityDate=${startOfDay(start).toISOString()}`;
}

/** Search at Gorbals. The timetable script picks Classes on this page. */
export const glasgowClubSearchUrl = `${SITE}/book?siteIds=${GORBALS}`;

/** Your bookings, where you cancel. */
export const glasgowClubBookingsUrl = `${SITE}/account/bookings`;

/** A class session as the timetable script reports it. */
export interface GcSession {
  activityId: string;
  group: string;
  name: string;
  instructor: string;
  location: string;
  start: string;
  end: string;
  bookableFrom: string | null;
  bookableUntil: string | null;
  spaces: number | null;
  capacity: number | null;
  status: string;
  webBookable: boolean;
}

/** A booking as the My Bookings script reports it. */
export interface GcBooking {
  title: string;
  start: string;
  place: string;
  ref: string;
}

export interface GcCache {
  fetchedAt: number;
  sessions: GcSession[];
}

function categoryOf(group: string): Category {
  if (/cycle|spin/i.test(group)) return 'Cycle';
  if (/step/i.test(group)) return 'Step';
  if (/pilates/i.test(group)) return 'Pilates';
  if (/pump|kettle|strength|circuit|bootcamp|hiit|conditioning/i.test(group)) return 'Strength';
  if (/balance|yoga|tai chi|stretch/i.test(group)) return 'Flexibility';
  if (/core|abs/i.test(group)) return 'Core';
  if (/dance|zumba|sh'?bam/i.test(group)) return 'Dance';
  return 'Other';
}

export function gcClassId(s: Pick<GcSession, 'activityId' | 'start'>): string {
  return `gc-${s.activityId}-${s.start}`;
}

export function mapGc(list: GcSession[], now: Date): GymClass[] {
  return list.map((s) => {
    const start = new Date(s.start);
    const opensAt = s.bookableFrom ? new Date(s.bookableFrom) : undefined;
    const capacity = s.capacity ?? 0;
    const spaces = s.spaces ?? capacity;
    return {
      id: gcClassId(s),
      studio: 'gc',
      title: s.group || s.name,
      category: categoryOf(s.group || s.name),
      level: 'All levels',
      instructor: s.instructor,
      start,
      durationMin: Math.round((new Date(s.end).getTime() + 1000 - start.getTime()) / 60000),
      capacity,
      taken: Math.max(0, capacity - spaces),
      waiting: 0,
      opensAt,
      closesAt: s.bookableUntil ? new Date(s.bookableUntil) : undefined,
      url: glasgowClubClassUrl(s.activityId, start),
      activityId: s.activityId,
      description: s.location ? `In the ${s.location} at Gorbals.` : undefined,
      justReleased: !!opensAt && opensAt <= now && now.getTime() - opensAt.getTime() < 24 * 60 * 60 * 1000,
    } satisfies GymClass;
  });
}

/** Which classes in the timetable you're booked on, and your next gym slot. */
export function matchBookings(bookings: GcBooking[], classes: GymClass[]): { classIds: string[]; gymSlot: string | null } {
  const classIds: string[] = [];
  let gymSlot: string | null = null;
  for (const b of bookings) {
    const at = new Date(b.start).getTime();
    if (/gym session/i.test(b.title) || /check-in/i.test(b.place)) {
      if (!gymSlot || at < new Date(gymSlot).getTime()) gymSlot = b.start;
      continue;
    }
    const c = classes.find((x) => x.start.getTime() === at && x.title.toLowerCase() === b.title.toLowerCase())
      ?? classes.find((x) => x.start.getTime() === at);
    if (c) classIds.push(c.id);
  }
  return { classIds, gymSlot };
}

export function readGcCache(): GcCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as GcCache) : null;
  } catch {
    return null;
  }
}

export function writeGcCache(sessions: GcSession[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ fetchedAt: Date.now(), sessions } satisfies GcCache));
  } catch {
    // Storage full or blocked: the live data still shows.
  }
}
