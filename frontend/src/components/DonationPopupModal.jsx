import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';

/**
 * Donation / QRIS modal. When closeDelayEnabled, user must wait closeDelaySeconds before closing.
 */
export default function DonationPopupModal({
  open,
  onClose,
  title,
  body,
  imageUrl,
  closeDelayEnabled,
  closeDelaySeconds,
  closeLabel,
  paypalEnabled,
  paypalUrl,
  paypalLabel,
}) {
  const [canClose, setCanClose] = useState(false);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!open) {
      setCanClose(false);
      setRemaining(0);
      return;
    }
    if (!closeDelayEnabled || closeDelaySeconds <= 0) {
      setCanClose(true);
      setRemaining(0);
      return;
    }
    setCanClose(false);
    let left = closeDelaySeconds;
    setRemaining(left);
    const id = setInterval(() => {
      left -= 1;
      setRemaining(Math.max(0, left));
      if (left <= 0) {
        clearInterval(id);
        setCanClose(true);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [open, closeDelayEnabled, closeDelaySeconds]);

  useEffect(() => {
    if (!open || !canClose) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, canClose, onClose]);

  if (!open) return null;

  const src = (imageUrl && String(imageUrl).trim()) || '/qris.jpeg';
  const showPaypal = !!(paypalEnabled && paypalUrl && String(paypalUrl).trim());

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-5"
      role="presentation"
    >
      <button
        type="button"
        className={`absolute inset-0 bg-slate-950/60 transition-opacity ${
          canClose ? 'cursor-pointer' : 'cursor-default'
        }`}
        aria-label={canClose ? 'Close' : 'Timer in progress'}
        onClick={canClose ? onClose : undefined}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="donation-popup-title"
        className="relative z-10 w-[min(92vw,17.5rem)] overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/[0.06] dark:bg-slate-900 dark:ring-white/[0.08]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-500 text-white">
              <Heart className="h-3.5 w-3.5" fill="currentColor" aria-hidden />
            </span>
            <h2
              id="donation-popup-title"
              className="min-w-0 text-[0.95rem] font-semibold leading-snug tracking-tight text-slate-900 dark:text-white"
            >
              {title}
            </h2>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-[0.8125rem] leading-relaxed text-slate-600 dark:text-slate-400">
            {body}
          </p>
        </div>

        <div className="px-4 pb-3 pt-0">
          <figure className="mx-auto w-fit max-w-[13rem] overflow-hidden rounded-xl border border-slate-200 leading-none dark:border-slate-600">
            <img
              src={src}
              alt="QRIS QR code"
              className="block h-auto max-h-[13rem] w-auto max-w-[13rem] object-contain"
            />
          </figure>
        </div>

        {showPaypal ? (
          <div className="px-4 pb-3">
            <div className="relative py-3">
              <div className="absolute inset-0 flex items-center" aria-hidden>
                <div className="h-px w-full bg-slate-200 dark:bg-slate-700" />
              </div>
              <p className="relative mx-auto w-fit bg-white px-3 text-center text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:bg-slate-900">
                OR
              </p>
            </div>
            <a
              href={String(paypalUrl).trim()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center rounded-lg border border-[#0070ba]/35 bg-[#0070ba]/10 py-2.5 text-center text-sm font-semibold text-[#005ea6] transition hover:bg-[#0070ba]/16 dark:border-[#009cde]/40 dark:bg-[#009cde]/12 dark:text-[#7ec8ff] dark:hover:bg-[#009cde]/20"
            >
              {paypalLabel || 'Donate with PayPal'}
            </a>
          </div>
        ) : null}

        <div className="space-y-2 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
          {closeDelayEnabled && closeDelaySeconds > 0 && !canClose ? (
            <p className="text-center text-[0.8125rem] text-slate-500 dark:text-slate-400">
              Closes in{' '}
              <span className="tabular-nums font-medium text-rose-600 dark:text-rose-400">
                {remaining}
              </span>
              {remaining === 1 ? ' second' : ' seconds'}
            </p>
          ) : null}
          <button
            type="button"
            onClick={canClose ? onClose : undefined}
            disabled={!canClose}
            className="w-full rounded-lg bg-slate-900 py-2.5 text-center text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            {canClose ? closeLabel : `${closeLabel}…`}
          </button>
        </div>
      </div>
    </div>
  );
}
