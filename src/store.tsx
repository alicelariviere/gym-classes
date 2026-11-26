import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import type { CheckIn, Entry, GymClass, StudioId } from './data/types';
import { dayKey, startOfDay, time } from './lib/dates';
import { downloadIcs } from './lib/ics';
import {
  glasgowClubBookingsUrl,
  glasgowClubGymUrl,
  mapGc,
  matchBookings,
  readGcCache,
  writeGcCache,
  type GcBooking,
  type GcCache,
} from './data/glasgowclub';
import { bookClass, bookGymSlot, inApp, loadMyBookings, loadTimetable, openMyBookings, type CheckInResult } from './lib/native';

const STORAGE_KEY = 'gym-app-v3';

interface Persisted {
  seededFor: string;
  entries: Entry[];
  checkIn: CheckIn | null;
  calendar: string[];
}

interface State extends Persisted {
  selectedDay: string;
  studio: StudioId;
}

type Action =
  | { type: 'book'; id: string }
  | { type: 'bookMany'; ids: string[] }
  | { type: 'cancel'; id: string }
  | { type: 'joinWaitlist'; id: string; position: number }
  | { type: 'checkIn'; slot: string }
  | { type: 'calendar'; id: string }
  | { type: 'selectDay'; day: string }
  | { type: 'studio'; studio: StudioId }
  | { type: 'sync'; classIds: string[]; gymSlot: string | null };

function reducer(state: State, action: Action): State {
  const without = (id: string) => state.entries.filter((e) => e.classId !== id);
  switch (action.type) {
    case 'book':
      return { ...state, entries: [...without(action.id), { classId: action.id, status: 'booked', at: Date.now() }] };
    case 'bookMany': {
      const ids = action.ids.filter((id) => !state.entries.some((e) => e.classId === id));
      return { ...state, entries: [...state.entries, ...ids.map((id) => ({ classId: id, status: 'booked' as const, at: Date.now() }))] };
    }
    case 'cancel':
      return { ...state, entries: without(action.id), calendar: state.calendar.filter((c) => c !== action.id) };
    case 'joinWaitlist':
      return {
        ...state,
        entries: [...without(action.id), { classId: action.id, status: 'waitlist', position: action.position, at: Date.now() }],
      };
    case 'checkIn':
      return { ...state, checkIn: { slot: action.slot } };
    case 'calendar':
      return state.calendar.includes(action.id) ? state : { ...state, calendar: [...state.calendar, action.id] };
    case 'selectDay':
      return { ...state, selectedDay: action.day };
    case 'studio':
      return { ...state, studio: action.studio };
    case 'sync':
      // What Glasgow Club says you're booked on replaces what the app thought.
      return {
        ...state,
        entries: action.classIds.map((classId) => ({ classId, status: 'booked' as const, at: 0 })),
        checkIn: action.gymSlot ? { slot: action.gymSlot } : state.checkIn,
      };
  }
}

function load(today: string): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Persisted;
      // Sample data is generated relative to today, so start fresh each day.
      if (saved.seededFor === today) return saved;
    }
  } catch {
    // Storage unavailable: fall back to the seed.
  }
  return { seededFor: today, entries: [], checkIn: null, calendar: [] };
}

/** loading: first fetch; live: fresh from Glasgow Club; offline: showing the last copy; browser: only the Android app can load it. */
export type TimetableStatus = 'loading' | 'live' | 'offline' | 'browser';

/** The short banner that confirms an action. */
export interface Toast {
  id: number;
  text: string;
  kind: 'booked' | 'waitlist' | 'info';
}

interface Store {
  now: Date;
  /** Whether the Glasgow Club timetable is live, and when it was fetched. */
  timetable: { status: TimetableStatus; updatedAt: number | null };
  /** A class booking is under way. */
  isPending: (id: string) => boolean;
  toast: Toast | null;
  /** The Glasgow Club check-in in progress, or how the last one went. */
  gymCheck: { busy: boolean; last: CheckInResult | null };
  today: Date;
  classes: GymClass[];
  byId: (id: string) => GymClass | undefined;
  entryFor: (id: string) => Entry | undefined;
  entries: Entry[];
  checkIn: CheckIn | null;
  inCalendar: (id: string) => boolean;
  selectedDay: string;
  studio: StudioId;
  book: (id: string) => void;
  bookMany: (ids: string[]) => void;
  cancel: (id: string) => void;
  joinWaitlist: (id: string) => void;
  leaveWaitlist: (id: string) => void;
  doCheckIn: (slot: Date) => void;
  addToCalendar: (id: string) => void;
  selectDay: (day: string) => void;
  setStudio: (studio: StudioId) => void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [now, setNow] = useState(() => new Date());
  const today = useMemo(() => startOfDay(now), [now]);
  const todayKey = dayKey(today);
  // Glasgow Club classes at Gorbals. Show the last copy straight away, then refresh in the app.
  const [gcData, setGcData] = useState<GcCache | null>(() => readGcCache());
  const [timetableStatus, setTimetableStatus] = useState<TimetableStatus>(inApp() ? 'loading' : 'browser');

  const classes = useMemo(
    () => (gcData ? mapGc(gcData.sessions, now) : []).sort((a, b) => a.start.getTime() - b.start.getTime()),
    [gcData, now],
  );

  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    ...load(todayKey),
    selectedDay: todayKey,
    studio: 'gc' as StudioId,
  }));

  // Keep "now" fresh so the next gym slot and "next up" stay right.
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    try {
      const { seededFor, entries, checkIn, calendar } = state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ seededFor, entries, checkIn, calendar }));
    } catch {
      // Ignore: storage is a convenience only.
    }
  }, [state]);

  const index = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes]);
  const entries = useMemo(() => state.entries.filter((e) => index.has(e.classId)), [state.entries, index]);
  const entryMap = useMemo(() => new Map(entries.map((e) => [e.classId, e])), [entries]);

  const byId = useCallback((id: string) => index.get(id), [index]);
  const entryFor = useCallback((id: string) => entryMap.get(id), [entryMap]);

  const [toast, setToast] = useState<Toast | null>(null);
  const [gymCheck, setGymCheck] = useState<{ busy: boolean; last: CheckInResult | null }>({ busy: false, last: null });
  const notify = (text: string, kind: Toast['kind'] = 'info') => setToast({ id: Date.now(), text, kind });

  const [pending, setPending] = useState<string[]>([]);
  const saveDetails = (result: CheckInResult) => {
    try {
      localStorage.setItem('gym-last-checkin', JSON.stringify({ at: new Date().toISOString(), ...result }));
    } catch {
      // Only used for sending details.
    }
  };

  // Your Glasgow Club bookings, read from their My Bookings page.
  const applyBookings = useCallback((bookings: GcBooking[], sessions: GcCache['sessions']) => {
    const { classIds, gymSlot } = matchBookings(bookings, mapGc(sessions, new Date()));
    dispatch({ type: 'sync', classIds, gymSlot });
  }, []);
  const gcRef = useRef(gcData);
  gcRef.current = gcData;
  const syncBookings = useCallback(async () => {
    const bookings = await loadMyBookings();
    if (bookings) applyBookings(bookings, gcRef.current?.sessions ?? []);
    return bookings;
  }, [applyBookings]);

  // Refresh the timetable and bookings when the app opens or comes back, at most every 10 minutes.
  const refreshing = useRef(false);
  const lastRefresh = useRef(0);
  const refresh = useCallback(async () => {
    if (!inApp() || refreshing.current || Date.now() - lastRefresh.current < 10 * 60_000) return;
    refreshing.current = true;
    lastRefresh.current = Date.now();
    try {
      const sessions = await loadTimetable();
      if (sessions) {
        writeGcCache(sessions);
        const fresh = { fetchedAt: Date.now(), sessions };
        gcRef.current = fresh;
        setGcData(fresh);
        setTimetableStatus('live');
      } else {
        setTimetableStatus('offline');
      }
      await syncBookings();
    } catch {
      setTimetableStatus('offline');
    } finally {
      refreshing.current = false;
    }
  }, [syncBookings]);
  useEffect(() => {
    refresh();
    const onShow = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onShow);
    return () => document.removeEventListener('visibilitychange', onShow);
  }, [refresh, todayKey]);

  const bookOne = async (id: string) => {
    const c = index.get(id);
    if (!c) return;
    if (!inApp() || !c.activityId) {
      if (c.url) window.open(c.url, '_blank', 'noopener');
      notify('Opening Glasgow Club to book');
      return;
    }
    if (pending.includes(id)) return;
    setPending((p) => [...p, id]);
    notify(`Booking ${c.title}…`);
    let result: CheckInResult;
    try {
      result = await bookClass(c.activityId, c.start);
    } catch (e) {
      result = { ok: false, reason: 'error', message: String((e as Error)?.message ?? e) };
    }
    setPending((p) => p.filter((x) => x !== id));
    saveDetails(result);
    if (result.ok) {
      dispatch({ type: 'book', id });
      notify(`Booked · ${c.title}`, 'booked');
    } else {
      notify(result.message ?? "Couldn't book that class");
    }
  };

  const store: Store = {
    now,
    timetable: { status: timetableStatus, updatedAt: gcData?.fetchedAt ?? null },
    isPending: (id) => pending.includes(id),
    toast,
    gymCheck,
    today,
    classes,
    byId,
    entryFor,
    entries,
    checkIn: state.checkIn,
    inCalendar: (id) => state.calendar.includes(id),
    selectedDay: state.selectedDay,
    studio: state.studio,
    book: (id) => {
      bookOne(id);
    },
    bookMany: async (ids) => {
      for (const id of ids) await bookOne(id);
    },
    cancel: async (id) => {
      // Glasgow Club cancellations happen on their My Bookings page.
      if (!inApp()) {
        window.open(glasgowClubBookingsUrl, '_blank', 'noopener');
        notify('Opening Glasgow Club to cancel');
        return;
      }
      await openMyBookings();
      const bookings = await syncBookings();
      if (bookings && !matchBookings(bookings, classes).classIds.includes(id)) notify('Booking cancelled');
    },
    joinWaitlist: () => notify("Glasgow Club classes don't have waitlists"),
    leaveWaitlist: (id) => dispatch({ type: 'cancel', id }),
    doCheckIn: async (slot) => {
      if (!inApp()) {
        // In a browser, Glasgow Club's own page is as close as we can get.
        window.open(glasgowClubGymUrl(slot), '_blank', 'noopener');
        notify(`Opening Glasgow Club for the ${time(slot)} slot`);
        return;
      }
      if (gymCheck.busy) return;
      setGymCheck({ busy: true, last: null });
      let result: CheckInResult;
      try {
        result = await bookGymSlot(slot);
      } catch (e) {
        result = { ok: false, reason: 'error', message: String((e as Error)?.message ?? e) };
      }
      setGymCheck({ busy: false, last: result });
      saveDetails(result);
      if (result.ok && result.slot) {
        const [h, m] = result.slot.split(':').map(Number);
        const booked = new Date(slot);
        booked.setHours(h, m, 0, 0);
        dispatch({ type: 'checkIn', slot: booked.toISOString() });
        notify(`Checked in for ${result.slot}`, 'booked');
      } else {
        notify(result.message ?? "Couldn't book the slot");
      }
    },
    addToCalendar: (id) => {
      const c = index.get(id);
      if (c) downloadIcs(c);
      dispatch({ type: 'calendar', id });
    },
    selectDay: (day) => dispatch({ type: 'selectDay', day }),
    setStudio: (studio) => dispatch({ type: 'studio', studio }),
  };

  // Shared with the feedback layer so each note says what state the app was in.
  useEffect(() => {
    (window as unknown as { __gymState?: () => unknown }).__gymState = () => ({
      studio: state.studio,
      day: state.selectedDay,
      booked: entries.filter((e) => e.status === 'booked').length,
      waitlists: entries.filter((e) => e.status === 'waitlist').length,
      checkedIn: !!state.checkIn,
    });
  }, [state.studio, state.selectedDay, state.checkIn, entries]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}
