import { useNavigate } from 'react-router-dom';
import type { MouseEvent } from 'react';
import { STUDIOS } from '../data/sample';
import type { Entry, GymClass } from '../data/types';
import { time } from '../lib/dates';
import { isFull, positionLabel, spacesLabel, spacesLeft, waitlistTotal } from '../lib/classes';
import { useStore } from '../store';
import { Pill, QueueBars, StudioDot, Tag } from './ui';

export function ClassRow({ cls, entry, mode = 'classes' }: { cls: GymClass; entry?: Entry; mode?: 'classes' | 'bookings' }) {
  const navigate = useNavigate();
  const { book, cancel, joinWaitlist, leaveWaitlist, now } = useStore();
  const studio = STUDIOS[cls.studio];
  const booked = entry?.status === 'booked';
  const waitlisted = entry?.status === 'waitlist';
  const full = isFull(cls, entry);
  const spaces = spacesLeft(cls, entry);
  const past = cls.start < now;

  const tint = waitlisted ? 'bg-pink-tint' : booked && mode === 'classes' ? 'bg-aqua-tint' : '';

  const act = (fn: (id: string) => void) => (e: MouseEvent) => {
    e.stopPropagation();
    fn(cls.id);
  };

  let meta = cls.instructor;
  if (waitlisted) meta = `${cls.instructor} · full, ${waitlistTotal(cls, entry)} waiting`;
  else if (mode === 'classes' && !booked && !full && spaces > 3) meta = `${cls.instructor} · ${spacesLabel(spaces)}`;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/class/${cls.id}`)}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/class/${cls.id}`)}
      className={`flex items-center gap-3.5 px-5 py-4 text-left active:opacity-80 ${tint} ${past ? 'opacity-50' : ''}`}
    >
      <div className="flex w-[50px] shrink-0 flex-col">
        <span className="text-[16px] font-medium">{time(cls.start)}</span>
        <span className="text-[12px] text-muted">{cls.durationMin} min</span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col items-start gap-[5px]">
        <span className="text-[15px] font-medium leading-5">{cls.title}</span>
        {mode === 'bookings' && !waitlisted ? (
          <span className="flex items-center gap-[5px] text-[13px]" style={{ color: cls.studio === 'gc' ? studio.dot : 'var(--color-muted)' }}>
            <StudioDot color={studio.dot} />
            {cls.studio === 'alt' ? 'ALT' : studio.name} · {cls.instructor}
          </span>
        ) : (
          <span className="text-[13px] text-muted">{meta}</span>
        )}

        {mode === 'classes' && booked && <Tag kind="bookedOnTint">Booked</Tag>}
        {waitlisted && entry && (
          <span className="flex items-center gap-2">
            <QueueBars position={entry.position ?? 1} total={waitlistTotal(cls, entry)} />
            <span className="text-[13px] font-medium text-pink-text">{positionLabel(entry)}</span>
          </span>
        )}
        {mode === 'classes' && !entry && full && <Tag>Full · {cls.waiting} waiting</Tag>}
        {mode === 'classes' && !entry && !full && spaces <= 3 && <Tag>{spacesLabel(spaces)}</Tag>}
      </div>

      {!past &&
        (booked ? (
          <Pill variant="outline" onClick={act(cancel)}>
            Cancel
          </Pill>
        ) : waitlisted ? (
          <Pill variant="outline" onClick={act(leaveWaitlist)}>
            Leave
          </Pill>
        ) : full ? (
          <Pill variant="outline" onClick={act(joinWaitlist)}>
            Join waitlist
          </Pill>
        ) : (
          <Pill onClick={act(book)}>Book</Pill>
        ))}
    </div>
  );
}
