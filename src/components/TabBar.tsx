import { NavLink } from 'react-router-dom';
import { Bars, Calendar, Clock } from './Icons';

const tabs = [
  { to: '/', label: 'Today', Icon: Clock, end: true },
  { to: '/classes', label: 'Classes', Icon: Calendar, end: false },
  { to: '/bookings', label: 'Bookings', Icon: Bars, end: false },
];

export function TabBar() {
  return (
    <nav className="pb-safe fixed bottom-0 left-1/2 z-20 flex w-full max-w-[430px] -translate-x-1/2 justify-around border-t border-line bg-white px-6 pt-2">
      {tabs.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex w-20 flex-col items-center gap-[3px] text-[10px] ${isActive ? 'font-medium text-ink' : 'text-faint'}`
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={24} strokeWidth={isActive ? 1.8 : 1.4} />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
