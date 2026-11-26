import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import { fetchAlt, mapAlt, readAltCache, writeAltCache, type AltCache } from './data/teamup';
import type { CheckIn, Entry, GymClass, StudioId } from './data/types';
import { dayKey, ordinal, startOfDay, time } from './lib/dates';
import { downloadIcs } from './lib/ics';
import { glasgowClubGymUrl } from './data/glasgowclub';

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
  | { type: 'studio'; studio: StudioId };

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

export type AltStatus = 'loading' | 'live' | 'offline';

/** The short banner that confirms an action. */
export interface Toast {
  id: number;
  text: string;
  kind: 'booked' | 'waitlist' | 'info';
}

interface Store {
  now: Date;
  /** Whether ALT's timetable is live from TeamUp, and when it was fetched. */
  alt: { status: AltStatus; updatedAt: number | null };
  toast: Toast | null;
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
  // ALT, live from TeamUp. Show the last copy straight away, then refresh.
  const [altData, setAltData] = useState<AltCache | null>(() => readAltCache());
  const [altStatus, setAltStatus] = useState<AltStatus>('loading');
  useEffect(() => {
    let ctrl: AbortController | null = null;
    let last = 0;
    const refresh = async () => {
      if (Date.now() - last < 60_000) return;
      last = Date.now();
      ctrl?.abort();
      ctrl = new AbortController();
      try {
        const list = await fetchAlt(startOfDay(new Date()), ctrl.signal);
        writeAltCache(list);
        setAltData({ fetchedAt: Date.now(), list });
        setAltStatus('live');
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setAltStatus('offline');
      }
    };
    refresh();
    const onShow = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onShow);
    const t = window.setInterval(refresh, 5 * 60_000);
    return () => {
      ctrl?.abort();
      document.removeEventListener('visibilitychange', onShow);
      window.clearInterval(t);
    };
  }, [todayKey]);

  const classes = useMemo(
    () => (altData ? mapAlt(altData.list, now) : []).sort((a, b) => a.start.getTime() - b.start.getTime()),
    [altData, now],
  );

  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    ...load(todayKey),
    selectedDay: todayKey,
    studio: 'alt' as StudioId,
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
  const notify = (text: string, kind: Toast['kind'] = 'info') => setToast({ id: Date.now(), text, kind });

  // ALT bookings happen on TeamUp until sign-in is connected.
  const openOnStudioSite = (id: string) => {
    const c = index.get(id);
    if (c?.studio === 'alt' && c.url) {
      window.open(c.url, '_blank', 'noopener');
      notify('Opening TeamUp to book');
      return true;
    }
    return false;
  };

  const store: Store = {
    now,
    alt: { status: altStatus, updatedAt: altData?.fetchedAt ?? null },
    toast,
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
      if (openOnStudioSite(id)) return;
      dispatch({ type: 'book', id });
      notify(`Booked · ${index.get(id)?.title ?? 'class'}`, 'booked');
    },
    bookMany: (ids) => {
      const inApp = ids.filter((id) => index.get(id)?.studio !== 'alt');
      dispatch({ type: 'bookMany', ids: inApp });
      notify(`Booked ${inApp.length} classes`, 'booked');
    },
    cancel: (id) => {
      dispatch({ type: 'cancel', id });
      notify('Booking cancelled');
    },
    joinWaitlist: (id) => {
      if (openOnStudioSite(id)) return;
      const position = (index.get(id)?.waiting ?? 0) + 1;
      dispatch({ type: 'joinWaitlist', id, position });
      notify(`On the waitlist · ${ordinal(position)} in line`, 'waitlist');
    },
    leaveWaitlist: (id) => {
      dispatch({ type: 'cancel', id });
      notify('You left the waitlist');
    },
    doCheckIn: (slot) => {
      // Glasgow Club's own page for today's Gorbals gym slots. You book the slot there, at £0.
      window.open(glasgowClubGymUrl(slot), '_blank', 'noopener');
      notify(`Opening Glasgow Club for the ${time(slot)} slot`);
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
