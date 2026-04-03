import { useState } from 'react';
import { X } from 'lucide-react';
import { apiUrl } from '../utils/apiFetch';

const initial = {
  name: '',
  email: '',
  scrapeUrl: '',
  reason: '',
};

export default function FeedbackModal({ open, onClose }) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  const patch = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setStatus(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch(apiUrl('/api/public/feedback'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          scrapeUrl: form.scrapeUrl.trim(),
          reason: form.reason.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus({ ok: false, message: data.error || `Request failed (${res.status}).` });
        return;
      }
      if (data.ok) {
        setStatus({ ok: true, message: data.message || 'Sent successfully.' });
        setForm(initial);
      } else {
        setStatus({ ok: false, message: data.error || 'Something went wrong.' });
      }
    } catch {
      setStatus({ ok: false, message: 'Network error — could not reach the server.' });
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/65"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-modal-title"
        className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl ring-1 ring-black/[0.04] dark:border-slate-600 dark:bg-slate-900 dark:ring-white/[0.06]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <h2 id="feedback-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
            Feedback
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 p-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Name
            </label>
            <input
              required
              value={form.name}
              onChange={(e) => patch('name', e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              autoComplete="name"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Email
            </label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => patch('email', e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Link to scrape
            </label>
            <input
              required
              type="url"
              placeholder="https://…"
              value={form.scrapeUrl}
              onChange={(e) => patch('scrapeUrl', e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Reason & purpose
            </label>
            <textarea
              required
              rows={4}
              value={form.reason}
              onChange={(e) => patch('reason', e.target.value)}
              placeholder="Why you need this scraped and how you’ll use it."
              className="mt-1 w-full resize-y rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {status ? (
            <p
              className={`rounded-xl px-3 py-2 text-sm font-medium ${
                status.ok
                  ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                  : 'bg-red-500/15 text-red-800 dark:text-red-300'
              }`}
              role="status"
            >
              {status.message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {busy ? 'Sending…' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}
