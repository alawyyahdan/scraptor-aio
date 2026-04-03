import { useMemo, useState } from 'react';
import { Search, ChevronRight } from 'lucide-react';
import { BerandaIcon, featureCardIconClass } from '../lib/berandaIcons.jsx';

const DEFAULT_HERO_BADGE = 'Crawler Scraptor';
const DEFAULT_HERO_TITLE =
  'Explore the Scrape Creators API (v2) and local legacy scrapers from one UI.';
const DEFAULT_SEARCH_TITLE = 'Search endpoints (all platforms)';

function DefaultHeroParagraph() {
  return (
    <p className="mt-4 text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
      <strong>Search below</strong> across all platforms, then open a form. Or pick a platform in
      the sidebar. Forms are generated from{' '}
      <code className="text-sm bg-slate-200/80 dark:bg-slate-800 px-2 py-0.5 rounded-md">openapi.json</code>.
      No login required for public scrapers.
    </p>
  );
}

export default function HomeBeranda({
  platformCount,
  endpointCount,
  visibleV2Count,
  visibleLegacyCount,
  apiCatalog,
  visibleV2Keys,
  onOpenV2Endpoint,
  site,
}) {
  const v2n = visibleV2Count ?? platformCount;
  const leg = visibleLegacyCount ?? 5;
  const [q, setQ] = useState('');
  const ber = site?.beranda || {};

  const indexRows = useMemo(() => {
    const keys = visibleV2Keys || Object.keys(apiCatalog || {});
    const out = [];
    for (const slug of keys) {
      const p = apiCatalog?.[slug];
      if (!p?.endpoints?.length) continue;
      for (const ep of p.endpoints) {
        out.push({ slug, p, ep });
      }
    }
    return out;
  }, [apiCatalog, visibleV2Keys]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return indexRows
      .filter(({ slug, p, ep }) => {
        const hay = [
          slug,
          p.name,
          p.tag,
          ep.name,
          ep.path,
          ep.id,
          ep.description,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(needle);
      })
      .slice(0, 200);
  }, [indexRows, q]);

  const gridCards = useMemo(() => {
    const custom = (ber.featureCards || []).filter((c) => c.enabled && (c.title?.trim() || c.body?.trim()));
    const mode = ber.cardMode === 'replace' ? 'replace' : 'append';

    const defaults = [
      {
        id: '_built-v2',
        icon: 'Layers',
        iconColor: 'fuchsia',
        title: 'Scraper API (v2)',
        body: `${v2n} platforms visible · ${endpointCount} endpoints in catalog. Hide platforms under Login → Features & API.`,
      },
      {
        id: '_built-adm',
        icon: 'Shield',
        iconColor: 'amber',
        title: 'Dashboard',
        body: `Scrape Creators API key and sidebar toggles (${leg} legacy modules) are managed in Dashboard after sign-in.`,
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

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 2xl:max-w-7xl md:space-y-8">
      <div className="rounded-3xl bg-gradient-to-br from-indigo-500/15 to-purple-600/15 dark:from-indigo-500/10 dark:to-purple-600/10 border border-indigo-200/50 dark:border-indigo-500/20 p-8 md:p-10">
        <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400 mb-4">
          <BerandaIcon name={heroIcon} className="w-8 h-8 shrink-0" />
          <span className="text-sm font-bold uppercase tracking-widest">{heroBadge}</span>
        </div>
        <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-tight">
          {heroTitle}
        </h3>
        {heroSubtitleRaw ? (
          <p className="mt-4 text-slate-600 dark:text-slate-400 text-lg leading-relaxed whitespace-pre-wrap">
            {heroSubtitleRaw}
          </p>
        ) : (
          <DefaultHeroParagraph />
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/50 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
          <Search className="w-5 h-5 text-indigo-500 shrink-0" />
          <h4 className="font-bold text-slate-900 dark:text-white">{searchTitle}</h4>
        </div>
        <div className="p-4 md:p-5 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Endpoint name, path, platform, tag…"
              className="w-full pl-10 pr-3 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              autoComplete="off"
            />
          </div>
          {!q.trim() ? null : results.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
              No matching endpoints. Try different keywords or check the path spelling.
            </p>
          ) : (
            <ul className="max-h-[min(24rem,50vh)] overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-100 dark:border-slate-800">
              {results.map(({ slug, p, ep }) => (
                <li key={`${slug}:${ep.id}`}>
                  <button
                    type="button"
                    onClick={() => onOpenV2Endpoint?.(slug, ep.id)}
                    className="w-full flex items-start gap-3 text-left px-4 py-3 hover:bg-indigo-50/80 dark:hover:bg-indigo-500/10 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-indigo-500 shrink-0 mt-1" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">{ep.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        <span className="font-medium text-indigo-600 dark:text-indigo-400">{p.name}</span>
                        {p.tag ? (
                          <span className="text-slate-400"> · {p.tag}</span>
                        ) : null}
                      </p>
                      <p className="text-[11px] font-mono text-slate-500 dark:text-slate-500 truncate mt-0.5">
                        {ep.method} {ep.path}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {gridCards.map((card) => (
          <div
            key={card.id}
            className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/40 p-6"
          >
            <BerandaIcon name={card.icon || 'Layers'} className={`w-8 h-8 mb-3 ${featureCardIconClass(card.iconColor)}`} />
            <h4 className="font-bold text-slate-900 dark:text-white mb-2">{card.title}</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">{card.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
