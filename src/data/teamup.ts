/**
 * ALT Fitness timetable, live from TeamUp's public API.
 * No sign-in needed for the timetable: TeamUp allows calls from any site
 * as long as the provider header is set. Booking needs a TeamUp sign-in,
 * so until that is connected, Book opens the class on TeamUp.
 */
import { addDays, dayKey } from '../lib/dates';
import type { Category, GymClass, Level } from './types';

export const ALT_PROVIDER_ID = '3282761';
const API = 'https://goteamup.com/api/v2/events';
const SITE = 'https://goteamup.com';
const CACHE_KEY = 'alt-timetable-v1';

/** TeamUp offering categories: 1054 classes, 1056 open gym. Private lessons and parties are left out. */
const KEEP_CATEGORIES = new Set([1054, 1056]);

interface TeamUpEvent {
  id: number;
  name: string;
  starts_at: string;
  ends_at: string;
  status: string;
  max_occupancy: number | null;
  attending_count: number;
  waiting_count: number;
  is_full: boolean;
  registrations_open_at: string | null;
  registrations_close_at: string | null;
  customer_url: string;
  instructors?: { name: string }[];
  offering_type?: { category?: number; description?: string };
}

interface Page {
  next: string | null;
  results: TeamUpEvent[];
}

/** The raw fields we keep, so the cache stays small. */
interface Slim {
  id: number;
  name: string;
  start: string;
  end: string;
  cap: number | null;
  taken: number;
  waiting: number;
  opens: string | null;
  closes: string | null;
  url: string;
  who: string[];
  cat: number | null;
  desc: string;
}

function slim(e: TeamUpEvent): Slim {
  return {
    id: e.id,
    name: e.name.trim(),
    start: e.starts_at,
    end: e.ends_at,
    cap: e.max_occupancy,
    taken: e.attending_count,
    waiting: e.waiting_count,
    opens: e.registrations_open_at,
    closes: e.registrations_close_at,
    url: SITE + e.customer_url,
    who: (e.instructors ?? []).map((i) => i.name),
    cat: e.offering_type?.category ?? null,
    desc: e.offering_type?.description ?? '',
  };
}

function categoryOf(name: string): Category {
  if (/hoop/i.test(name)) return 'Hoop';
  if (/silk/i.test(name)) return 'Silks';
  if (/trapeze/i.test(name)) return 'Trapeze';
  if (/pole/i.test(name) && !/open gym/i.test(name)) return 'Pole';
  if (/flex/i.test(name)) return 'Flexibility';
  if (/pilates/i.test(name)) return 'Pilates';
  if (/strong|strength|condition/i.test(name)) return 'Strength';
  if (/open gym/i.test(name)) return 'Open gym';
  return 'Other';
}

function levelOf(name: string): Level {
  if (/beginner|intro/i.test(name)) return 'Beginners';
  if (/experienced|advanced|intermediate/i.test(name)) return 'Experienced';
  return 'All levels';
}

function textOf(html: string): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n'), 'text/html');
  return (doc.body.textContent ?? '').replace(/ /g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function toClass(s: Slim, now: Date): GymClass {
  const start = new Date(s.start);
  const opensAt = s.opens ? new Date(s.opens) : undefined;
  const released = !!opensAt && opensAt <= now && now.getTime() - opensAt.getTime() < 24 * 60 * 60 * 1000;
  return {
    id: `alt-${s.id}`,
    studio: 'alt',
    title: s.name,
    category: categoryOf(s.name),
    level: levelOf(s.name),
    instructor: s.who.join(' & '),
    start,
    durationMin: Math.round((new Date(s.end).getTime() - start.getTime()) / 60000),
    capacity: s.cap ?? 0,
    unlimited: s.cap === null,
    taken: s.taken,
    waiting: s.waiting,
    opensAt,
    closesAt: s.closes ? new Date(s.closes) : undefined,
    url: s.url,
    description: textOf(s.desc),
    justReleased: released,
  };
}

const keep = (s: Slim) =>
  s.cat !== null ? KEEP_CATEGORIES.has(s.cat) : !/private|party/i.test(s.name);

/** Classes from a week ago to five weeks ahead, in pages of 100. */
export async function fetchAlt(today: Date, signal?: AbortSignal): Promise<Slim[]> {
  const params = new URLSearchParams({
    page_size: '100',
    local_starts_at_gte: `${dayKey(addDays(today, -7))}T00:00:00`,
    local_starts_at_lte: `${dayKey(addDays(today, 35))}T23:59:59`,
    expand: 'instructors,offering_type',
    fields: [
      'id',
      'name',
      'starts_at',
      'ends_at',
      'status',
      'max_occupancy',
      'attending_count',
      'waiting_count',
      'is_full',
      'registrations_open_at',
      'registrations_close_at',
      'customer_url',
      'instructors',
      'offering_type',
    ].join(','),
  });
  let url: string | null = `${API}?${params}`;
  const out: Slim[] = [];
  for (let guard = 0; url && guard < 10; guard++) {
    const res: Response = await fetch(url, {
      signal,
      headers: { 'Teamup-Provider-ID': ALT_PROVIDER_ID, 'Teamup-Request-Mode': 'customer', Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`TeamUp ${res.status}`);
    const page = (await res.json()) as Page;
    page.results.filter((e) => e.status === 'active').forEach((e) => out.push(slim(e)));
    url = page.next;
  }
  return out.filter(keep);
}

export function mapAlt(list: Slim[], now: Date): GymClass[] {
  return list.map((s) => toClass(s, now));
}

export interface AltCache {
  fetchedAt: number;
  list: Slim[];
}

export function readAltCache(): AltCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as AltCache) : null;
  } catch {
    return null;
  }
}

export function writeAltCache(list: Slim[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ fetchedAt: Date.now(), list } satisfies AltCache));
  } catch {
    // Storage full or blocked: the live data still shows.
  }
}
