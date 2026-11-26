/**
 * Glasgow Club (Gladstone Go) links.
 * Their booking site blocks calls from other sites and sits behind bot
 * protection, so the app links into it rather than calling it. You stay
 * signed in on their site and book there, within Glasgow Club's terms.
 */
import { startOfDay } from '../lib/dates';

const SITE = 'https://glasgowclub.gladstonego.cloud';
const GORBALS = 'SRGLC';
const GYM_ACTIVITY = 'S0937';
const GYM_GROUP = 'AG159';

/** Today's 15-minute gym check-in slots at Gorbals. */
export function glasgowClubGymUrl(day: Date): string {
  return `${SITE}/book/calendar/${GYM_ACTIVITY}?activityDate=${startOfDay(day).toISOString()}`;
}

/** Gym sessions at Gorbals for the week ahead. */
export const glasgowClubGymWeekUrl = `${SITE}/book?siteIds=${GORBALS}&activityGroupIds=${GYM_GROUP}`;

/** Everything bookable at Gorbals, filtered on their site. */
export const glasgowClubGorbalsUrl = `${SITE}/book?siteIds=${GORBALS}`;
