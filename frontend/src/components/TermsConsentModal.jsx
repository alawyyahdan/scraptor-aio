import { ShieldCheck, AlertTriangle } from 'lucide-react';
import { acceptTerms } from '../lib/termsStorage';
import { mergeTermsModal } from '../lib/siteModalDefaults';
import { renderInlineBold } from '../lib/inlineBold.jsx';

/**
 * Modal pertama kali: syarat penggunaan UI publik.
 * Teks bisa diubah di Admin → Kustomisasi (tersimpan di server).
 */
export default function TermsConsentModal({ onAccept, terms }) {
  const copy = mergeTermsModal(terms);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-stretch justify-center bg-slate-900/85 backdrop-blur-md sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-title"
      style={{ paddingTop: 'max(0px, env(safe-area-inset-top))', paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}
    >
      <div className="flex max-h-[100dvh] w-full max-w-lg flex-col overflow-hidden rounded-none border-0 border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:max-h-[min(92vh,44rem)] sm:rounded-2xl sm:border sm:border-slate-200 dark:sm:border-slate-700">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 pb-6 sm:space-y-4 sm:p-8 sm:pb-8">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/20">
              <ShieldCheck className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="min-w-0">
              <h2
                id="terms-title"
                className="text-lg font-black leading-tight text-slate-900 dark:text-white sm:text-xl"
              >
                {copy.title}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.subtitle}</p>
            </div>
          </div>

          <ul className="list-disc space-y-2.5 pl-5 text-sm leading-relaxed text-slate-700 dark:text-slate-300 sm:text-[15px]">
            {copy.bullets
              .filter((line) => String(line).trim().length > 0)
              .map((line, i) => (
                <li key={i}>{renderInlineBold(line)}</li>
              ))}
          </ul>

          <div className="flex gap-2 rounded-xl border border-amber-200/80 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200 sm:text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="whitespace-pre-wrap">
              {renderInlineBold(
                copy.footerNote,
                'font-semibold text-amber-950 dark:text-amber-100'
              )}
            </span>
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-white/95 p-4 dark:border-slate-700 dark:bg-slate-900/95 sm:p-6">
          <button
            type="button"
            onClick={() => {
              acceptTerms();
              onAccept?.();
            }}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3.5 text-base font-bold text-white shadow-lg transition-all active:scale-[0.99] sm:py-3.5 sm:text-base min-h-[48px]"
          >
            {copy.acceptLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
