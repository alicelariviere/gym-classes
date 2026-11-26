import { useEffect, useState } from 'react';
import { useStore, type Toast } from '../store';

/** Confirms an action for a moment, then slides away. */
export function ToastBanner() {
  const { toast } = useStore();
  const [shown, setShown] = useState<Toast | null>(null);

  useEffect(() => {
    if (!toast) return;
    setShown(toast);
    const t = window.setTimeout(() => setShown(null), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  if (!shown) return null;
  const dot = shown.kind === 'booked' ? 'bg-aqua' : shown.kind === 'waitlist' ? 'bg-pink' : 'bg-white/20';

  return (
    <div
      key={shown.id}
      role="status"
      className="toast-in fixed inset-x-0 z-50 mx-auto flex w-[calc(100%-20px)] max-w-[410px] items-center gap-3 rounded-2xl bg-ink px-4 py-3.5 text-[15px] font-medium text-white shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
      style={{ top: 'calc(env(safe-area-inset-top) + 10px)' }}
      onClick={() => setShown(null)}
    >
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${dot}`}>
        {shown.kind === 'info' ? (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M7 17L17 7M9 7h8v8" />
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        )}
      </span>
      {shown.text}
    </div>
  );
}
