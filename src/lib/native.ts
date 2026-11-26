/**
 * The Android app's Glasgow Club bridge. Each job loads a Glasgow Club page in
 * the app's Glasgow Club web view (signed in on the phone) and runs one of the
 * scripts in public/ on it. In a browser none of this exists, and the app
 * links to Glasgow Club's pages instead.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';
import {
  glasgowClubBookingsUrl,
  glasgowClubClassUrl,
  glasgowClubGymUrl,
  glasgowClubSearchUrl,
  type GcBooking,
  type GcSession,
} from '../data/glasgowclub';

export interface CheckInResult {
  ok?: boolean;
  needsSignIn?: boolean;
  /** "14:45": the slot that was booked or tried. */
  slot?: string;
  reason?: 'restricted' | 'price' | 'no-slots' | 'full' | 'stuck' | 'timeout' | 'error' | 'cancelled' | string;
  message?: string;
  log?: unknown[];
  snapshot?: unknown;
}

interface JobResult extends CheckInResult {
  sessions?: GcSession[];
  bookings?: GcBooking[];
}

interface GlasgowClubPlugin {
  book(options: { url: string; script: string; params: string; watch?: boolean; title?: string }): Promise<JobResult>;
  showSite(options?: { url?: string; title?: string }): Promise<void>;
}

const GlasgowClub = registerPlugin<GlasgowClubPlugin>('GlasgowClub');

export const inApp = () => Capacitor.isNativePlatform();

// One Glasgow Club job at a time: they share one web view.
let chain: Promise<unknown> = Promise.resolve();
function queue<T>(job: () => Promise<T>): Promise<T> {
  const next = chain.then(job, job);
  chain = next.catch(() => undefined);
  return next;
}

async function run(file: string, url: string, params: Record<string, unknown>, title?: string): Promise<JobResult> {
  // Fetched fresh, so the steps can be fixed without a new install.
  const script = await fetch(`./${file}?v=${Date.now()}`, { cache: 'no-store' }).then((r) => r.text());
  return GlasgowClub.book({ url, script, params: JSON.stringify({ jobId: `j${Date.now()}`, ...params }), title });
}

/** Runs a booking, asking you to sign in to Glasgow Club first if needed. */
async function withSignIn(url: string, job: () => Promise<JobResult>): Promise<JobResult> {
  let result = await job();
  if (result.needsSignIn) {
    await GlasgowClub.showSite({ url, title: 'Sign in to Glasgow Club, then tap Done' });
    result = await job();
  }
  return result;
}

/** Books the first free gym slot at or after `slot`, at £0. */
export function bookGymSlot(slot: Date): Promise<CheckInResult> {
  const url = glasgowClubGymUrl(slot);
  return queue(() => withSignIn(url, () => run('gc-book.js', url, { after: slot.toISOString(), maxPrice: 0 }, 'Booking your gym slot…')));
}

/** Books one class, at its exact time, at £0. */
export function bookClass(activityId: string, start: Date): Promise<CheckInResult> {
  const url = glasgowClubClassUrl(activityId, start);
  return queue(() =>
    withSignIn(url, () => run('gc-book.js', url, { after: start.toISOString(), exact: true, maxPrice: 0 }, 'Booking your class…')),
  );
}

/** The Gorbals class timetable for about the next week. Doesn't need you signed in. */
export async function loadTimetable(): Promise<GcSession[] | null> {
  const r = await queue(() => run('gc-timetable.js', glasgowClubSearchUrl, { pages: 10 }, 'Loading classes…'));
  return r.ok && r.sessions ? r.sessions : null;
}

/** Your upcoming bookings, or null if you're not signed in or it didn't load. */
export async function loadMyBookings(): Promise<GcBooking[] | null> {
  const r = await queue(() => run('gc-mybookings.js', glasgowClubBookingsUrl, {}, 'Checking your bookings…'));
  return r.ok && r.bookings ? r.bookings : null;
}

/** Opens Glasgow Club's My Bookings in the app, to cancel there. Resolves when you tap Done. */
export function openMyBookings(): Promise<void> {
  return queue(() => GlasgowClub.showSite({ url: glasgowClubBookingsUrl, title: 'Cancel it here, then tap Done' }));
}

/** Shows the Glasgow Club page where the last job stopped. */
export function showGlasgowClub() {
  return GlasgowClub.showSite({ title: 'Glasgow Club' });
}
