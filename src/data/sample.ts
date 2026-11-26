/**
 * Studio details shared across the app.
 * ALT's timetable is live from TeamUp (see teamup.ts). Glasgow Club is only
 * used for the gym check-in, which links to their own site (see glasgowclub.ts).
 */
import type { Studio, StudioId } from './types';

export const STUDIOS: Record<StudioId, Studio> = {
  alt: { id: 'alt', name: 'ALT Fitness', venue: 'ALT Fitness, Southside', dot: '#111111' },
  gc: { id: 'gc', name: 'Glasgow Club', venue: 'Glasgow Club Gorbals', dot: '#004D57' },
};
