import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Activity,
  Database,
  Key,
  Zap,
  Settings2,
  LayoutDashboard,
  Save,
  Check,
  Search,
  BarChart3,
  TrendingUp,
  CalendarRange,
  Eye,
  Users,
  Palette,
  Unlock,
  Plus,
  Trash2,
  Mail,
} from 'lucide-react';
import { fetchJson } from '../utils/apiFetch';
import HelpTooltip from './HelpTooltip';
import ToggleSwitch from './ToggleSwitch';
import AdminSiteTab from './AdminSiteTab';
import AdminAccountsTab from './AdminAccountsTab';

function localYmd(d) {
  const x = new Date(d);
  return (
    x.getFullYear() +
    '-' +
    String(x.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(x.getDate()).padStart(2, '0')
  );
}

const ACTIVITY_PRESETS = [
  { id: 'today', label: 'Today' },
  { id: 'month', label: 'This month' },
  { id: 'year', label: 'This year' },
  { id: '7d', label: '7 days' },
  { id: 'custom', label: 'Custom' },
];

const LEGACY_ITEMS = [
  { id: 'linkedin', label: 'LinkedIn', hint: 'Guest jobs API + page details' },
  { id: 'youtube', label: 'YouTube', hint: 'Video comments via automated browser' },
  { id: 'playstore', label: 'Play Store', hint: 'Google Play app reviews' },
  { id: 'news', label: 'News Portal', hint: 'Extract articles from index/category URLs' },
  { id: 'tokopedia', label: 'Tokopedia', hint: 'Store reviews (Puppeteer)' },
];

export default function AdminPanel({ authToken, setAuthToken, apiCatalog, onFeaturesSaved }) {
  const [tab, setTab] = useState('ringkasan');
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsErr, setStatsErr] = useState(null);

  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsErr, setSettingsErr] = useState(null);
  const [apiKeyDraft, setApiKeyDraft] = useState('');
  const [apiKeyHint, setApiKeyHint] = useState('');
  const [apiKeyFromEnv, setApiKeyFromEnv] = useState(false);
  const [resendKeyDraft, setResendKeyDraft] = useState('');
  const [resendKeyHint, setResendKeyHint] = useState('');
  const [resendKeyFromEnv, setResendKeyFromEnv] = useState(false);
  const [feedbackFromDraft, setFeedbackFromDraft] = useState('');
  const [feedbackToDraft, setFeedbackToDraft] = useState('');
  const [feedbackEmailReady, setFeedbackEmailReady] = useState(false);
  const [saveResendBusy, setSaveResendBusy] = useState(false);
  const [disabledV2, setDisabledV2] = useState([]);
  const [disabledLegacy, setDisabledLegacy] = useState([]);
  const [v2Search, setV2Search] = useState('');
  const [saveKeyBusy, setSaveKeyBusy] = useState(false);
  const [saveFeatBusy, setSaveFeatBusy] = useState(false);
  const [saveExemptBusy, setSaveExemptBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [siteCustomization, setSiteCustomization] = useState(null);
  const [submitQuotaExemptIps, setSubmitQuotaExemptIps] = useState([]);
  const [exemptIpDraft, setExemptIpDraft] = useState('');

  const [activityRange, setActivityRange] = useState('7d');
  const [customFrom, setCustomFrom] = useState(() => {
    const s = new Date();
    s.setDate(s.getDate() - 6);
    return localYmd(s);
  });
  const [customTo, setCustomTo] = useState(() => localYmd(new Date()));

  const [activityBarHover, setActivityBarHover] = useState(null);
  const [visitsBarHover, setVisitsBarHover] = useState(null);

  const v2Entries = useMemo(
    () =>
      Object.entries(apiCatalog).sort((a, b) =>
        a[1].name.localeCompare(b[1].name)
      ),
    [apiCatalog]
  );

  const filteredV2 = useMemo(() => {
    const q = v2Search.trim().toLowerCase();
    if (!q) return v2Entries;
    return v2Entries.filter(
      ([, p]) =>
        p.name.toLowerCase().includes(q) || p.tag?.toLowerCase().includes(q)
    );
  }, [v2Entries, v2Search]);

  const loadStats = useCallback(async () => {
    if (!authToken) return;
    setStatsLoading(true);
    setStatsErr(null);
    try {
      const q = new URLSearchParams();
      q.set('activityRange', activityRange);
      if (activityRange === 'custom') {
        q.set('activityFrom', customFrom);
        q.set('activityTo', customTo);
      }
      const data = await fetchJson(`/api/stats?${q}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setStats(data);
    } catch (e) {
      setStatsErr(e.message || 'Offline');
    } finally {
      setStatsLoading(false);
    }
  }, [authToken, activityRange, customFrom, customTo]);

  const loadSettings = useCallback(async () => {
    if (!authToken) return;
    setSettingsLoading(true);
    setSettingsErr(null);
    try {
      const data = await fetchJson('/api/admin/settings', {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setApiKeyHint(data.apiKeyHint || '');
      setApiKeyFromEnv(!!data.apiKeyFromEnv);
      setResendKeyHint(data.resendKeyHint || '');
      setResendKeyFromEnv(!!data.resendKeyFromEnv);
      setFeedbackFromDraft(data.feedbackFromEmail || '');
      setFeedbackToDraft(data.feedbackToEmail || '');
      setFeedbackEmailReady(!!data.feedbackEmailReady);
      setResendKeyDraft('');
      setDisabledV2(data.disabled?.v2 || []);
      setDisabledLegacy(data.disabled?.legacy || []);
      setSiteCustomization(data.site ?? null);
      setSubmitQuotaExemptIps(
        Array.isArray(data.submitQuotaExemptIps) ? data.submitQuotaExemptIps : []
      );
      setApiKeyDraft('');
    } catch (e) {
      setSettingsErr(e.message || 'Failed');
    } finally {
      setSettingsLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    if (tab === 'ringkasan') loadStats();
  }, [tab, loadStats]);

  useEffect(() => {
    setActivityBarHover(null);
    setVisitsBarHover(null);
  }, [stats]);

  const applyCustomPresetDefaults = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 6);
    setCustomFrom(localYmd(start));
    setCustomTo(localYmd(end));
  };

  useEffect(() => {
    if (tab === 'pengaturan' || tab === 'kustomisasi') loadSettings();
  }, [tab, loadSettings]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const saveFeedbackResend = async () => {
    setSaveResendBusy(true);
    setSettingsErr(null);
    try {
      const payload = {
        feedbackFromEmail: feedbackFromDraft.trim(),
        feedbackToEmail: feedbackToDraft.trim(),
      };
      if (resendKeyDraft.trim()) {
        payload.resendApiKey = resendKeyDraft.trim();
      }
      const data = await fetchJson('/api/admin/settings', {
        method: 'POST',
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      setResendKeyHint(data.resendKeyHint || '');
      setResendKeyFromEnv(!!data.resendKeyFromEnv);
      setFeedbackFromDraft(data.feedbackFromEmail || '');
      setFeedbackToDraft(data.feedbackToEmail || '');
      setFeedbackEmailReady(!!data.feedbackEmailReady);
      setResendKeyDraft('');
      showToast('Feedback email settings saved.');
    } catch (e) {
      setSettingsErr(e.message);
    } finally {
      setSaveResendBusy(false);
    }
  };

  const saveApiKey = async () => {
    if (apiKeyDraft.trim() === '') {
      setSettingsErr('Enter an API key before saving.');
      return;
    }
    setSaveKeyBusy(true);
    setSettingsErr(null);
    try {
      const data = await fetchJson('/api/admin/settings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scrapeCreatorsApiKey: apiKeyDraft.trim() }),
      });
      setApiKeyHint(data.apiKeyHint || '');
      setApiKeyDraft('');
      showToast('API key saved.');
      loadStats();
    } catch (e) {
      setSettingsErr(e.message);
    } finally {
      setSaveKeyBusy(false);
    }
  };

  const saveFeatures = async () => {
    setSaveFeatBusy(true);
    setSettingsErr(null);
    try {
      await fetchJson('/api/admin/settings', {
        method: 'POST',
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          disabled: { v2: disabledV2, legacy: disabledLegacy },
        }),
      });
      onFeaturesSaved?.();
      loadStats();
      showToast('Sidebar visibility updated.');
    } catch (e) {
      setSettingsErr(e.message);
    } finally {
      setSaveFeatBusy(false);
    }
  };

  const saveSubmitQuotaExemptIps = async () => {
    setSaveExemptBusy(true);
    setSettingsErr(null);
    const pending = exemptIpDraft.trim();
    const listToSave = [...submitQuotaExemptIps];
    if (pending && !listToSave.includes(pending)) {
      listToSave.push(pending);
    }
    try {
      const data = await fetchJson('/api/admin/settings', {
        method: 'POST',
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ submitQuotaExemptIps: listToSave }),
      });
      const saved = Array.isArray(data.submitQuotaExemptIps)
        ? data.submitQuotaExemptIps
        : listToSave;
      setSubmitQuotaExemptIps(saved);
      if (pending) setExemptIpDraft('');
      showToast('Quota exempt IPs saved.');
    } catch (e) {
      setSettingsErr(e.message);
    } finally {
      setSaveExemptBusy(false);
    }
  };

  const addExemptIp = () => {
    const t = exemptIpDraft.trim();
    if (!t) return;
    if (submitQuotaExemptIps.includes(t)) {
      setExemptIpDraft('');
      return;
    }
    setSubmitQuotaExemptIps((prev) => [...prev, t]);
    setExemptIpDraft('');
  };

  const v2Enabled = (slug) => !disabledV2.includes(slug);
  const setV2Enabled = (slug, on) => {
    setDisabledV2((prev) => {
      const has = prev.includes(slug);
      if (on && has) return prev.filter((s) => s !== slug);
      if (!on && !has) return [...prev, slug];
      return prev;
    });
  };

  const legacyEnabled = (id) => !disabledLegacy.includes(id);
  const setLegacyEnabled = (id, on) => {
    setDisabledLegacy((prev) => {
      const has = prev.includes(id);
      if (on && has) return prev.filter((s) => s !== id);
      if (!on && !has) return [...prev, id];
      return prev;
    });
  };

  const tabs = [
    { id: 'ringkasan', label: 'Summary', icon: LayoutDashboard },
    { id: 'pengaturan', label: 'API & features', icon: Settings2 },
    { id: 'kustomisasi', label: 'Customize', icon: Palette },
    { id: 'admins', label: 'Admins', icon: Users },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 2xl:max-w-7xl">
      {toast && (
        <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-2 rounded-2xl bg-emerald-600 text-white px-4 py-3 shadow-lg text-sm font-semibold">
          <Check className="w-4 h-4" />
          {toast}
        </div>
      )}

      <div className="flex flex-wrap gap-2 p-1 rounded-2xl bg-slate-100/90 dark:bg-slate-800/80 ring-1 ring-slate-200/80 dark:ring-slate-700/80">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex-1 min-w-[6.5rem] sm:min-w-[8rem] flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tab === t.id
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4 opacity-80" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'ringkasan' && (
        <>
          {statsLoading ? (
            <p className="text-slate-500 dark:text-slate-400 text-center py-12 animate-pulse">
              Loading summary…
            </p>
          ) : statsErr ? (
            <div className="text-red-600 dark:text-red-400 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
              {statsErr}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="relative rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-5 text-white shadow-lg shadow-indigo-500/20 overflow-hidden">
                <Key className="absolute -right-4 -bottom-4 w-24 h-24 text-white/10" />
                <p className="text-indigo-100 text-sm font-medium flex items-center gap-1.5">
                  Credits left
                  <HelpTooltip
                    title="Credits"
                    text={
                      stats?.creditsSource === 'live'
                        ? 'Pulled from Scrape Creators (/v1/credit-balance) using the active API key.'
                        : 'Demo figure (~980). Add an API key under API & features for live values.'
                    }
                  />
                </p>
                <p className="text-4xl font-black mt-1 tabular-nums">
                  {stats?.remainingCredits ?? '—'}
                </p>
                <p className="text-xs text-indigo-200/90 mt-3 font-medium">
                  {stats?.creditsSource === 'live' ? 'Live' : 'Demo / offline'}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 p-5 relative">
                <Database className="absolute right-3 top-3 w-12 h-12 text-emerald-500/15" />
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium flex items-center gap-1">
                  Scrapes OK
                  <HelpTooltip
                    title="History"
                    text="Successful scrape requests (v2 proxy + legacy), recorded server-side (activity-log.json)."
                  />
                </p>
                <p className="text-3xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
                  {stats?.totalScrapesDone ?? '—'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Attempts: {stats?.totalScrapeAttempts ?? 0}
                  {typeof stats?.scrapeFailures === 'number' && stats.scrapeFailures > 0
                    ? ` · failed: ${stats.scrapeFailures}`
                    : ''}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 p-5 relative">
                <Activity className="absolute right-3 top-3 w-12 h-12 text-orange-500/15" />
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium flex items-center gap-1">
                  Active modules
                  <HelpTooltip
                    title="v2 + legacy"
                    text="Enabled v2 platforms plus enabled legacy modules. Manage under API & features."
                  />
                </p>
                <p className="text-3xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
                  {stats?.activeScrapers ?? '—'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  v2: {stats?.activeV2 ?? '—'}/{stats?.totalV2Platforms ?? '—'} · legacy:{' '}
                  {stats?.activeLegacy ?? '—'}/{stats?.totalLegacyModules ?? '—'}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 p-5 relative">
                <Eye className="absolute right-3 top-3 w-12 h-12 text-sky-500/15" />
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium flex items-center gap-1">
                  Visits (range)
                  <HelpTooltip
                    title="Traffic"
                    text="After visitors accept the terms popup, one visit log per tab session is sent to the server. Submit counts scrape requests (per-IP daily cap)."
                  />
                </p>
                <p className="text-3xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
                  {stats?.trafficSummary?.totalVisits ?? 0}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  Unique visit IPs: {stats?.trafficSummary?.uniqueVisitIps ?? 0} · Submits:{' '}
                  {stats?.trafficSummary?.totalSubmits ?? 0} · Quota: max{' '}
                  {stats?.trafficSummary?.submitQuotaPerIpPerDay ?? 5}/IP/day
                </p>
              </div>
            </div>
          )}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-500 shrink-0" />
                <h3 className="font-bold text-slate-900 dark:text-white">
                  {stats?.activityWindow?.start === stats?.activityWindow?.end
                    ? `Activity · ${stats?.activityWindow?.start ?? '—'}`
                    : `Activity · ${stats?.activityWindow?.start ?? '—'} → ${stats?.activityWindow?.end ?? '—'}`}
                </h3>
                <HelpTooltip
                  title="Chart"
                  text="Pick a range below. Bars = scrape totals per day (green = OK, red = failed). Hover a bar for details."
                />
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <CalendarRange className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
                {ACTIVITY_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      if (p.id === 'custom') applyCustomPresetDefaults();
                      setActivityRange(p.id);
                    }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                      activityRange === p.id
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {activityRange === 'custom' && (
                <div className="flex flex-wrap items-end gap-3">
                  <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400">
                    From
                    <input
                      type="date"
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm text-slate-900 dark:text-white font-mono"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400">
                    To
                    <input
                      type="date"
                      value={customTo}
                      onChange={(e) => setCustomTo(e.target.value)}
                      className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm text-slate-900 dark:text-white font-mono"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => loadStats()}
                    className="rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold px-3 py-2 hover:bg-slate-300 dark:hover:bg-slate-600"
                  >
                    Reload
                  </button>
                </div>
              )}
            </div>
            <div className="p-5">
              <div className="mb-3 min-h-[3rem] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/90 px-3 py-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                {activityBarHover ? (
                  <>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {activityBarHover.date}
                    </span>
                    <span className="text-slate-400 hidden sm:inline">·</span>
                    <span className="text-slate-700 dark:text-slate-300">
                      Total:{' '}
                      <strong className="tabular-nums text-slate-900 dark:text-white">
                        {activityBarHover.total}
                      </strong>
                    </span>
                    <span className="text-slate-400 hidden sm:inline">·</span>
                    <span className="text-emerald-700 dark:text-emerald-400">
                      OK:{' '}
                      <strong className="tabular-nums">{activityBarHover.ok}</strong>
                    </span>
                    <span className="text-slate-400 hidden sm:inline">·</span>
                    <span className="text-rose-700 dark:text-rose-400">
                      Fail:{' '}
                      <strong className="tabular-nums">{activityBarHover.fail}</strong>
                    </span>
                    {activityBarHover.total > 0 ? (
                      <span className="text-xs text-slate-500 dark:text-slate-400 w-full sm:w-auto sm:ml-auto">
                        Green = OK · Red = failed
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
                    Hover a bar to see date, total, OK, and failed counts.
                  </span>
                )}
              </div>
              <div className="overflow-x-auto pb-2">
              {(() => {
                const byDay = stats?.activityByDay || [];
                const maxTot = Math.max(1, ...byDay.map((d) => d.total));
                const n = byDay.length;
                const labelStep =
                  n > 20 ? Math.max(1, Math.ceil(n / 16)) : n > 12 ? 2 : 1;
                const showTick = (i) =>
                  i % labelStep === 0 || i === n - 1 || n <= 12;
                return (
                  <div
                    className="flex items-end gap-0.5 sm:gap-1 h-40 px-1 border-b border-slate-200/80 dark:border-slate-700/80 min-w-min"
                    style={{
                      minWidth: n ? `${Math.max(n * (n > 25 ? 10 : 14), 220)}px` : undefined,
                    }}
                    onMouseLeave={() => setActivityBarHover(null)}
                  >
                    {n === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400 py-8 w-full text-center">
                        No dates in this range (check custom filter).
                      </p>
                    ) : (
                      byDay.map((d, i) => {
                        const okPct = d.total ? Math.round((d.ok / d.total) * 100) : 0;
                        const barPx =
                          d.total === 0
                            ? 4
                            : Math.max(10, Math.round((d.total / maxTot) * 112));
                        return (
                          <div
                            key={d.date}
                            role="img"
                            aria-label={`${d.date}: total ${d.total}, OK ${d.ok}, failed ${d.fail}`}
                            className="flex-1 flex flex-col items-center justify-end h-full min-w-0 max-w-[36px] sm:max-w-[44px] cursor-crosshair"
                            onMouseEnter={() =>
                              setActivityBarHover({
                                date: d.date,
                                ok: d.ok,
                                fail: d.fail,
                                total: d.total,
                              })
                            }
                          >
                            <div
                              className={`w-full flex flex-col justify-end rounded-t-md overflow-hidden bg-slate-100 dark:bg-slate-800 ring-1 transition-[box-shadow] ${
                                activityBarHover?.date === d.date
                                  ? 'ring-2 ring-indigo-500 dark:ring-indigo-400 shadow-md'
                                  : 'ring-slate-200/80 dark:ring-slate-700'
                              }`}
                              style={{ height: `${barPx}px` }}
                            >
                              {d.total > 0 ? (
                                <>
                                  <div
                                    className="w-full bg-rose-500/85 dark:bg-rose-600/90 shrink-0 transition-all"
                                    style={{ height: `${100 - okPct}%` }}
                                  />
                                  <div
                                    className="w-full bg-emerald-500 dark:bg-emerald-600 shrink-0 transition-all"
                                    style={{ height: `${okPct}%` }}
                                  />
                                </>
                              ) : (
                                <div className="w-full h-full bg-slate-200 dark:bg-slate-700 opacity-50" />
                              )}
                            </div>
                            <div
                              className="mt-1 h-9 w-full flex items-start justify-center overflow-visible"
                              style={{
                                minHeight: n > 18 ? '2.25rem' : undefined,
                              }}
                            >
                              {showTick(i) ? (
                                <span
                                  className={`text-[8px] sm:text-[9px] font-mono text-slate-500 dark:text-slate-400 text-center leading-tight ${
                                    n > 18
                                      ? 'origin-top-left -rotate-45 translate-y-0.5 whitespace-nowrap'
                                      : 'truncate w-full'
                                  }`}
                                  title={d.date}
                                >
                                  {n > 24 ? d.date.slice(8) : d.date.slice(5)}
                                </span>
                              ) : (
                                <span className="text-[8px] text-slate-600 tabular-nums opacity-70">
                                  ·
                                </span>
                              )}
                            </div>
                            <span className="text-[8px] text-slate-400 tabular-nums -mt-0.5">
                              {d.total}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              })()}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
              <Eye className="w-5 h-5 text-sky-500" />
              <h3 className="font-bold text-slate-900 dark:text-white">Visits per day</h3>
              <HelpTooltip
                title="Visit chart"
                text="Visit logs per day for the same range as the activity chart."
              />
            </div>
            <div className="p-5">
              <div className="mb-3 min-h-[2.75rem] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/90 px-3 py-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                {visitsBarHover ? (
                  <>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {visitsBarHover.date}
                    </span>
                    <span className="text-slate-400 hidden sm:inline">·</span>
                    <span className="text-sky-800 dark:text-sky-300">
                      Visits:{' '}
                      <strong className="tabular-nums">{visitsBarHover.count}</strong>
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      (sessions recorded on server)
                    </span>
                  </>
                ) : (
                  <span className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
                    Hover a bar for visits on that date.
                  </span>
                )}
              </div>
              <div className="overflow-x-auto pb-2">
              {(() => {
                const byDay = stats?.visitsByDay || [];
                const maxC = Math.max(1, ...byDay.map((d) => d.count));
                const n = byDay.length;
                const labelStep =
                  n > 20 ? Math.max(1, Math.ceil(n / 16)) : n > 12 ? 2 : 1;
                const showTick = (i) =>
                  i % labelStep === 0 || i === n - 1 || n <= 12;
                return (
                  <div
                    className="flex items-end gap-0.5 sm:gap-1 h-36 px-1 border-b border-slate-200/80 dark:border-slate-700/80 min-w-min"
                    style={{
                      minWidth: n ? `${Math.max(n * (n > 25 ? 10 : 14), 220)}px` : undefined,
                    }}
                    onMouseLeave={() => setVisitsBarHover(null)}
                  >
                    {n === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400 py-8 w-full text-center">
                        No visit data in this range.
                      </p>
                    ) : (
                      byDay.map((d, i) => {
                        const barPx =
                          d.count === 0
                            ? 4
                            : Math.max(8, Math.round((d.count / maxC) * 104));
                        return (
                          <div
                            key={d.date}
                            role="img"
                            aria-label={`${d.date}: ${d.count} visits`}
                            className="flex-1 flex flex-col items-center justify-end h-full min-w-0 max-w-[36px] sm:max-w-[44px] cursor-crosshair"
                            onMouseEnter={() =>
                              setVisitsBarHover({ date: d.date, count: d.count })
                            }
                          >
                            <div
                              className={`w-full rounded-t-md ring-1 transition-[box-shadow] ${
                                visitsBarHover?.date === d.date
                                  ? 'ring-2 ring-sky-500 dark:ring-sky-400 shadow-md bg-sky-500 dark:bg-sky-500'
                                  : 'ring-sky-700/30 bg-sky-500/90 dark:bg-sky-600'
                              }`}
                              style={{ height: `${barPx}px` }}
                            />
                            <div className="mt-1 h-9 w-full flex items-start justify-center overflow-visible">
                              {showTick(i) ? (
                                <span
                                  className={`text-[8px] sm:text-[9px] font-mono text-slate-500 dark:text-slate-400 text-center leading-tight ${
                                    n > 18
                                      ? 'origin-top-left -rotate-45 translate-y-0.5 whitespace-nowrap'
                                      : 'truncate w-full'
                                  }`}
                                  title={d.date}
                                >
                                  {n > 24 ? d.date.slice(8) : d.date.slice(5)}
                                </span>
                              ) : (
                                <span className="text-[8px] text-slate-600 opacity-70">·</span>
                              )}
                            </div>
                            <span className="text-[8px] text-slate-400 tabular-nums -mt-0.5">
                              {d.count}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              })()}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-violet-500" />
              <h3 className="font-bold text-slate-900 dark:text-white">Most-used APIs</h3>
              <HelpTooltip
                title="Most used"
                text="Call counts by v2 path (Scrape Creators) or legacy:module for the same range as the chart above."
              />
            </div>
            <div className="p-5">
              {(stats?.mostUsedApi || []).length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">
                  No data in this range yet. Run a few requests then reload Summary.
                </p>
              ) : (
                <ul className="space-y-3">
                  {(() => {
                    const rows = stats.mostUsedApi;
                    const max = Math.max(1, ...rows.map((r) => r.count));
                    return rows.map((row) => (
                      <li key={row.path} className="space-y-1">
                        <div className="flex justify-between gap-2 text-xs sm:text-sm">
                          <span
                            className="font-mono text-slate-700 dark:text-slate-300 truncate"
                            title={row.path}
                          >
                            {row.path}
                          </span>
                          <span className="shrink-0 tabular-nums font-bold text-slate-600 dark:text-slate-400">
                            {row.count}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
                            style={{ width: `${Math.round((row.count / max) * 100)}%` }}
                          />
                        </div>
                      </li>
                    ));
                  })()}
                </ul>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-500" />
              <h3 className="font-bold text-slate-900 dark:text-white">Visitors by IP</h3>
              <HelpTooltip
                title="IP"
                text="Visitor IP, recorded visit sessions, scrape submits in this range, and sample Referer headers when present."
              />
            </div>
            <div className="max-h-80 overflow-y-auto custom-scrollbar">
              {(stats?.ipBreakdown || []).length === 0 ? (
                <p className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                  No IP data in this range yet.
                </p>
              ) : (
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0">
                    <tr className="text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      <th className="px-4 py-3">IP</th>
                      <th className="px-4 py-3">Visits</th>
                      <th className="px-4 py-3">Submits</th>
                      <th className="px-4 py-3">Referrer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(stats?.ipBreakdown || []).map((row) => (
                      <tr key={row.ip} className="text-slate-700 dark:text-slate-300">
                        <td className="px-4 py-2 font-mono text-xs whitespace-nowrap">{row.ip}</td>
                        <td className="px-4 py-2 tabular-nums">{row.visits}</td>
                        <td className="px-4 py-2 tabular-nums font-semibold">{row.submits}</td>
                        <td className="px-4 py-2 max-w-[220px] text-xs text-slate-500 dark:text-slate-400">
                          {(row.referrers || []).filter(Boolean).join(' · ') || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
              <Activity className="w-5 h-5 text-orange-500" />
              <h3 className="font-bold text-slate-900 dark:text-white">Recent activity</h3>
              <HelpTooltip
                title="Log"
                text="Each v2 (Execute) and legacy scrape to the backend is logged. Reload the Summary tab to refresh."
              />
            </div>
            <div className="max-h-72 overflow-y-auto custom-scrollbar">
              {(stats?.recentActivity || []).length === 0 ? (
                <p className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                  No entries yet. Run a scrape from Home (API or legacy), then open Summary again.
                </p>
              ) : (
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0">
                    <tr className="text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      <th className="px-4 py-3">Time</th>
                      <th className="px-4 py-3">Source</th>
                      <th className="px-4 py-3">Detail</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(stats?.recentActivity || []).map((row) => (
                      <tr key={row.id} className="text-slate-700 dark:text-slate-300">
                        <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap">
                          {row.at ? new Date(row.at).toLocaleString() : '—'}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-semibold">
                            {row.source === 'v2' ? 'v2' : 'Legacy'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 max-w-[200px] truncate font-mono text-xs" title={row.path || row.module}>
                          {row.path || row.module || '—'}
                        </td>
                        <td className="px-4 py-2.5">
                          {row.ok ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">OK</span>
                          ) : (
                            <span className="text-rose-600 dark:text-rose-400 font-semibold" title={row.error}>
                              Failed
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {tab === 'kustomisasi' && (
        <div className="space-y-4">
          {settingsErr && (
            <div className="text-red-600 dark:text-red-400 text-sm px-1">{settingsErr}</div>
          )}
          {settingsLoading ? (
            <p className="text-slate-500 py-8 text-center animate-pulse">Loading customization…</p>
          ) : (
            <AdminSiteTab
              authToken={authToken}
              site={siteCustomization}
              setSettingsErr={setSettingsErr}
              showToast={showToast}
              onSaved={(savedSite) => {
                if (savedSite && typeof savedSite === 'object') {
                  setSiteCustomization(savedSite);
                }
                onFeaturesSaved?.();
                loadSettings();
              }}
            />
          )}
        </div>
      )}

      {tab === 'admins' && (
        <div className="space-y-4">
          {settingsErr && (
            <div className="text-red-600 dark:text-red-400 text-sm px-1">{settingsErr}</div>
          )}
          <AdminAccountsTab
            authToken={authToken}
            setAuthToken={setAuthToken}
            setSettingsErr={setSettingsErr}
            showToast={showToast}
          />
        </div>
      )}

      {tab === 'pengaturan' && (
        <div className="space-y-8">
          {settingsErr && (
            <div className="text-red-600 dark:text-red-400 text-sm px-1">{settingsErr}</div>
          )}
          {settingsLoading ? (
            <p className="text-slate-500 py-8 text-center animate-pulse">Loading settings…</p>
          ) : (
            <>
              <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 p-5 md:p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      Scrape Creators — API key
                      <HelpTooltip
                        title="API key"
                        text="Stored on the server (data/). Not sent to visitors' browsers. If cleared and saved, SCRAPE_CREATORS_API_KEY from .env is used when set."
                      />
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Status:{' '}
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {apiKeyHint || 'none (file)'}
                      </span>
                      {apiKeyFromEnv ? (
                        <span className="ml-2 text-emerald-600 dark:text-emerald-400">
                          + fallback .env
                        </span>
                      ) : null}
                    </p>
                  </div>
                </div>
                <input
                  type="password"
                  autoComplete="off"
                  placeholder="Paste new x-api-key…"
                  value={apiKeyDraft}
                  onChange={(e) => setApiKeyDraft(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/80 px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 mb-3"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={saveKeyBusy}
                    onClick={saveApiKey}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-4 py-2.5 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {saveKeyBusy ? 'Saving…' : 'Save API key'}
                  </button>
                  <button
                    type="button"
                    disabled={saveKeyBusy}
                    onClick={async () => {
                      setApiKeyDraft('');
                      setSaveKeyBusy(true);
                      try {
                        await fetchJson('/api/admin/settings', {
                          method: 'POST',
                          headers: {
                            Authorization: `Bearer ${authToken}`,
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ scrapeCreatorsApiKey: null }),
                        });
                        setApiKeyHint('');
                        showToast('Key file cleared (can use .env).');
                        loadStats();
                      } catch (e) {
                        setSettingsErr(e.message);
                      } finally {
                        setSaveKeyBusy(false);
                      }
                    }}
                    className="rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-semibold px-4 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Remove key (file)
                  </button>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 p-5 md:p-6 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Mail className="w-5 h-5 text-sky-500 shrink-0" />
                    Feedback — Resend email
                    <HelpTooltip
                      title="Resend"
                      text="When API key, From, and To are set (here or in .env), each public feedback submission is emailed to To and stored in data/feedback.jsonl. From must be a domain or address allowed in your Resend dashboard."
                    />
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Resend key:{' '}
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {resendKeyHint || 'none (file)'}
                    </span>
                    {resendKeyFromEnv ? (
                      <span className="ml-2 text-emerald-600 dark:text-emerald-400">+ RESEND_API_KEY in .env</span>
                    ) : null}
                    <span className="mx-2">·</span>
                    Email notify:{' '}
                    <span
                      className={
                        feedbackEmailReady
                          ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                          : 'font-semibold text-amber-700 dark:text-amber-300'
                      }
                    >
                      {feedbackEmailReady ? 'ready' : 'incomplete'}
                    </span>
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                      Resend API key (paste to set; leave empty to keep current)
                    </label>
                    <input
                      type="password"
                      autoComplete="off"
                      placeholder="re_…"
                      value={resendKeyDraft}
                      onChange={(e) => setResendKeyDraft(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/80 px-3 py-2 text-sm text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                      From (verified in Resend)
                    </label>
                    <input
                      type="email"
                      value={feedbackFromDraft}
                      onChange={(e) => setFeedbackFromDraft(e.target.value)}
                      placeholder="onboarding@resend.dev"
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/80 px-3 py-2 text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                      To (your inbox)
                    </label>
                    <input
                      type="email"
                      value={feedbackToDraft}
                      onChange={(e) => setFeedbackToDraft(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/80 px-3 py-2 text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  <button
                    type="button"
                    disabled={saveResendBusy}
                    onClick={saveFeedbackResend}
                    className="inline-flex items-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-bold px-4 py-2.5 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {saveResendBusy ? 'Saving…' : 'Save feedback mail settings'}
                  </button>
                  <button
                    type="button"
                    disabled={saveResendBusy}
                    onClick={async () => {
                      setResendKeyDraft('');
                      setSaveResendBusy(true);
                      setSettingsErr(null);
                      try {
                        const data = await fetchJson('/api/admin/settings', {
                          method: 'POST',
                          headers: {
                            Authorization: `Bearer ${authToken}`,
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ resendApiKey: null }),
                        });
                        setResendKeyHint(data.resendKeyHint || '');
                        setResendKeyFromEnv(!!data.resendKeyFromEnv);
                        setFeedbackEmailReady(!!data.feedbackEmailReady);
                        showToast('Resend key cleared from file (can use .env).');
                      } catch (e) {
                        setSettingsErr(e.message);
                      } finally {
                        setSaveResendBusy(false);
                      }
                    }}
                    className="rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-semibold px-4 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Remove Resend key (file)
                  </button>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 p-5 md:p-6 shadow-sm space-y-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Unlock className="w-5 h-5 text-amber-500 shrink-0" />
                  Scrape quota — exempt IPs
                  <HelpTooltip
                    title="Exempt IPs"
                    text="Public users are limited to 5 scrape submits per IP per day (v2 Execute and legacy modules). IPs listed here skip that cap (unlimited). Use the visitor’s public IP; behind a proxy the server uses X-Forwarded-For when present. IPv4 and IPv6 supported; ::ffff:x.x.x.x is normalized to IPv4."
                  />
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Trusted IPs skip the 5/day scrape cap. <strong className="font-semibold text-slate-600 dark:text-slate-300">Save exempt list</strong> also adds the value in the box if you did not press Add. Saving Customize, API key, or sidebar no longer clears IPs here.
                </p>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="e.g. 203.0.113.42 or 2001:db8::1"
                    value={exemptIpDraft}
                    onChange={(e) => setExemptIpDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addExemptIp();
                      }
                    }}
                    className="min-w-[12rem] flex-1 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/80 px-3 py-2 text-sm text-slate-900 dark:text-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={addExemptIp}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-semibold px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>
                {submitQuotaExemptIps.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                    No exempt IPs — everyone gets the 5/day limit.
                  </p>
                ) : (
                  <ul className="rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto custom-scrollbar">
                    {submitQuotaExemptIps.map((ip) => (
                      <li
                        key={ip}
                        className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-50/50 dark:bg-slate-800/30"
                      >
                        <code className="text-sm text-slate-800 dark:text-slate-200">{ip}</code>
                        <button
                          type="button"
                          aria-label={`Remove ${ip}`}
                          onClick={() =>
                            setSubmitQuotaExemptIps((prev) => prev.filter((x) => x !== ip))
                          }
                          className="p-2 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    disabled={saveExemptBusy}
                    onClick={saveSubmitQuotaExemptIps}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold px-4 py-2.5 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {saveExemptBusy ? 'Saving…' : 'Save exempt list'}
                  </button>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 p-5 md:p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Sidebar — API platforms
                    <HelpTooltip
                      title="v2 sidebar"
                      text="Hide platforms you do not want in the public menu. No visitor login required; settings are stored on the server."
                    />
                  </h3>
                  <div className="relative w-full sm:w-56">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      value={v2Search}
                      onChange={(e) => setV2Search(e.target.value)}
                      placeholder="Search platforms…"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-sm"
                    />
                  </div>
                </div>
                <div className="grid gap-2 max-h-[min(24rem,50vh)] overflow-y-auto custom-scrollbar pr-1">
                  {filteredV2.map(([slug, p]) => (
                    <div
                      key={slug}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 dark:border-slate-800 px-3 py-2.5 bg-slate-50/50 dark:bg-slate-800/30"
                    >
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                        {p.name}
                      </span>
                      <ToggleSwitch
                        checked={v2Enabled(slug)}
                        onChange={(on) => setV2Enabled(slug, on)}
                        ariaLabel={`Enable ${p.name}`}
                      />
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 p-5 md:p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  Sidebar — Legacy v1
                  <HelpTooltip
                    title="Local scrapers"
                    text="Modules that hit the Scraptor backend (port 3008), not Scrape Creators."
                  />
                </h3>
                <div className="grid gap-2">
                  {LEGACY_ITEMS.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 dark:border-slate-800 px-3 py-2.5 bg-slate-50/50 dark:bg-slate-800/30"
                    >
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        {item.label}
                        <HelpTooltip title={item.label} text={item.hint} />
                      </span>
                      <ToggleSwitch
                        checked={legacyEnabled(item.id)}
                        onChange={(on) => setLegacyEnabled(item.id, on)}
                        ariaLabel={`Enable ${item.label}`}
                      />
                    </div>
                  ))}
                </div>
              </section>

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={saveFeatBusy}
                  onClick={saveFeatures}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold px-5 py-3 shadow-md disabled:opacity-50"
                >
                  <Zap className="w-4 h-4" />
                  {saveFeatBusy ? 'Saving…' : 'Save sidebar changes'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
