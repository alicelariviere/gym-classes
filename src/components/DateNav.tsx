import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { addDays, dayKey, fromDayKey, isSameDay, longDay } from '../lib/dates';
import { Calendar, ChevronLeft, ChevronRight } from './Icons';
import { IconButton } from './ui';

/** "Today" or the selected date, with day arrows and a button to the full calendar. */
export function DateNav() {
  const { selectedDay, selectDay, today } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const day = fromDayKey(selectedDay);
  const label = isSameDay(day, today) ? 'Today' : longDay(day);

  const step = (n: number) => selectDay(dayKey(addDays(day, n)));

  return (
    <div className="flex items-center justify-between">
      <IconButton label="Previous day" className="-ml-1 h-10 w-10 justify-start" onClick={() => step(-1)}>
        <ChevronLeft size={20} />
      </IconButton>
      <div className="flex items-center gap-2.5">
        <span className="text-[18px] font-medium">{label}</span>
        <IconButton
          label="Open calendar"
          className="h-10 w-10 border border-outline"
          onClick={() => navigate(`/calendar?back=${encodeURIComponent(location.pathname)}`)}
        >
          <Calendar size={19} />
        </IconButton>
      </div>
      <IconButton label="Next day" className="-mr-1 h-10 w-10 justify-end" onClick={() => step(1)}>
        <ChevronRight size={20} />
      </IconButton>
    </div>
  );
}
