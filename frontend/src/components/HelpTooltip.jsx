import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';

const TIP_MAX_W = 320;
const GAP = 10;
const VIEW_MARGIN = 8;

/**
 * Tooltip ke document.body + position:fixed agar tidak terpotong oleh overflow hidden induk.
 */
export default function HelpTooltip({ text, title = 'Help' }) {
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState({ left: 0, top: 0, width: TIP_MAX_W });
  const btnRef = useRef(null);

  const reposition = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const width = Math.min(TIP_MAX_W, vw - 2 * VIEW_MARGIN);

    let left = r.left + r.width / 2 - width / 2;
    left = Math.max(VIEW_MARGIN, Math.min(left, vw - width - VIEW_MARGIN));

    const top = r.bottom + GAP;
    setBox({ left, top, width });
  }, []);

  useEffect(() => {
    if (!open) return;
    reposition();
    const id = requestAnimationFrame(reposition);
    const onScroll = () => reposition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!text) return null;

  const tip =
    open &&
    typeof document !== 'undefined' &&
    createPortal(
      <div
        role="tooltip"
        style={{
          position: 'fixed',
          left: box.left,
          top: box.top,
          width: box.width,
          zIndex: 99999,
          pointerEvents: 'none',
        }}
        className="rounded-xl bg-slate-900 dark:bg-slate-950 text-slate-100 text-xs font-medium leading-relaxed px-3.5 py-2.5 pt-3.5 shadow-xl ring-1 ring-white/15 text-left normal-case tracking-normal font-sans"
      >
        <span className="absolute -top-2 left-1/2 h-0 w-0 -translate-x-1/2 border-x-8 border-x-transparent border-b-8 border-b-slate-900 dark:border-b-slate-950" aria-hidden />
        <span className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1 font-bold">
          {title}
        </span>
        {text}
      </div>,
      document.body
    );

  return (
    <span className="relative inline-flex align-middle ml-1.5">
      <button
        ref={btnRef}
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="w-5 h-5 shrink-0 rounded-full border-2 border-slate-300 dark:border-slate-500 bg-slate-100/80 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 text-xs font-black leading-none flex items-center justify-center cursor-help hover:border-indigo-400 hover:text-indigo-600 dark:hover:border-indigo-500 dark:hover:text-indigo-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        aria-label={title}
        aria-expanded={open}
      >
        !
      </button>
      {tip}
    </span>
  );
}
