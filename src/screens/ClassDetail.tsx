import { useNavigate, useParams } from 'react-router-dom';
import type { ReactNode } from 'react';
import { STUDIOS } from '../data/sample';
import type { Category } from '../data/types';
import { daysBetween, longDay, ordinal, time } from '../lib/dates';
import { bookingClosed, endOf, isFull, notOpenYet, opensLabel, spacesLabel, spacesLeft, waitlistTotal } from '../lib/classes';
import { useStore } from '../store';
import {
  BikeIcon,
  CalendarPlus,
  Check,
  ChevronLeft,
  Clock,
  Close,
  HoopIcon,
  People,
  Pin,
  SilksIcon,
  StretchIcon,
  WeightIcon,
} from '../components/Icons';
import { IconButton, Pill, QueueBars } from '../components/ui';
import { Headline } from './Today';

const CATEGORY_ICON: Partial<Record<Category, (p: { size?: number }) => ReactNode>> = {
  Hoop: HoopIcon,
  Silks: SilksIcon,
  Trapeze: HoopIcon,
  Flexibility: StretchIcon,
  Strength: WeightIcon,
  Cycle: BikeIcon,
  Pilates: StretchIcon,
  'Open gym': WeightIcon,
};

function Row({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-[15px]">
      <span className="flex w-5 justify-center">{icon}</span>
      {children}
    </div>
  );
}

export function ClassDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { byId, entryFor, today, now, book, cancel, joinWaitlist, leaveWaitlist, addToCalendar, inCalendar } = useStore();
  const c = byId(id);

  if (!c) {
    return (
      <div className="flex flex-col items-center gap-4 px-5 py-20 text-center">
        <p className="text-muted">That class isn't on the timetable any more.</p>
        <Pill onClick={() => navigate('/classes')}>Back to classes</Pill>
      </div>
    );
  }

  const entry = entryFor(c.id);
  const studio = STUDIOS[c.studio];
  const booked = entry?.status === 'booked';
  const waitlisted = entry?.status === 'waitlist';
  const full = isFull(c, entry);
  const spaces = spacesLeft(c, entry);
  const past = c.start < now;
  const opening = !entry && notOpenYet(c, now);
  const closed = !entry && bookingClosed(c, now);
  const description = c.description;
  const diff = daysBetween(today, c.start);
  const when = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : longDay(c.start);
  const CatIcon = CATEGORY_ICON[c.category];

  return (
    <div className="flex min-h-full flex-col">
      <section className="pt-safe flex flex-col bg-ink pb-7 text-white">
        <div className="flex items-center justify-between px-4 pt-1">
          <IconButton label="Back" className="h-9 w-9 bg-white/90 text-ink" onClick={() => navigate(-1)}>
            <ChevronLeft size={18} />
          </IconButton>
        </div>
        <div className="flex flex-col items-start gap-2.5 px-5 pt-7">
          <span className="text-[13px] font-medium">{studio.name}</span>
          <Headline title={c.title} />
          <span className="text-[14px] text-white/75">{c.instructor ? `With ${c.instructor}` : 'Open session, no instructor'}</span>
          {booked && (
            <span className="mt-1 inline-flex items-center gap-[5px] rounded-full bg-aqua-tint py-1.5 pl-2.5 pr-3 text-[13px] font-medium text-aqua-text">
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
                <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="var(--color-aqua)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              You're booked
            </span>
          )}
          {waitlisted && entry?.position && (
            <span className="mt-1 inline-flex items-center gap-2 rounded-full bg-pink-tint px-3 py-1.5 text-[13px] font-medium text-pink-text">
              <QueueBars position={entry.position} total={waitlistTotal(c, entry)} width={8} />
              Waitlist · {ordinal(entry.position)} of {waitlistTotal(c, entry)}
            </span>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-5 px-5 pb-10 pt-[22px]">
        <div className="flex flex-col gap-3.5">
          <Row icon={<Clock size={20} />}>
            {when}, {time(c.start)} to {time(endOf(c))}
          </Row>
          <Row icon={CatIcon ? <CatIcon size={20} /> : <People size={20} />}>
            {c.category} · {c.level}
          </Row>
          <Row icon={<Pin size={20} />}>{studio.venue}</Row>
          {!booked && !c.unlimited && !opening && (
            <Row icon={<People size={20} />}>
              <span className="rounded-full bg-soft px-[11px] py-1 text-[14px] font-medium">
                {full ? `Full · ${waitlistTotal(c, entry)} waiting` : spacesLabel(spaces)}
              </span>
            </Row>
          )}
        </div>

        {description && <p className="whitespace-pre-line text-[14px] leading-[21px] text-muted">{description}</p>}

        {!past && (opening || closed) && (
          <div className="flex items-center gap-2.5 pt-1">
            <Pill variant="outline" size="lg" className="flex-1" disabled>
              {opening ? opensLabel(c) : 'Booking closed'}
            </Pill>
          </div>
        )}

        {!past && !opening && !closed && (
          <div className="flex items-center gap-2.5 pt-1">
            {booked ? (
              <div className="grid flex-1 grid-cols-2 gap-2.5">
                <Pill size="lg" className="px-3 text-[15px]" onClick={() => addToCalendar(c.id)}>
                  {inCalendar(c.id) ? <Check size={17} strokeWidth={2.4} /> : <CalendarPlus size={18} />}
                  {inCalendar(c.id) ? 'In calendar' : 'Add to calendar'}
                </Pill>
                <Pill variant="outline" size="lg" className="px-3 text-[15px]" onClick={() => cancel(c.id)}>
                  <Close size={15} />
                  Cancel booking
                </Pill>
              </div>
            ) : waitlisted ? (
              <Pill variant="outline" size="lg" className="flex-1" onClick={() => leaveWaitlist(c.id)}>
                Leave waitlist
              </Pill>
            ) : full ? (
              <Pill size="lg" className="flex-1" onClick={() => joinWaitlist(c.id)}>
                Join waitlist
              </Pill>
            ) : (
              <Pill size="lg" className="flex-1" onClick={() => book(c.id)}>
                Book class
              </Pill>
            )}
          </div>
        )}
        {!past && !opening && !closed && !entry && c.studio === 'alt' && (
          <p className="-mt-2 text-center text-[13px] text-muted">Opens TeamUp to finish booking</p>
        )}
      </section>
    </div>
  );
}
