import { useNavigate } from 'react-router-dom';
import type { Entry, GymClass } from '../data/types';
import { dayAndDate, dayKey, fromDayKey, isSameDay } from '../lib/dates';
import { endOf } from '../lib/classes';
import { useStore } from '../store';
import { ClassRow } from '../components/ClassRow';
import { DateNav } from '../components/DateNav';
import { Pill } from '../components/ui';

export function Bookings() {
  const navigate = useNavigate();
  const { entries, byId, selectedDay, today, now } = useStore();
  const from = fromDayKey(selectedDay);

  const items = entries
    .map((e) => ({ e, c: byId(e.classId) as GymClass }))
    .filter((x) => x.c && dayKey(x.c.start) >= selectedDay && endOf(x.c) > now)
    .sort((a, b) => a.c.start.getTime() - b.c.start.getTime());

  const groups = new Map<string, { e: Entry; c: GymClass }[]>();
  for (const it of items) {
    const k = dayKey(it.c.start);
    groups.set(k, [...(groups.get(k) ?? []), it]);
  }

  const booked = items.filter((x) => x.e.status === 'booked').length;
  const waiting = items.length - booked;

  return (
    <div className="flex flex-col">
      <header className="pt-safe px-5">
        <h1 className="pt-2 text-[26px] font-medium leading-[30px] tracking-[-0.01em]">Bookings</h1>
      </header>
      <div className="border-b border-line px-5 pb-4 pt-2.5">
        <DateNav />
      </div>

      <div className="flex items-baseline justify-between px-5 pb-1.5 pt-5">
        <h2 className="text-[15px] font-medium">{isSameDay(from, today) ? 'Coming up' : 'From this day'}</h2>
        <span className="text-[13px] text-muted">
          {booked} booked{waiting ? ` · ${waiting} waitlist` : ''}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 px-5 py-12 text-center">
          <p className="text-[14px] text-muted">Nothing booked from this day.</p>
          <Pill onClick={() => navigate('/classes')}>Find a class</Pill>
        </div>
      ) : (
        [...groups.entries()].map(([k, list]) => {
          const d = fromDayKey(k);
          return (
            <div key={k} className="flex flex-col">
              <span className="px-5 pt-3 text-[12px] font-medium text-[#8A8A8A]">
                {isSameDay(d, today) ? `Today · ${dayAndDate(d)}` : dayAndDate(d)}
              </span>
              {list.map(({ e, c }) => (
                <ClassRow key={c.id} cls={c} entry={e} mode="bookings" />
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}
