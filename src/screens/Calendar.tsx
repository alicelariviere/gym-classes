import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { STUDIOS } from '../data/sample';
import { dayKey, fromDayKey, isSameDay, longDay, monthYear } from '../lib/dates';
import { useStore } from '../store';
import { Close } from '../components/Icons';
import { IconButton, Pill } from '../components/ui';

type Dot = 'alt' | 'gc' | 'waitlist';
const DOT_COLOUR: Record<Dot, string> = {
  alt: STUDIOS.alt.dot,
  gc: STUDIOS.gc.dot,
  waitlist: 'var(--color-pink)',
};

function monthDays(first: Date): (Date | null)[] {
  const year = first.getFullYear();
  const month = first.getMonth();
  const count = new Date(year, month + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7; // Monday-first
  return [...Array.from({ length: lead }, () => null), ...Array.from({ length: count }, (_, i) => new Date(year, month, i + 1))];
}

export function CalendarScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const back = params.get('back') || '/classes';
  const { today, selectedDay, selectDay, entries, byId } = useStore();
  const [pending, setPending] = useState(selectedDay);

  const dots = useMemo(() => {
    const map = new Map<string, Dot[]>();
    for (const e of entries) {
      const c = byId(e.classId);
      if (!c) continue;
      const k = dayKey(c.start);
      const dot: Dot = e.status === 'waitlist' ? 'waitlist' : c.studio;
      const list = map.get(k) ?? [];
      if (!list.includes(dot)) map.set(k, [...list, dot]);
    }
    return map;
  }, [entries, byId]);

  const months = [0, 1, 2].map((n) => new Date(today.getFullYear(), today.getMonth() + n, 1));
  const pendingDate = fromDayKey(pending);

  const confirm = () => {
    selectDay(pending);
    navigate(back, { replace: true });
  };

  return (
    <div className="flex h-full flex-col">
      <header className="pt-safe sticky top-0 z-10 bg-white">
        <div className="flex items-center justify-between px-5 pb-3 pt-1">
          <IconButton label="Close" className="h-9 w-9 border border-outline" onClick={() => navigate(-1)}>
            <Close size={16} />
          </IconButton>
          <span className="text-[17px] font-medium">Calendar</span>
          <button type="button" className="text-[14px] font-medium" onClick={() => setPending(dayKey(today))}>
            Today
          </button>
        </div>
        <div className="grid grid-cols-7 border-b border-line px-5 py-2 text-center text-[11px] text-[#8A8A8A]">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-44">
        {months.map((m, mi) => (
          <section key={mi} className={`flex flex-col gap-1.5 px-5 pb-2.5 pt-[18px] ${mi ? 'border-t border-[#F0F0F0]' : ''}`}>
            <h2 className="pb-1.5 text-[17px] font-medium">{monthYear(m)}</h2>
            <div className="grid grid-cols-7 gap-y-1.5">
              {monthDays(m).map((d, i) => {
                if (!d) return <span key={i} />;
                const k = dayKey(d);
                const isToday = isSameDay(d, today);
                const selected = k === pending;
                const past = d < today;
                return (
                  <button key={i} type="button" onClick={() => setPending(k)} className="flex flex-col items-center gap-[3px]">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-[10px] text-[15px] ${
                        selected ? 'bg-ink font-medium text-white' : isToday ? 'border-[1.5px] border-ink' : past ? 'text-faint' : ''
                      }`}
                    >
                      {d.getDate()}
                    </span>
                    <span className="flex h-[5px] gap-[3px]">
                      {(dots.get(k) ?? []).map((dot) => (
                        <span key={dot} className="h-[5px] w-[5px] rounded-full" style={{ background: DOT_COLOUR[dot] }} />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <footer className="pb-safe fixed bottom-0 left-1/2 flex w-full max-w-[430px] -translate-x-1/2 flex-col gap-3.5 border-t border-line bg-white px-5 pt-3.5">
        <div className="flex items-center gap-3 text-[11px] text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded border-[1.5px] border-ink" />
            Today
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded bg-ink" />
            Selected
          </span>
          {(['alt', 'gc', 'waitlist'] as Dot[]).map((d) => (
            <span key={d} className="flex items-center gap-[5px] whitespace-nowrap">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: DOT_COLOUR[d] }} />
              {d === 'alt' ? 'ALT' : d === 'gc' ? 'Glasgow Club' : 'Waitlist'}
            </span>
          ))}
        </div>
        <Pill size="lg" className="w-full" onClick={confirm}>
          {isSameDay(pendingDate, today) ? 'Show today' : `Show ${longDay(pendingDate)}`}
        </Pill>
      </footer>
    </div>
  );
}
