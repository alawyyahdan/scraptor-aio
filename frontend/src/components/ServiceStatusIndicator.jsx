import { useEffect, useRef, useState } from 'react';
import { apiUrl } from '../utils/apiFetch';

const POLL_MS = 45_000;
const TIMEOUT_MS = 8_000;

/**
 * Service reachability + maintenance. Use variant="dot" for sidebar: colored dot only, tooltip English.
 */
export default function ServiceStatusIndicator({
  maintenanceEnabled,
  compact = false,
  variant = 'full',
}) {
  const [loading, setLoading] = useState(true);
  const [up, setUp] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const tipRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (maintenanceEnabled) {
      setLoading(false);
      setUp(false);
      return undefined;
    }

    let cancelled = false;

    const ping = async () => {
      const ac = new AbortController();
      timerRef.current = window.setTimeout(() => ac.abort(), TIMEOUT_MS);
      try {
        const res = await fetch(apiUrl('/api/public/config'), {
          method: 'GET',
          cache: 'no-store',
          signal: ac.signal,
        });
        if (!cancelled) setUp(res.ok);
      } catch {
        if (!cancelled) setUp(false);
      } finally {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (!cancelled) setLoading(false);
      }
    };

    setLoading(true);
    ping();
    const id = window.setInterval(ping, POLL_MS);
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      clearInterval(id);
    };
  }, [maintenanceEnabled]);

  let label = 'Offline';
  let dotClass = 'bg-red-500';
  let textClass = 'text-red-600 dark:text-red-400';

  if (maintenanceEnabled) {
    label = 'Maintenance';
    dotClass = 'bg-amber-400';
    textClass = 'text-amber-700 dark:text-amber-300';
  } else if (loading) {
    label = 'Checking…';
    dotClass = 'bg-slate-400 animate-pulse';
    textClass = 'text-slate-500 dark:text-slate-400';
  } else if (up) {
    label = 'Online';
    dotClass = 'bg-emerald-500';
    textClass = 'text-emerald-700 dark:text-emerald-400';
  }

  const detail = maintenanceEnabled
    ? 'Public site is in maintenance mode.'
    : loading
      ? 'Checking API reachability…'
      : up
        ? 'API responds OK.'
        : 'API unreachable or error.';

  const titleAttr = `Service Status: ${label} — ${detail}`;

  useEffect(() => {
    if (!tipOpen) return undefined;
    const onDoc = (e) => {
      if (tipRef.current && !tipRef.current.contains(e.target)) setTipOpen(false);
    };
    document.addEventListener('click', onDoc, true);
    return () => document.removeEventListener('click', onDoc, true);
  }, [tipOpen]);

  if (variant === 'dot') {
    return (
      <div className="relative flex shrink-0" ref={tipRef}>
        <button
          type="button"
          className="flex h-12 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200/80 bg-slate-100 text-slate-700 transition hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          title={titleAttr}
          aria-label={titleAttr}
          aria-expanded={tipOpen}
          onClick={() => setTipOpen((v) => !v)}
        >
          <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} aria-hidden />
        </button>
        {tipOpen ? (
          <div
            className="absolute bottom-full left-1/2 z-50 mb-2 w-52 -translate-x-1/2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs font-medium text-slate-700 shadow-lg dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            role="tooltip"
          >
            <p className="font-bold text-slate-900 dark:text-white">Service Status</p>
            <p className={`mt-1 ${textClass}`}>{label}</p>
            <p className="mt-1 text-[11px] font-normal leading-snug text-slate-500 dark:text-slate-400">
              {detail}
            </p>
          </div>
        ) : null}
      </div>
    );
  }

  if (compact) {
    return (
      <div
        className="flex shrink-0 items-center gap-1.5 rounded-lg px-1.5 py-1"
        title={titleAttr}
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} aria-hidden />
        <span className={`max-w-[3.25rem] truncate text-[10px] font-semibold ${textClass}`}>
          {maintenanceEnabled ? 'Maint' : loading ? '…' : up ? 'On' : 'Off'}
        </span>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-2 pt-1" title={titleAttr}>
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotClass}`} aria-hidden />
      <span className={`text-xs font-semibold tabular-nums ${textClass}`}>{label}</span>
    </div>
  );
}
