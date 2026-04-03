import { useMemo } from 'react';
import { Search, ShieldCheck, AlertTriangle, MonitorSmartphone, Heart } from 'lucide-react';
import SiteBannerStack from './SiteBannerStack';
import { BerandaIcon, featureCardIconClass } from '../lib/berandaIcons.jsx';
import { mergeTermsModal, mergeDesktopNotice, mergeDonationPopup } from '../lib/siteModalDefaults';
import { renderInlineBold } from '../lib/inlineBold.jsx';
import { catalogMeta } from '../config/apiCatalog';

const DEFAULT_HERO_BADGE = 'Crawler Scraptor';
const DEFAULT_HERO_TITLE =
  'Explore the Scrape Creators API (v2) and local legacy scrapers from one UI.';
const DEFAULT_SEARCH_TITLE = 'Search endpoints (all platforms)';

/**
 * Live preview of site customization (mirrors public styling, not a full iframe).
 */
export default function AdminSitePreview({ site }) {
  const ber = site?.beranda || {};
  const terms = mergeTermsModal(site?.modals?.terms);
  const desktop = mergeDesktopNotice(site?.modals?.desktopNotice);
  const donation = mergeDonationPopup(site?.modals?.donationPopup);

  const v2n = catalogMeta.platformCount;
  const endpointCount = catalogMeta.endpointCount;
  const leg = 5;

  const gridCards = useMemo(() => {
    const custom = (ber.featureCards || []).filter(
      (c) => c.enabled && (c.title?.trim() || c.body?.trim())
    );
    const mode = ber.cardMode === 'replace' ? 'replace' : 'append';

    const defaults = [
      {
        id: '_built-v2',
        icon: 'Layers',
        iconColor: 'fuchsia',
        title: 'Scraper API (v2)',
        body: `${v2n} platform tampil · ${endpointCount} endpoint di katalog. …`,
      },
      {
        id: '_built-adm',
        icon: 'Shield',
        iconColor: 'amber',
        title: 'Dashboard',
        body: `API key & sidebar toggles … (${leg} legacy).`,
      },
    ];

    if (custom.length === 0) return defaults;
    if (mode === 'replace') return custom;
    return [...defaults, ...custom];
  }, [ber.featureCards, ber.cardMode, v2n, endpointCount, leg]);

  const heroBadge = ber.heroBadge?.trim() || DEFAULT_HERO_BADGE;
  const heroTitle = ber.heroTitle?.trim() || DEFAULT_HERO_TITLE;
  const heroSubtitleRaw = ber.heroSubtitle?.trim();
  const searchTitle = ber.searchTitle?.trim() || DEFAULT_SEARCH_TITLE;
  const heroIcon = ber.heroIcon || 'Sparkles';

  const visibleBullets = terms.bullets.filter((b) => String(b).trim().length > 0);

  return (
    <div className="rounded-2xl border-2 border-dashed border-indigo-300/80 dark:border-indigo-500/35 bg-gradient-to-b from-slate-50 to-slate-100/90 dark:from-slate-900/90 dark:to-slate-950/90 p-3 shadow-inner space-y-3 ring-1 ring-slate-200/60 dark:ring-slate-700/50">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-700 pb-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
          Live preview
        </p>
        <span className="text-[10px] text-slate-500 dark:text-slate-400">Updates as you type</span>
      </div>

      <div className="scale-[0.97] origin-top space-y-2.5 text-[11px] leading-snug sm:text-xs sm:leading-snug">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/85 dark:bg-slate-900/65 px-3 py-2.5 flex items-center gap-2.5 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow shrink-0">
            <BerandaIcon
              name={site?.branding?.sidebarIcon || 'LayoutDashboard'}
              className="w-4 h-4"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 truncate leading-tight">
              {site?.branding?.appName?.trim() || 'Scraptor UI'}
            </p>
            <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate mt-0.5">
              {site?.branding?.appSubtitle?.trim() || 'Public + Admin'}
            </p>
          </div>
        </div>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 px-0.5 -mt-1">
          Tab title:{' '}
          <span className="font-mono text-slate-700 dark:text-slate-300">
            Home · {site?.branding?.documentTitle?.trim() || 'Scraptor UI'}
          </span>
          {site?.branding?.faviconUrl?.trim() ? (
            <span className="text-slate-400"> · custom favicon</span>
          ) : null}
        </p>

        <SiteBannerStack site={site} />

        {site?.maintenance?.enabled ? (
          <div
            className="rounded-xl border border-slate-700 bg-[#0b1120] px-3 py-3 text-center"
            role="presentation"
          >
            <p className="text-[10px] font-black uppercase tracking-wide text-white">Maintenance</p>
            <p className="mt-1 text-[11px] text-slate-400 whitespace-pre-wrap line-clamp-4">
              {site.maintenance.message?.trim() || '—'}
            </p>
          </div>
        ) : null}

        <div className="rounded-2xl border border-indigo-200/60 dark:border-indigo-500/25 bg-gradient-to-br from-indigo-500/12 to-purple-600/12 dark:from-indigo-500/10 dark:to-purple-600/10 p-3 sm:p-4">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-2">
            <BerandaIcon name={heroIcon} className="w-6 h-6 shrink-0" />
            <span className="text-[9px] font-bold uppercase tracking-widest truncate">{heroBadge}</span>
          </div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight line-clamp-3">
            {heroTitle}
          </h3>
          {heroSubtitleRaw ? (
            <p className="mt-2 text-slate-600 dark:text-slate-400 whitespace-pre-wrap line-clamp-5 text-[11px]">
              {heroSubtitleRaw}
            </p>
          ) : (
            <p className="mt-2 italic text-slate-500 dark:text-slate-500 text-[10px]">
              Default intro paragraph (full site)
            </p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/70 overflow-hidden shadow-sm">
          <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="font-bold text-slate-900 dark:text-white text-[11px] truncate">{searchTitle}</span>
          </div>
          <div className="px-3 py-2 text-slate-400 text-[10px]">Endpoint search field…</div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {gridCards.slice(0, 4).map((card) => (
            <div
              key={card.id}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/50 p-2.5"
            >
              <BerandaIcon
                name={card.icon || 'Layers'}
                className={`w-5 h-5 mb-1.5 ${featureCardIconClass(card.iconColor)}`}
              />
              <p className="font-bold text-slate-900 dark:text-white text-[11px] line-clamp-2">{card.title}</p>
              <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 line-clamp-3 whitespace-pre-wrap">
                {card.body}
              </p>
            </div>
          ))}
        </div>
        {gridCards.length > 4 ? (
          <p className="text-[10px] text-center text-slate-400">+{gridCards.length - 4} more cards on site</p>
        ) : null}

        <div className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 p-3 space-y-2 shadow-sm">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Terms modal (first visit)</p>
          <div className="flex gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-500/20">
              <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="min-w-0">
              <p className="font-black text-slate-900 dark:text-white text-[11px] leading-tight">{terms.title}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{terms.subtitle}</p>
            </div>
          </div>
          <ul className="list-disc pl-4 text-[10px] text-slate-700 dark:text-slate-300 space-y-0.5 max-h-24 overflow-y-auto custom-scrollbar">
            {visibleBullets.slice(0, 5).map((line, i) => (
              <li key={i}>{renderInlineBold(line)}</li>
            ))}
          </ul>
          {visibleBullets.length > 5 ? (
            <p className="text-[9px] text-slate-400">+{visibleBullets.length - 5} poin …</p>
          ) : null}
          <div className="flex gap-1.5 rounded-lg border border-amber-200/80 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10 p-2 text-[9px] text-amber-950 dark:text-amber-100">
            <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
            <span className="line-clamp-2 whitespace-pre-wrap">
              {renderInlineBold(terms.footerNote, 'font-semibold text-amber-950 dark:text-amber-100')}
            </span>
          </div>
          <div className="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 py-2 text-center text-[10px] font-bold text-white">
            {terms.acceptLabel}
          </div>
        </div>

        {desktop.enabled ? (
          <div className="rounded-xl border border-slate-300 dark:border-slate-600 bg-white/95 dark:bg-slate-900/95 p-2.5 shadow-md">
            <p className="text-[9px] font-bold uppercase text-slate-500 mb-1.5 flex items-center gap-1">
              <MonitorSmartphone className="w-3 h-3" /> Mobile notice (sample)
            </p>
            <p className="font-bold text-slate-900 dark:text-white text-[11px]">{desktop.title}</p>
            <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 line-clamp-4 whitespace-pre-wrap">
              {renderInlineBold(desktop.body)}
            </p>
            <div className="mt-2 rounded-lg bg-indigo-600 py-1.5 text-center text-[10px] font-bold text-white">
              {desktop.dismissLabel}
            </div>
          </div>
        ) : (
          <p className="text-[10px] text-slate-400 text-center italic">Mobile notice disabled</p>
        )}

        {donation.enabled ? (
          <div className="rounded-xl border border-rose-200/80 dark:border-rose-500/25 bg-gradient-to-br from-rose-50/90 to-amber-50/80 dark:from-rose-500/10 dark:to-amber-500/10 p-3 shadow-sm">
            <p className="text-[9px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 mb-2 flex items-center gap-1">
              <Heart className="w-3 h-3 fill-current" /> Donasi QRIS (setelah {donation.clickThreshold} klik)
            </p>
            <p className="font-black text-slate-900 dark:text-white text-[11px] leading-tight">
              {donation.title}
            </p>
            <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 line-clamp-3 whitespace-pre-wrap">
              {donation.body}
            </p>
            <img
              src={donation.imageUrl}
              alt=""
              className="mt-2 w-full max-h-24 object-contain object-center opacity-95"
            />
            <p className="mt-2 text-[9px] text-center text-slate-500 dark:text-slate-400">
              Tutup: {donation.closeDelayEnabled ? `${donation.closeDelaySeconds}s delay` : 'langsung'} · “
              {donation.closeLabel}”
            </p>
            {donation.paypalEnabled && donation.paypalUrl ? (
              <p className="mt-1.5 text-[9px] text-center font-medium text-[#0070ba] dark:text-[#7ec8ff]">
                + OR → {donation.paypalLabel} · {donation.paypalUrl.slice(0, 36)}
                {donation.paypalUrl.length > 36 ? '…' : ''}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-[10px] text-slate-400 text-center italic">Popup donasi (QRIS) nonaktif</p>
        )}
      </div>
    </div>
  );
}
