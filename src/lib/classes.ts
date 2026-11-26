import type { Entry, GymClass } from '../data/types';
import { addMinutes, ordinal } from './dates';

export function endOf(c: GymClass): Date {
  return addMinutes(c.start, c.durationMin);
}

/** Spaces left, counting your own booking. */
export function spacesLeft(c: GymClass, entry?: Entry): number {
  const mine = entry?.status === 'booked' ? 1 : 0;
  return Math.max(0, c.capacity - c.taken - mine);
}

export function isFull(c: GymClass, entry?: Entry): boolean {
  return spacesLeft(c, entry) === 0 && entry?.status !== 'booked';
}

/** People on the waitlist including you. */
export function waitlistTotal(c: GymClass, entry?: Entry): number {
  return c.waiting + (entry?.status === 'waitlist' ? 1 : 0);
}

export function positionLabel(entry: Entry): string {
  return `You're ${ordinal(entry.position ?? 1)} in line`;
}

export function spacesLabel(n: number): string {
  return n === 1 ? '1 space left' : `${n} spaces`;
}
