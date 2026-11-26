/**
 * The Android app's Glasgow Club bridge. In a browser none of this exists,
 * and Check in falls back to opening Glasgow Club's site.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';
import { glasgowClubGymUrl } from '../data/glasgowclub';

export interface CheckInResult {
  ok?: boolean;
  needsSignIn?: boolean;
  /** "14:45": the slot that was booked or tried. */
  slot?: string;
  reason?: 'restricted' | 'price' | 'no-slots' | 'stuck' | 'timeout' | 'error' | 'cancelled' | string;
  message?: string;
  log?: unknown[];
  snapshot?: unknown;
}

interface GlasgowClubPlugin {
  book(options: { url: string; script: string; params: string; watch?: boolean }): Promise<CheckInResult>;
  showSite(options?: { url?: string }): Promise<void>;
}

const GlasgowClub = registerPlugin<GlasgowClubPlugin>('GlasgowClub');

export const inApp = () => Capacitor.isNativePlatform();

async function runOnce(slot: Date, watch: boolean): Promise<CheckInResult> {
  // Fetched fresh, so the booking steps can be fixed without a new install.
  const script = await fetch(`./gc-book.js?v=${Date.now()}`, { cache: 'no-store' }).then((r) => r.text());
  const params = JSON.stringify({ after: slot.toISOString(), jobId: `j${Date.now()}`, maxPrice: 0 });
  return GlasgowClub.book({ url: glasgowClubGymUrl(slot), script, params, watch });
}

/** Books the first free gym slot at or after `slot`. Asks you to sign in first if needed. */
export async function bookGymSlot(slot: Date, watch = false): Promise<CheckInResult> {
  let result = await runOnce(slot, watch);
  if (result.needsSignIn) {
    await GlasgowClub.showSite({ url: glasgowClubGymUrl(slot) });
    result = await runOnce(slot, watch);
  }
  return result;
}

/** Shows the Glasgow Club page where the last attempt stopped. */
export function showGlasgowClub() {
  return GlasgowClub.showSite();
}
