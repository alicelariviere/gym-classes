import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Check } from './Icons';

type Variant = 'primary' | 'outline' | 'white' | 'teal';

const variants: Record<Variant, string> = {
  primary: 'bg-ink text-white',
  outline: 'border border-outline text-ink bg-transparent',
  white: 'bg-white text-ink',
  teal: 'bg-white text-teal',
};

export function Pill({
  variant = 'primary',
  size = 'sm',
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'lg'; children: ReactNode }) {
  const sizing = size === 'lg' ? 'h-[50px] px-6 text-[16px]' : 'h-9 px-4 text-[14px]';
  return (
    <button
      type="button"
      className={`inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full [&_svg]:shrink-0 font-medium transition-opacity active:opacity-70 disabled:opacity-40 ${sizing} ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function IconButton({
  label,
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`inline-flex shrink-0 items-center justify-center rounded-full transition-opacity active:opacity-60 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

type TagKind = 'info' | 'booked' | 'bookedOnTint' | 'waitlist';

export function Tag({ kind = 'info', children }: { kind?: TagKind; children: ReactNode }) {
  const styles: Record<TagKind, string> = {
    info: 'bg-soft text-ink',
    booked: 'bg-aqua-tint text-aqua-text',
    bookedOnTint: 'bg-white text-aqua-text',
    waitlist: 'bg-pink-tint text-pink-text',
  };
  const tick = kind === 'booked' || kind === 'bookedOnTint';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-[11px] py-1 text-[12px] font-medium leading-4 ${styles[kind]}`}>
      {tick && <Check size={12} className="text-aqua" />}
      {children}
    </span>
  );
}

/** Waitlist queue: one bar per person, yours in strong pink. */
export function QueueBars({ position, total, width = 14 }: { position: number; total: number; width?: number }) {
  const bars = Array.from({ length: Math.max(total, position) }, (_, i) => i + 1);
  return (
    <span className="inline-flex gap-[3px]" aria-hidden>
      {bars.map((n) => (
        <span
          key={n}
          className="h-1 rounded-sm"
          style={{
            width,
            background: n < position ? 'var(--color-pink-ahead)' : n === position ? 'var(--color-pink)' : 'var(--color-pink-rest)',
          }}
        />
      ))}
    </span>
  );
}

export function StudioDot({ color, size = 6 }: { color: string; size?: number }) {
  return <span className="inline-block shrink-0 rounded-full" style={{ width: size, height: size, background: color }} />;
}
