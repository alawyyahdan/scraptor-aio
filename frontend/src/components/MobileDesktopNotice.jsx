import { useState, useEffect } from 'react';
import { MonitorSmartphone, X } from 'lucide-react';
import { mergeDesktopNotice } from '../lib/siteModalDefaults';
import { renderInlineBold } from '../lib/inlineBold.jsx';

const SESSION_KEY = 'scraptor_mobile_desktop_notice_dismissed';
const MQ = '(max-width: 767px)';

/**
 * Di HP: popup ringkas responsif vs desktop. Teks di Admin → Kustomisasi.
 */
export default function MobileDesktopNotice({ desktopNotice }) {
  const copy = mergeDesktopNotice(desktopNotice);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- sinkron matchMedia + sessionStorage */
    if (typeof window === 'undefined') return;
    const merged = mergeDesktopNotice(desktopNotice);
    if (!merged.enabled) {
      setVisible(false);
      return;
    }

    const sync = () => {
      if (sessionStorage.getItem(SESSION_KEY)) {
        setVisible(false);
        return;
      }
      setVisible(window.matchMedia(MQ).matches);
    };

    sync();
    const mq = window.matchMedia(MQ);
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [desktopNotice]);

  const dismiss = () => {
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  if (!copy.enabled || !visible) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[150] px-3 pt-3 md:hidden"
      style={{
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
      }}
      role="dialog"
      aria-labelledby="mobile-desktop-notice-title"
      aria-describedby="mobile-desktop-notice-desc"
    >
      <div className="pointer-events-auto mx-auto max-w-lg rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-2xl ring-1 ring-slate-900/5 backdrop-blur-md dark:border-slate-600/80 dark:bg-slate-900/95 dark:ring-white/10">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/20">
            <MonitorSmartphone className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h3
              id="mobile-desktop-notice-title"
              className="text-sm font-bold text-slate-900 dark:text-white"
            >
              {copy.title}
            </h3>
            <p
              id="mobile-desktop-notice-desc"
              className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400 whitespace-pre-wrap"
            >
              {renderInlineBold(copy.body)}
            </p>
            <button
              type="button"
              onClick={dismiss}
              className="mt-3 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-500 active:scale-[0.99] dark:bg-indigo-500 dark:hover:bg-indigo-400"
            >
              {copy.dismissLabel}
            </button>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
