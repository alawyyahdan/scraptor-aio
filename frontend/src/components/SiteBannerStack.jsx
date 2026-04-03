import { AlertTriangle, Info, CheckCircle } from 'lucide-react';

export default function SiteBannerStack({ site }) {
  const b = site?.banners;
  if (!b) return null;

  const items = [
    b.warning?.enabled &&
      b.warning?.text?.trim() && { key: 'w', Icon: AlertTriangle, text: b.warning.text, className: 'bg-amber-500/15 text-amber-900 dark:text-amber-100 border-amber-500/30' },
    b.info?.enabled &&
      b.info?.text?.trim() && { key: 'i', Icon: Info, text: b.info.text, className: 'bg-sky-500/15 text-sky-950 dark:text-sky-100 border-sky-500/30' },
    b.success?.enabled &&
      b.success?.text?.trim() && { key: 's', Icon: CheckCircle, text: b.success.text, className: 'bg-emerald-500/15 text-emerald-950 dark:text-emerald-100 border-emerald-500/30' },
  ].filter(Boolean);

  if (items.length === 0) return null;

  return (
    <div className="mb-3 flex w-full min-w-0 flex-col gap-2 sm:mb-4">
      {items.map((row) => {
        const BannerIcon = row.Icon;
        return (
        <div
          key={row.key}
          className={`flex gap-3 rounded-xl border px-3 py-2.5 text-sm leading-snug ${row.className}`}
        >
          <BannerIcon className="mt-0.5 h-4 w-4 shrink-0 opacity-90" />
          <p className="min-w-0 whitespace-pre-wrap">{row.text}</p>
        </div>
        );
      })}
    </div>
  );
}
