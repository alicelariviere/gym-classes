import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import { buildTimetable, initialEntries } from './data/sample';
import type { CheckIn, Entry, GymClass, StudioId } from './data/types';
import { dayKey, startOfDay } from './lib/dates';
import { downloadIcs } from './lib/ics';

const STORAGE_KEY = 'gym-app-v1';

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

function load(classes: GymClass[], today: string): Persisted {
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
  return { seededFor: today, entries: initialEntries(classes), checkIn: null, calendar: [] };
}

interface Store {
  now: Date;
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
  const classes = useMemo(() => buildTimetable(today), [todayKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    ...load(classes, todayKey),
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

  const store: Store = {
    now,
    today,
    classes,
    byId,
    entryFor,
    entries,
    checkIn: state.checkIn,
    inCalendar: (id) => state.calendar.includes(id),
    selectedDay: state.selectedDay,
    studio: state.studio,
    book: (id) => dispatch({ type: 'book', id }),
    bookMany: (ids) => dispatch({ type: 'bookMany', ids }),
    cancel: (id) => dispatch({ type: 'cancel', id }),
    joinWaitlist: (id) => {
      const c = index.get(id);
      dispatch({ type: 'joinWaitlist', id, position: (c?.waiting ?? 0) + 1 });
    },
    leaveWaitlist: (id) => dispatch({ type: 'cancel', id }),
    doCheckIn: (slot) => dispatch({ type: 'checkIn', slot: slot.toISOString() }),
    addToCalendar: (id) => {
      const c = index.get(id);
      if (c) downloadIcs(c);
      dispatch({ type: 'calendar', id });
    },
    selectDay: (day) => dispatch({ type: 'selectDay', day }),
    setStudio: (studio) => dispatch({ type: 'studio', studio }),
  };

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}
