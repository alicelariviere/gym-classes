import type { Category, GymClass, Level } from '../data/types';
import { Close } from './Icons';
import { IconButton, Pill } from './ui';

export type TimeOfDay = 'Morning' | 'Afternoon' | 'Evening';

export interface Filters {
  categories: Category[];
  levels: Level[];
  instructors: string[];
  times: TimeOfDay[];
  onlySpaces: boolean;
}

export const NO_FILTERS: Filters = { categories: [], levels: [], instructors: [], times: [], onlySpaces: false };

export function timeOfDay(d: Date): TimeOfDay {
  const h = d.getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}

export function filterCount(f: Filters): number {
  return f.categories.length + f.levels.length + f.instructors.length + f.times.length + (f.onlySpaces ? 1 : 0);
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-full px-4 py-2 text-[14px] ${selected ? 'bg-ink font-medium text-white' : 'border border-outline text-ink'}`}
    >
      {children}
    </button>
  );
}

function Section<T extends string>({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: T[];
  selected: T[];
  onToggle: (v: T) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div className="flex flex-col gap-2.5 pb-5">
      <span className="text-[14px] font-medium">{title}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <Chip key={o} selected={selected.includes(o)} onClick={() => onToggle(o)}>
            {o}
          </Chip>
        ))}
      </div>
    </div>
  );
}

export function FilterSheet({
  open,
  filters,
  onChange,
  onClose,
  pool,
  resultCount,
}: {
  open: boolean;
  filters: Filters;
  onChange: (f: Filters) => void;
  onClose: () => void;
  /** All classes for the studio, used to build the options. */
  pool: GymClass[];
  resultCount: number;
}) {
  if (!open) return null;
  const uniq = <T,>(xs: T[]) => [...new Set(xs)];
  const categories = uniq(pool.map((c) => c.category));
  const levels = (['Beginners', 'All levels', 'Experienced'] as Level[]).filter((l) => pool.some((c) => c.level === l));
  const instructors = uniq(pool.map((c) => c.instructor)).sort();
  const times = (['Morning', 'Afternoon', 'Evening'] as TimeOfDay[]).filter((t) => pool.some((c) => timeOfDay(c.start) === t));

  return (
    <div className="fixed inset-0 z-40 flex justify-center">
      <button type="button" aria-label="Close filters" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="pb-safe absolute bottom-0 flex max-h-[88vh] w-full max-w-[430px] flex-col overflow-y-auto rounded-t-[20px] bg-white px-5 pt-2.5">
        <div className="flex justify-center pb-2.5">
          <span className="h-[5px] w-9 rounded-full bg-[#D9D9D9]" />
        </div>
        <div className="flex items-center justify-between pb-[18px]">
          <IconButton label="Close" className="h-8 w-8 border border-outline" onClick={onClose}>
            <Close size={14} />
          </IconButton>
          <span className="text-[17px] font-medium">Filters</span>
          <button type="button" className="w-8 text-right text-[14px] font-medium text-muted" onClick={() => onChange(NO_FILTERS)}>
            Clear
          </button>
        </div>

        <Section title="Class type" options={categories} selected={filters.categories} onToggle={(v) => onChange({ ...filters, categories: toggle(filters.categories, v) })} />
        <Section title="Level" options={levels} selected={filters.levels} onToggle={(v) => onChange({ ...filters, levels: toggle(filters.levels, v) })} />
        <Section title="Instructor" options={instructors} selected={filters.instructors} onToggle={(v) => onChange({ ...filters, instructors: toggle(filters.instructors, v) })} />
        <Section title="Time of day" options={times} selected={filters.times} onToggle={(v) => onChange({ ...filters, times: toggle(filters.times, v) })} />

        <label className="flex items-center justify-between border-t border-[#EFEFEF] pb-[22px] pt-3.5">
          <span className="text-[15px]">Only classes with spaces</span>
          <input
            type="checkbox"
            className="peer sr-only"
            checked={filters.onlySpaces}
            onChange={(e) => onChange({ ...filters, onlySpaces: e.target.checked })}
          />
          <span className="relative h-[30px] w-[50px] rounded-full bg-[#E5E5E5] transition-colors peer-checked:bg-ink after:absolute after:left-0.5 after:top-0.5 after:h-[26px] after:w-[26px] after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5" />
        </label>

        <Pill size="lg" className="w-full" onClick={onClose}>
          Show {resultCount} {resultCount === 1 ? 'class' : 'classes'}
        </Pill>
      </div>
    </div>
  );
}
