import { useMemo, useState } from 'react';
import { STUDIOS } from '../data/sample';
import type { StudioId } from '../data/types';
import { dayKey, time } from '../lib/dates';
import { spacesLeft } from '../lib/classes';
import { useStore } from '../store';
import { ClassRow } from '../components/ClassRow';
import { DateNav } from '../components/DateNav';
import { FilterSheet, NO_FILTERS, filterCount, timeOfDay, type Filters } from '../components/FilterSheet';
import { Search, Sliders } from '../components/Icons';
import { IconButton } from '../components/ui';

export function Classes() {
  const { classes, selectedDay, studio, setStudio, entryFor, alt } = useStore();
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);

  const pool = useMemo(() => classes.filter((c) => c.studio === studio), [classes, studio]);

  const visible = pool.filter((c) => {
    if (dayKey(c.start) !== selectedDay) return false;
    if (filters.categories.length && !filters.categories.includes(c.category)) return false;
    if (filters.levels.length && !filters.levels.includes(c.level)) return false;
    if (filters.instructors.length && !filters.instructors.includes(c.instructor)) return false;
    if (filters.times.length && !filters.times.includes(timeOfDay(c.start))) return false;
    if (filters.onlySpaces && spacesLeft(c, entryFor(c.id)) === 0 && !entryFor(c.id)) return false;
    return true;
  });

  const switchStudio = (id: StudioId) => {
    setStudio(id);
    setFilters(NO_FILTERS);
  };
  const count = filterCount(filters);

  return (
    <div className="flex flex-col">
      <header className="pt-safe flex flex-col gap-4 px-5">
        <div className="flex items-center justify-between pt-2">
          <h1 className="text-[26px] font-medium leading-[30px] tracking-[-0.01em]">Classes</h1>
          <IconButton label="Search" className="h-10 w-10 -mr-2">
            <Search size={22} />
          </IconButton>
        </div>
        <DateNav />
        <div className="flex gap-7 border-b border-line">
          {(Object.keys(STUDIOS) as StudioId[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => switchStudio(id)}
              className={`-mb-px pb-[11px] text-[15px] ${studio === id ? 'border-b-2 border-ink font-medium text-ink' : 'text-[#8A8A8A]'}`}
            >
              {STUDIOS[id].name}
            </button>
          ))}
          <span className="flex-1" />
          <button type="button" onClick={() => setSheetOpen(true)} className="flex items-center gap-1.5 pb-[11px] text-[15px] font-medium">
            <Sliders size={16} />
            Filters
            {count > 0 && <span className="rounded-full bg-ink px-1.5 text-[11px] leading-[18px] text-white">{count}</span>}
          </button>
        </div>
      </header>

      <div className="flex flex-col">
        {visible.length === 0 ? (
          <p className="px-5 py-10 text-center text-[14px] text-muted">
            {studio === 'alt' && alt.status === 'loading' && !alt.updatedAt
              ? "Loading ALT's timetable…"
              : studio === 'alt' && alt.status === 'offline' && !alt.updatedAt
                ? "Couldn't reach TeamUp. Check your connection and try again."
                : count
                  ? 'No classes match your filters on this day.'
                  : 'No classes on this day.'}
          </p>
        ) : (
          visible.map((c) => <ClassRow key={c.id} cls={c} entry={entryFor(c.id)} />)
        )}
      </div>

      {studio === 'alt' && alt.updatedAt && (
        <p className="px-5 pb-6 pt-2 text-center text-[12px] text-faint">
          {alt.status === 'offline' ? "Offline. Showing ALT's timetable" : 'Live from TeamUp'}, updated {time(new Date(alt.updatedAt))}
        </p>
      )}

      <FilterSheet
        open={sheetOpen}
        filters={filters}
        onChange={setFilters}
        onClose={() => setSheetOpen(false)}
        pool={pool}
        resultCount={visible.length}
      />
    </div>
  );
}
