import { STUDIOS } from '../data/sample';
import type { GymClass } from '../data/types';
import { addMinutes } from './dates';

function stamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escape(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
}

/** Builds an .ics event so the class can go straight into the phone's calendar. */
export function icsFor(c: GymClass): string {
  const studio = STUDIOS[c.studio];
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Gym app//EN',
    'BEGIN:VEVENT',
    `UID:${c.id}@gym-app`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(c.start)}`,
    `DTEND:${stamp(addMinutes(c.start, c.durationMin))}`,
    `SUMMARY:${escape(`${c.title} · ${studio.name}`)}`,
    `LOCATION:${escape(studio.venue)}`,
    `DESCRIPTION:${escape(`With ${c.instructor}`)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadIcs(c: GymClass): void {
  try {
    const blob = new Blob([icsFor(c)], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${c.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    // Downloads can be blocked in some contexts; the booking still stands.
  }
}
