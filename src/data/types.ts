export type StudioId = 'alt' | 'gc';

export interface Studio {
  id: StudioId;
  name: string;
  venue: string;
  /** Dot colour used to code the studio across the app. */
  dot: string;
}

export type Category =
  | 'Hoop'
  | 'Silks'
  | 'Trapeze'
  | 'Flexibility'
  | 'Strength'
  | 'Cycle'
  | 'Pilates'
  | 'Step'
  | 'Pole'
  | 'Open gym'
  | 'Other';

export type Level = 'Beginners' | 'All levels' | 'Experienced';

export interface GymClass {
  id: string;
  studio: StudioId;
  title: string;
  category: Category;
  level: Level;
  instructor: string;
  start: Date;
  durationMin: number;
  capacity: number;
  /** Places taken by other people. */
  taken: number;
  /** Other people on the waitlist. */
  waiting: number;
  /** Shows in "Just released" on Today. */
  justReleased?: boolean;
  /** No cap on numbers, like ALT's open gym. */
  unlimited?: boolean;
  /** When booking opens, if the studio releases classes ahead. */
  opensAt?: Date;
  /** When booking closes. */
  closesAt?: Date;
  /** The class on the studio's own booking site. */
  url?: string;
  description?: string;
}

export type EntryStatus = 'booked' | 'waitlist';

export interface Entry {
  classId: string;
  status: EntryStatus;
  /** Place in the waitlist queue, from 1. */
  position?: number;
  /** When it was booked, so the row can show "Just booked". */
  at: number;
}

export interface CheckIn {
  /** ISO time of the gym slot. */
  slot: string;
}
