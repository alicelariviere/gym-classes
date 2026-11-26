import { Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { STUDIOS } from '../data/sample';
import type { Entry, GymClass } from '../data/types';
import { addMinutes, daysBetween, isSameDay, nextGymSlot, ordinal, shortDay, time } from '../lib/dates';
import { endOf, spacesLabel, spacesLeft } from '../lib/classes';
import { useStore } from '../store';
import { inApp, showGlasgowClub } from '../lib/native';
import { CalendarPlus, Check, ChevronRight, Close } from '../components/Icons';
import { Pill, QueueBars, Tag } from '../components/ui';

type Item = { e: Entry; c: GymClass };

/** "Starts in 25 min", "Starts in 3h 40m", "Starts tomorrow". */
function startsIn(c: GymClass, now: Date, today: Date): string {
  if (c.start <= now && endOf(c) > now) return 'On now';
  const mins = Math.round((c.start.getTime() - now.getTime()) / 60000);
  if (mins < 60) return `Starts in ${Math.max(1, mins)} min`;
  if (isSameDay(c.start, today)) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `Starts in ${h}h${m ? ` ${m}m` : ''}`;
  }
  const days = daysBetween(today, c.start);
  if (days === 1) return 'Starts tomorrow';
  if (days < 7) return `Starts ${c.start.toLocaleDateString('en-GB', { weekday: 'long' })}`;
  return `Starts ${shortDay(c.start)}`;
}

/** Splits "Aerial Hoop: Beginners" into two lines for the condensed headline. */
export function Headline({ title, className = '' }: { title: string; className?: string }) {
  const parts = title.split(': ');
  return (
    <h2 className={`font-display text-[46px] font-extrabold uppercase leading-[42px] ${className}`}>
      {parts.map((p, i) => (
        <Fragment key={i}>
          {p}
          {i < parts.length - 1 && (
            <>
              :<br />
            </>
          )}
        </Fragment>
      ))}
    </h2>
  );
}

function NextUp({ items }: { items: Item[] }) {
  const navigate = useNavigate();
  const { now, today, inCalendar, addToCalendar, cancel, leaveWaitlist } = useStore();

  if (items.length === 0) {
    return (
      <section className="flex flex-col gap-4 bg-ink px-5 pb-7 pt-2 text-white">
        <span className="text-[13px] font-medium">Nothing booked</span>
        <h2 className="font-display text-[46px] font-extrabold uppercase leading-[42px]">
          Find your
          <br />
          next class
        </h2>
        <div>
          <Pill variant="white" onClick={() => navigate('/classes')}>
            Browse classes
          </Pill>
        </div>
      </section>
    );
  }

  const [hero, ...rest] = items;
  const later = rest.filter((x) => isSameDay(x.c.start, hero.c.start));
  const studio = STUDIOS[hero.c.studio];
  const waitlisted = hero.e.status === 'waitlist';

  return (
    <section className="flex flex-col bg-ink px-5 pb-7 pt-2 text-white">
      <button type="button" className="flex flex-col gap-3.5 text-left" onClick={() => navigate(`/class/${hero.c.id}`)}>
        <span className="text-[13px] font-medium">
          {studio.name} · {startsIn(hero.c, now, today)}
        </span>
        <Headline title={hero.c.title} />
        <span className="text-[14px] text-white/80">
          {hero.c.instructor ? `With ${hero.c.instructor}` : 'Open session'} · {time(hero.c.start)} to {time(endOf(hero.c))}
        </span>
      </button>

      {waitlisted && hero.e.position && (
        <div className="pt-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-pink-tint px-3 py-1.5 text-[13px] font-medium text-pink-text">
            <QueueBars position={hero.e.position} total={hero.c.waiting + 1} width={8} />
            Waitlist · {hero.e.position} of {hero.c.waiting + 1}
          </span>
        </div>
      )}

      <div className="flex items-center gap-6 pt-5">
        {waitlisted ? null : inCalendar(hero.c.id) ? (
          <span className="flex items-center gap-2 text-[15px] font-medium text-white/70">
            <Check size={17} strokeWidth={2.4} />
            In your calendar
          </span>
        ) : (
          <button type="button" className="flex items-center gap-2 text-[15px] font-medium" onClick={() => addToCalendar(hero.c.id)}>
            <CalendarPlus size={18} />
            <span className="underline underline-offset-2">Add to calendar</span>
          </button>
        )}
        <button
          type="button"
          className="flex items-center gap-2 text-[15px] font-medium"
          onClick={() => (waitlisted ? leaveWaitlist(hero.c.id) : cancel(hero.c.id))}
        >
          <Close size={15} />
          <span className="underline underline-offset-2">{waitlisted ? 'Leave waitlist' : 'Cancel'}</span>
        </button>
      </div>

      {later.length > 0 && (
        <div className="flex flex-col pt-[26px]">
          <span className="pb-1.5 text-[12px] font-medium text-white/60">
            Later {isSameDay(hero.c.start, today) ? 'today' : 'that day'}
          </span>
          {later.map(({ e, c }) => (
            <button
              key={c.id}
              type="button"
              onClick={() => navigate(`/class/${c.id}`)}
              className="flex items-center gap-3.5 border-t border-white/15 py-3.5 text-left last:pb-0"
            >
              <span className="flex w-[50px] shrink-0 flex-col">
                <span className="text-[16px] font-medium">{time(c.start)}</span>
                <span className="text-[12px] text-white/60">{c.durationMin} min</span>
              </span>
              <span className="flex flex-1 flex-col items-start gap-1.5">
                <span className="text-[15px] font-medium">{c.title}</span>
                {e.status === 'booked' ? (
                  <Tag kind="booked">Booked</Tag>
                ) : (
                  <Tag kind="waitlist">Waitlist · {ordinal(e.position ?? 1)} in line</Tag>
                )}
              </span>
              <ChevronRight size={16} className="text-white/50" />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function GymCheckIn() {
  const { now, checkIn, doCheckIn, gymCheck } = useStore();
  const slot = nextGymSlot(now);
  const active = checkIn && addMinutes(new Date(checkIn.slot), 30) > now ? new Date(checkIn.slot) : null;
  const failed = !gymCheck.busy && gymCheck.last && !gymCheck.last.ok ? gymCheck.last : null;

  const sendDetails = () => {
    const text = `Glasgow Club check-in details\n\n${localStorage.getItem('gym-last-checkin') ?? ''}`;
    if (navigator.share) navigator.share({ title: 'Check-in details', text }).catch(() => {});
    else navigator.clipboard?.writeText(text);
  };

  return (
    <section className="flex flex-col gap-3 bg-teal px-5 py-5 text-white">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-[3px]">
          <span className="flex items-center gap-1.5 text-[12px] font-medium text-white/80">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-teal-dot opacity-75 motion-safe:animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-teal-dot" />
            </span>
            Glasgow Club Gym · Gorbals
          </span>
          <span className="text-[20px] font-medium">
            {active ? `You're in for ${time(active)}` : gymCheck.busy ? `Booking ${time(slot)}…` : `Next slot ${time(slot)}`}
          </span>
        </div>
        {active ? (
          <Pill variant="teal" size="lg" className="h-[46px] px-5" disabled>
            <Check size={16} strokeWidth={2.4} />
            Checked in
          </Pill>
        ) : gymCheck.busy ? (
          <Pill variant="teal" size="lg" className="h-[46px] px-5" disabled>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-teal border-t-transparent" />
            Booking
          </Pill>
        ) : (
          <Pill variant="teal" size="lg" className="h-[46px] px-[22px]" onClick={() => doCheckIn(slot)}>
            Check in
          </Pill>
        )}
      </div>
      {failed && (
        <div className="flex flex-col gap-1.5 border-t border-white/15 pt-3 text-[13px]">
          <span className="text-white/85">{failed.message ?? "Couldn't book the slot."}</span>
          <span className="flex gap-4 font-medium">
            {inApp() && (
              <button type="button" className="underline underline-offset-2" onClick={() => showGlasgowClub()}>
                See what happened
              </button>
            )}
            <button type="button" className="underline underline-offset-2" onClick={sendDetails}>
              Send details
            </button>
          </span>
        </div>
      )}
    </section>
  );
}

function JustReleased() {
  const navigate = useNavigate();
  const { classes, entryFor, book, isPending } = useStore();
  // Classes Glasgow Club opened for booking in the last day (they open at 9pm, eight days ahead). G-Cycle first.
  const released = classes
    .filter((c) => c.justReleased)
    .sort((a, b) => Number(b.category === 'Cycle') - Number(a.category === 'Cycle') || a.start.getTime() - b.start.getTime())
    .slice(0, 4);
  if (released.length === 0) return null;

  return (
    <section className="flex flex-col px-5 pb-2 pt-6">
      <h2 className="pb-4 text-[17px] font-medium">Just released</h2>
      {released.map((c) => {
        const entry = entryFor(c.id);
        return (
          <div key={c.id} className="flex items-center gap-3.5 pb-4">
            <button type="button" className="flex flex-1 flex-col gap-0.5 text-left" onClick={() => navigate(`/class/${c.id}`)}>
              <span className="text-[12px] text-muted">
                {shortDay(c.start)} · {time(c.start)}
              </span>
              <span className="text-[15px] font-medium">{c.title}</span>
              <span className="text-[13px] text-muted">
                {c.instructor || 'Open session'}
                {spacesLeft(c, entry) > 0 && ` · ${spacesLabel(spacesLeft(c, entry))}`}
              </span>
            </button>
            {entry ? (
              <Tag kind="booked">Booked</Tag>
            ) : spacesLeft(c, entry) === 0 ? (
              <Tag>Full</Tag>
            ) : isPending(c.id) ? (
              <Pill disabled>Booking…</Pill>
            ) : (
              <Pill onClick={() => book(c.id)}>Book</Pill>
            )}
          </div>
        );
      })}
    </section>
  );
}

export function Today() {
  const { entries, byId, now } = useStore();
  const items: Item[] = entries
    .map((e) => ({ e, c: byId(e.classId) as GymClass }))
    .filter((x) => x.c && endOf(x.c) > now)
    .sort((a, b) => a.c.start.getTime() - b.c.start.getTime());
  // Lead with the next class you're booked on; waitlists follow it.
  const firstBooked = items.findIndex((x) => x.e.status === 'booked');
  const ordered = firstBooked > 0 ? [items[firstBooked], ...items.filter((_, i) => i !== firstBooked)] : items;

  return (
    <div className="flex flex-col">
      <header className="pt-safe bg-ink px-5 pb-5 text-white">
        <h1 className="pt-2 text-[26px] font-medium leading-[30px] tracking-[-0.01em]">Today</h1>
      </header>
      <NextUp items={ordered} />
      <GymCheckIn />
      <JustReleased />
    </div>
  );
}
