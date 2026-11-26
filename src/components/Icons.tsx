import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };

const base = (size = 20, props: P) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...props,
});

export const ChevronLeft = ({ size, ...p }: P) => (
  <svg {...base(size, { strokeWidth: 2, ...p })}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);
export const ChevronRight = ({ size, ...p }: P) => (
  <svg {...base(size, { strokeWidth: 2, ...p })}>
    <path d="M9 5l7 7-7 7" />
  </svg>
);
export const Calendar = ({ size, ...p }: P) => (
  <svg {...base(size, { strokeWidth: 1.8, ...p })}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </svg>
);
export const CalendarPlus = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="1.5" />
    <path d="M3.5 10h17M8 3v4M16 3v4M12 13v5M9.5 15.5h5" />
  </svg>
);
export const Clock = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);
export const Bars = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M5 20V12M10 20V6M15 20v-9M20 20V4" />
  </svg>
);
export const Search = ({ size, ...p }: P) => (
  <svg {...base(size, { strokeWidth: 1.5, ...p })}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" />
  </svg>
);
export const Sliders = ({ size, ...p }: P) => (
  <svg {...base(size, { strokeWidth: 1.8, ...p })}>
    <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="8" cy="17" r="2" />
  </svg>
);
export const Check = ({ size, ...p }: P) => (
  <svg {...base(size, { strokeWidth: 3, ...p })}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);
export const Close = ({ size, ...p }: P) => (
  <svg {...base(size, { strokeWidth: 2, ...p })}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
export const Share = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M12 4v11M7.5 8.5L12 4l4.5 4.5M5 14v5h14v-5" />
  </svg>
);
export const Pin = ({ size, ...p }: P) => (
  <svg {...base(size, { strokeWidth: 1.5, ...p })}>
    <path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" />
    <circle cx="12" cy="10" r="2.2" />
  </svg>
);
export const People = ({ size, ...p }: P) => (
  <svg {...base(size, { strokeWidth: 1.5, ...p })}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3.5 19c.8-3.2 3-5 5.5-5s4.7 1.8 5.5 5M15.5 5.5a3 3 0 0 1 0 5.5M17 14c2 .6 3.2 2.2 3.5 5" />
  </svg>
);
export const HoopIcon = ({ size, ...p }: P) => (
  <svg {...base(size, { strokeWidth: 1.5, ...p })}>
    <path d="M12 1.5v4" />
    <circle cx="12" cy="13.5" r="7.5" />
  </svg>
);
export const SilksIcon = ({ size, ...p }: P) => (
  <svg {...base(size, { strokeWidth: 1.5, ...p })}>
    <path d="M10 2c0 8-2 14-3 20M14 2c0 8 2 14 3 20" />
  </svg>
);
export const BikeIcon = ({ size, ...p }: P) => (
  <svg {...base(size, { strokeWidth: 1.5, ...p })}>
    <circle cx="6" cy="16" r="4" />
    <circle cx="18" cy="16" r="4" />
    <path d="M6 16l4-8h5l3 8M10 8l2 8" />
  </svg>
);
export const StretchIcon = ({ size, ...p }: P) => (
  <svg {...base(size, { strokeWidth: 1.5, ...p })}>
    <path d="M3 19c3-9 15-9 18 0" />
    <circle cx="12" cy="7" r="2" />
  </svg>
);
export const WeightIcon = ({ size, ...p }: P) => (
  <svg {...base(size, { strokeWidth: 1.5, ...p })}>
    <path d="M7 12h10" />
    <rect x="3.5" y="8" width="3.5" height="8" />
    <rect x="17" y="8" width="3.5" height="8" />
  </svg>
);
