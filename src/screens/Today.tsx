import { Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { STUDIOS } from '../data/sample';
import type { Entry, GymClass } from '../data/types';
import { addMinutes, isSameDay, nextGymSlot, ordinal, relativeDay, shortDay, time } from '../lib/dates';
import { endOf, spacesLabel, spacesLeft } from '../lib/classes';
import { useStore } from '../store';
import { Check, ChevronRight } from '../components/Icons';
import { Pill, QueueBars, Tag } from '../components/ui';

type Item = { e: Entry; c: GymClass };

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
  const { today, inCalendar, addToCalendar, cancel, leaveWaitlist } = useStore();

  if (items.length === 0) {
    return (
      <section className="flex flex-col gap-4 bg-ink px-5 py-7 text-white">
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
  const dayLabel = isSameDay(hero.c.start, today) ? '' : `${relativeDay(hero.c.start, today)} · `;
  const waitlisted = hero.e.status === 'waitlist';

  return (
    <section className="flex flex-col bg-ink px-5 py-7 text-white">
      <button type="button" className="flex flex-col gap-3.5 text-left" onClick={() => navigate(`/class/${hero.c.id}`)}>
        <span className="text-[13px] font-medium">
          {studio.name} · {dayLabel}
          {time(hero.c.start)} to {time(endOf(hero.c))}
        </span>
        <Headline title={hero.c.title} />
        <span className="text-[14px] text-white/80">With {hero.c.instructor}</span>
      </button>

      {waitlisted && hero.e.position && (
        <div className="pt-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-pink-tint px-3 py-1.5 text-[13px] font-medium text-pink-text">
            <QueueBars position={hero.e.position} total={hero.c.waiting + 1} width={8} />
            Waitlist · {hero.e.position} of {hero.c.waiting + 1}
          </span>
        </div>
      )}

      <div className="flex items-center gap-4 pt-[18px]">
        {waitlisted ? null : inCalendar(hero.c.id) ? (
          <Pill variant="white" size="lg" className="h-11 px-[18px]">
            <Check size={16} className="text-ink" strokeWidth={2.4} />
            In your calendar
          </Pill>
        ) : (
          <Pill variant="white" size="lg" className="h-11 px-[18px]" onClick={() => addToCalendar(hero.c.id)}>
            Add to calendar
          </Pill>
        )}
        <button
          type="button"
          className="text-[15px] font-medium underline underline-offset-2"
          onClick={() => (waitlisted ? leaveWaitlist(hero.c.id) : cancel(hero.c.id))}
        >
          {waitlisted ? 'Leave waitlist' : 'Cancel'}
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
  const { now, checkIn, doCheckIn } = useStore();
  const slot = nextGymSlot(now);
  const active = checkIn && addMinutes(new Date(checkIn.slot), 30) > now ? new Date(checkIn.slot) : null;

  return (
    <section className="flex items-center justify-between gap-3 bg-teal px-5 py-5 text-white">
      <div className="flex flex-col gap-[3px]">
        <span className="flex items-center gap-1.5 text-[12px] font-medium text-white/80">
          <span className="h-1.5 w-1.5 rounded-full bg-teal-dot" />
          Glasgow Club Gym · Gorbals
        </span>
        <span className="text-[20px] font-medium">{active ? `You're in for ${time(active)}` : `Next slot ${time(slot)}`}</span>
      </div>
      {active ? (
        <Pill variant="teal" size="lg" className="h-[46px] px-5" disabled>
          <Check size={16} strokeWidth={2.4} />
          Checked in
        </Pill>
      ) : (
        <Pill variant="teal" size="lg" className="h-[46px] px-[22px]" onClick={() => doCheckIn(slot)}>
          Check in
        </Pill>
      )}
    </section>
  );
}

function JustReleased() {
  const navigate = useNavigate();
  const { classes, entryFor, book, bookMany } = useStore();
  const released = classes.filter((c) => c.justReleased);
  const unbooked = released.filter((c) => !entryFor(c.id));
  if (released.length === 0) return null;

  return (
    <section className="flex flex-col px-5 pb-2 pt-6">
      <div className="flex flex-col gap-1 pb-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[17px] font-medium">Just released</h2>
          {unbooked.length > 1 && (
            <button type="button" className="text-[14px] font-medium" onClick={() => bookMany(unbooked.map((c) => c.id))}>
              Book all {unbooked.length}
            </button>
          )}
        </div>
        <p className="text-[14px] text-muted">Your usual ALT classes, open to book now.</p>
      </div>
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
                {c.instructor} · {spacesLabel(spacesLeft(c, entry))}
              </span>
            </button>
            {entry ? <Tag kind="booked">Booked</Tag> : <Pill onClick={() => book(c.id)}>Book</Pill>}
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
      <header className="pt-safe px-5 pb-5">
        <h1 className="pt-2 text-[26px] font-medium leading-[30px] tracking-[-0.01em]">Today</h1>
      </header>
      <NextUp items={ordered} />
      <GymCheckIn />
      <JustReleased />
    </div>
  );
}
