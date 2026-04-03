import { useState, useEffect } from 'react';
import {
  Sun,
  Moon,
  Briefcase,
  PlaySquare,
  Store,
  BookOpen,
  ShoppingBag,
  LayoutDashboard,
  Camera,
  Music,
  Hash,
  LogOut,
  Globe2,
  Users,
  MessageCircle,
  Link2,
  BarChart2,
  Sparkles,
  Search,
  Megaphone,
  Radio,
  Gem,
  Menu,
  X,
  MessageSquare,
} from 'lucide-react';
import Tokopedia from './components/Tokopedia';
import LinkedIn from './components/LinkedIn';
import YouTube from './components/YouTube';
import PlayStore from './components/PlayStore';
import News from './components/News';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import PlatformV2View from './components/PlatformV2View';
import HomeBeranda from './components/HomeBeranda';
import TermsConsentModal from './components/TermsConsentModal';
import MobileDesktopNotice from './components/MobileDesktopNotice';
import SiteBannerStack from './components/SiteBannerStack';
import MaintenanceOverlay from './components/MaintenanceOverlay';
import DonationPopupHost from './components/DonationPopupHost';
import FeedbackModal from './components/FeedbackModal';
import ServiceStatusIndicator from './components/ServiceStatusIndicator';
import { BerandaIcon } from './lib/berandaIcons.jsx';
import { hasAcceptedTerms } from './lib/termsStorage';
import { apiCatalog, catalogMeta } from './config/apiCatalog';
import { fetchApi, apiUrl } from './utils/apiFetch';
import { getAccessAuthHeaders } from './utils/apiAccess';

const LEGACY_IDS = ['linkedin', 'youtube', 'playstore', 'news', 'tokopedia'];

function browserPageTitleSegment(activeTab, authToken) {
  if (activeTab === 'beranda') return 'Home';
  if (activeTab === 'admin') return authToken ? 'Dashboard' : 'Login';
  if (activeTab.startsWith('v2_')) {
    const key = activeTab.slice(3);
    return apiCatalog[key]?.name || activeTab;
  }
  return `${activeTab.replace('-', ' ')} (Legacy)`;
}

const PLATFORM_GRADIENTS = [
  'from-fuchsia-500 to-pink-600',
  'from-orange-500 to-rose-600',
  'from-slate-700 to-slate-900',
  'from-red-500 to-rose-600',
  'from-blue-600 to-indigo-700',
  'from-blue-500 to-blue-700',
  'from-violet-500 to-purple-700',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-cyan-500 to-blue-600',
  'from-green-600 to-emerald-700',
  'from-indigo-500 to-violet-600',
];

/** Lucide component per OpenAPI tag name */
const TAG_ICONS = {
  TikTok: Music,
  'TikTok Shop': ShoppingBag,
  Instagram: Camera,
  YouTube: PlaySquare,
  LinkedIn: Briefcase,
  Facebook: Users,
  'Facebook Ad Library': Megaphone,
  'Google Ad Library': Search,
  'LinkedIn Ad Library': Briefcase,
  Twitter: Hash,
  Reddit: MessageCircle,
  'Truth Social': Radio,
  Threads: MessageCircle,
  Bluesky: Globe2,
  Pinterest: Camera,
  Google: Search,
  Twitch: Radio,
  Kick: PlaySquare,
  Snapchat: Camera,
  Linktree: Link2,
  Komi: Link2,
  Pillar: Link2,
  Linkbio: Link2,
  'Amazon Shop': ShoppingBag,
  'Age and Gender': BarChart2,
  'Scrape Creators': Sparkles,
  Linkme: Link2,
};

function iconForTag(tag) {
  return TAG_ICONS[tag] || LayoutDashboard;
}

function gradientForPlatform(platform) {
  const idx =
    typeof platform.colorIndex === 'number'
      ? platform.colorIndex
      : 0;
  return PLATFORM_GRADIENTS[idx % PLATFORM_GRADIENTS.length];
}

function resolveV2SubTab(config, activeSubTab) {
  if (!config?.endpoints?.length) return null;
  if (activeSubTab && config.endpoints.some((e) => e.id === activeSubTab)) {
    return activeSubTab;
  }
  return config.endpoints[0].id;
}

function App() {
  const [activeTab, setActiveTab] = useState('beranda');
  const [activeSubTab, setActiveSubTab] = useState(null);
  const [authToken, setAuthToken] = useState(() =>
    typeof window !== 'undefined'
      ? localStorage.getItem('scraptor_auth_token')
      : null
  );
  const [publicConfig, setPublicConfig] = useState({
    disabled: { v2: [], legacy: [] },
    apiKeyConfigured: false,
    site: null,
  });
  const [featureEpoch, setFeatureEpoch] = useState(0);

  const [termsAccepted, setTermsAccepted] = useState(() =>
    typeof window !== 'undefined' ? hasAcceptedTerms() : false
  );

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    let cancelled = false;
    fetchApi('/api/public/config')
      .then(({ ok, data }) => {
        if (cancelled || !ok || !data) return;
        setPublicConfig({
          disabled: {
            v2: data.disabled?.v2 || [],
            legacy: data.disabled?.legacy || [],
          },
          apiKeyConfigured: !!data.apiKeyConfigured,
          site: data.site ?? null,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [featureEpoch]);

  useEffect(() => {
    if (!termsAccepted) return;
    try {
      if (sessionStorage.getItem('scraptor_visit_logged')) return;
      (async () => {
        try {
          const auth = await getAccessAuthHeaders();
          await fetch(apiUrl('/api/public/visit'), {
            method: 'POST',
            headers: { ...auth },
          });
        } catch {
          /* ignore */
        }
      })();
      sessionStorage.setItem('scraptor_visit_logged', '1');
    } catch {
      /* ignore */
    }
  }, [termsAccepted]);

  const isV2Visible = (slug) => !publicConfig.disabled?.v2?.includes(slug);
  const isLegacyVisible = (id) => !publicConfig.disabled?.legacy?.includes(id);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- sinkron tab saat fitur dinonaktifkan admin */
    if (activeTab.startsWith('v2_')) {
      const k = activeTab.slice(3);
      if (publicConfig.disabled?.v2?.includes(k)) setActiveTab('beranda');
    } else if (LEGACY_IDS.includes(activeTab)) {
      if (publicConfig.disabled?.legacy?.includes(activeTab)) setActiveTab('beranda');
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [activeTab, publicConfig]);

  const visibleV2Keys = Object.keys(apiCatalog).filter(isV2Visible);
  const visibleLegacyCount = LEGACY_IDS.filter(isLegacyVisible).length;
  const site = publicConfig.site;
  const maintenanceBlocksPublic =
    !!site?.maintenance?.enabled && activeTab !== 'admin';

  const appBrandName = site?.branding?.appName?.trim() || 'Scraptor UI';
  const appBrandSubtitle = site?.branding?.appSubtitle?.trim() || 'Public + Admin';
  const sidebarBrandIcon = site?.branding?.sidebarIcon || 'LayoutDashboard';

  useEffect(() => {
    const suffix = site?.branding?.documentTitle?.trim() || 'Scraptor UI';
    document.title = `${browserPageTitleSegment(activeTab, authToken)} · ${suffix}`;
  }, [activeTab, authToken, site?.branding?.documentTitle]);

  useEffect(() => {
    const url = site?.branding?.faviconUrl?.trim();
    let link = document.querySelector("link[rel='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    if (url) {
      link.href = url;
      link.removeAttribute('type');
    } else {
      link.href = '/favicon.svg';
      link.type = 'image/svg+xml';
    }
  }, [site?.branding?.faviconUrl]);

  const navSelect = (fn) => {
    fn();
    setMobileNavOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('scraptor_auth_token');
    setAuthToken(null);
    setMobileNavOpen(false);
  };

  const renderContent = () => {
    if (activeTab === 'beranda') {
      return (
        <HomeBeranda
          platformCount={catalogMeta.platformCount}
          endpointCount={catalogMeta.endpointCount}
          visibleV2Count={visibleV2Keys.length}
          visibleLegacyCount={visibleLegacyCount}
          apiCatalog={apiCatalog}
          visibleV2Keys={visibleV2Keys}
          site={site}
          onOpenV2Endpoint={(slug, endpointId) => {
            navSelect(() => {
              setActiveTab(`v2_${slug}`);
              setActiveSubTab(endpointId);
            });
          }}
        />
      );
    }

    if (activeTab === 'admin') {
      if (!authToken) {
        return <Login setAuthToken={setAuthToken} variant="embedded" />;
      }
      return (
        <AdminPanel
          authToken={authToken}
          setAuthToken={setAuthToken}
          apiCatalog={apiCatalog}
          onFeaturesSaved={() => setFeatureEpoch((n) => n + 1)}
        />
      );
    }

    if (activeTab.startsWith('v2_')) {
      const platformKey = activeTab.slice(3);
      const config = apiCatalog[platformKey];
      const sub = resolveV2SubTab(config, activeSubTab);
      if (!config || !sub) {
        return (
          <div className="p-8 text-slate-500 dark:text-slate-400">
            Loading platform…
          </div>
        );
      }
      return (
        <PlatformV2View
          platformInfo={config}
          activeSubTab={sub}
          setActiveSubTab={setActiveSubTab}
        />
      );
    }

    switch (activeTab) {
      case 'tokopedia':
        return <Tokopedia />;
      case 'linkedin':
        return <LinkedIn />;
      case 'youtube':
        return <YouTube />;
      case 'playstore':
        return <PlayStore />;
      case 'news':
        return <News />;
      default:
        return (
          <div className="p-8 bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-center text-slate-500 dark:text-slate-400">
            Module {activeTab} is not available yet.
          </div>
        );
    }
  };

  const getHeaderTitle = () => {
    if (activeTab === 'beranda') return 'Home';
    if (activeTab === 'admin')
      return authToken ? 'Dashboard' : 'Login';
    if (activeTab.startsWith('v2_')) {
      const key = activeTab.slice(3);
      return apiCatalog[key]?.name || activeTab;
    }
    return activeTab.replace('-', ' ') + ' (Legacy)';
  };

  return (
    <>
      {!termsAccepted ? (
        <TermsConsentModal
          terms={site?.modals?.terms}
          onAccept={() => setTermsAccepted(true)}
        />
      ) : null}
      {termsAccepted ? (
        <MobileDesktopNotice desktopNotice={site?.modals?.desktopNotice} />
      ) : null}
      {termsAccepted ? (
        <DonationPopupHost
          donationRaw={site?.modals?.donationPopup}
          activeTab={activeTab}
          termsAccepted={termsAccepted}
          maintenanceBlocksPublic={maintenanceBlocksPublic}
        />
      ) : null}
      {termsAccepted ? (
        <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      ) : null}
      <div
        className={`flex h-screen flex-col overflow-hidden transition-colors duration-500 ${
          isDarkMode ? 'dark bg-[#0b1120]' : 'bg-slate-50 text-slate-900'
        } ${!termsAccepted ? 'pointer-events-none invisible' : ''}`}
      >
        <header className="supports-[padding:max(0px)]:pt-[max(0.65rem,env(safe-area-inset-top))] z-30 flex shrink-0 items-center gap-2 border-b border-slate-200/80 bg-white/90 px-3 py-2.5 backdrop-blur-lg dark:border-slate-800/80 dark:bg-[#1e293b]/90 md:hidden">
          <button
            type="button"
            aria-label="Open menu"
            className="rounded-xl p-2 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {appBrandName}
            </p>
            <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
              {getHeaderTitle()}
            </p>
          </div>
          <button
            type="button"
            aria-label="Toggle theme"
            className="rounded-xl p-2 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            onClick={() => setIsDarkMode(!isDarkMode)}
          >
            {isDarkMode ? (
              <Sun className="h-5 w-5 opacity-90" />
            ) : (
              <Moon className="h-5 w-5 opacity-90" />
            )}
          </button>
        </header>

        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col md:flex-row">
          {mobileNavOpen ? (
            <button
              type="button"
              aria-label="Close menu"
              className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-[1px] md:hidden"
              onClick={() => setMobileNavOpen(false)}
            />
          ) : null}

          <aside
            className={`fixed inset-y-0 left-0 z-50 flex w-[min(20rem,calc(100vw-0.75rem))] max-w-[92vw] shrink-0 flex-col overflow-hidden border-r border-slate-200/50 bg-white/95 shadow-2xl backdrop-blur-xl transition-transform duration-300 ease-out dark:border-slate-800/50 dark:bg-[#1e293b]/95 md:static md:z-20 md:m-4 md:w-72 md:max-w-none md:translate-x-0 md:rounded-3xl md:border md:bg-white/80 md:shadow-sm md:dark:bg-[#1e293b]/80 ${
              mobileNavOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
            }`}
          >
            <div className="flex items-center justify-end border-b border-slate-200/80 px-2 py-1.5 dark:border-slate-700/80 md:hidden">
              <button
                type="button"
                aria-label="Close menu"
                className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                onClick={() => setMobileNavOpen(false)}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
        <div className="flex items-center gap-3 px-5 pb-4 pt-4 md:p-8 md:pb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <BerandaIcon name={sidebarBrandIcon} className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
              {appBrandName}
            </h1>
            <p className="text-xs font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase mt-0.5">
              {appBrandSubtitle}
            </p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 pb-4 space-y-1 custom-scrollbar">
          <button
            type="button"
            onClick={() => navSelect(() => setActiveTab('beranda'))}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 font-medium ${
              activeTab === 'beranda'
                ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 shadow-sm ring-1 ring-indigo-500/10'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-indigo-600 dark:hover:text-indigo-300'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" /> Home
          </button>

          <p className="px-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 mt-6">
            Scraper API
          </p>

          {visibleV2Keys.map((key) => {
            const platform = apiCatalog[key];
            const isActive = activeTab === `v2_${key}`;
            const IconComp = iconForTag(platform.tag);
            const grad = gradientForPlatform(platform);
            return (
              <button
                type="button"
                key={key}
                onClick={() =>
                  navSelect(() => {
                    setActiveTab(`v2_${key}`);
                    setActiveSubTab(null);
                  })
                }
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 font-medium ${
                  isActive
                    ? 'bg-slate-100 dark:bg-slate-800/80 text-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm dark:text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-slate-800 dark:hover:text-slate-200 border border-transparent'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg bg-gradient-to-br ${grad} flex items-center justify-center shrink-0`}
                >
                  <IconComp className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="truncate text-left">{platform.name}</span>
              </button>
            );
          })}

          {visibleLegacyCount > 0 && (
            <p className="px-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 mt-6">
              Legacy Scrapers (v1)
            </p>
          )}

          {isLegacyVisible('linkedin') && (
            <button
              type="button"
              onClick={() => navSelect(() => setActiveTab('linkedin'))}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all duration-200 font-medium ${
                activeTab === 'linkedin'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-l-2 border-indigo-500'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Briefcase className="w-4 h-4 opacity-70" /> LinkedIn
            </button>
          )}

          {isLegacyVisible('youtube') && (
            <button
              type="button"
              onClick={() => navSelect(() => setActiveTab('youtube'))}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all duration-200 font-medium ${
                activeTab === 'youtube'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-l-2 border-red-500'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <PlaySquare className="w-4 h-4 opacity-70" /> YouTube
            </button>
          )}

          {isLegacyVisible('playstore') && (
            <button
              type="button"
              onClick={() => navSelect(() => setActiveTab('playstore'))}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all duration-200 font-medium ${
                activeTab === 'playstore'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-l-2 border-emerald-500'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Store className="w-4 h-4 opacity-70" /> Play Store
            </button>
          )}

          {isLegacyVisible('news') && (
            <button
              type="button"
              onClick={() => navSelect(() => setActiveTab('news'))}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all duration-200 font-medium ${
                activeTab === 'news'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-l-2 border-purple-500'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <BookOpen className="w-4 h-4 opacity-70" /> News Portal
            </button>
          )}

          {isLegacyVisible('tokopedia') && (
            <button
              type="button"
              onClick={() => navSelect(() => setActiveTab('tokopedia'))}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all duration-200 font-medium ${
                activeTab === 'tokopedia'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-l-2 border-orange-500'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <ShoppingBag className="w-4 h-4 opacity-70" /> Tokopedia
            </button>
          )}
        </nav>

        <div className="px-4 pb-2">
          <button
            type="button"
            onClick={() => navSelect(() => setActiveTab('admin'))}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 font-semibold border ${
              activeTab === 'admin'
                ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-500/30'
                : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-600/50'
            }`}
          >
            <Gem className="w-5 h-5 text-amber-500" />
            {authToken ? 'Dashboard' : 'Login'}
          </button>
        </div>

        <div className="flex gap-2 border-t border-slate-200/50 p-4 dark:border-slate-800/50">
          <button
            type="button"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="flex h-12 min-w-0 flex-1 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            aria-label={isDarkMode ? 'Light mode' : 'Dark mode'}
          >
            {isDarkMode ? (
              <Sun className="h-5 w-5 opacity-70" />
            ) : (
              <Moon className="h-5 w-5 opacity-70" />
            )}
          </button>

          <ServiceStatusIndicator
            variant="dot"
            maintenanceEnabled={!!site?.maintenance?.enabled}
          />

          <button
            type="button"
            onClick={() => setFeedbackOpen(true)}
            className="flex h-12 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200/80 bg-slate-100 text-slate-700 transition-colors hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            aria-label="Open feedback form"
            title="Feedback"
          >
            <MessageSquare className="h-5 w-5 opacity-80" />
          </button>

          {authToken ? (
            <button
              type="button"
              onClick={handleLogout}
              className="flex h-12 min-w-0 flex-1 items-center justify-center rounded-2xl bg-red-50 text-red-600 transition-colors hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
              title="Logout"
            >
              <LogOut className="h-5 w-5 opacity-80" />
            </button>
          ) : (
            <div
              className="flex h-12 min-w-0 flex-1 items-center justify-center rounded-2xl bg-slate-100/50 text-xs font-medium text-slate-400 dark:bg-slate-800/30"
              title="Sign in from the Login section"
            >
              Guest
            </div>
          )}
        </div>
      </aside>

      <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto px-3 py-3 supports-[padding:max(0px)]:pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-5 md:px-8 md:py-8 lg:pr-12">
        <header className="mb-4 mt-1 hidden shrink-0 md:mb-8 md:block">
          <div>
            <h2 className="flex items-center gap-3 text-2xl font-extrabold capitalize tracking-tight text-slate-900 dark:text-white sm:text-3xl lg:text-4xl">
              {getHeaderTitle()}
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 md:text-base lg:text-lg">
              Choose your platform and start scraping
            </p>
          </div>
        </header>

        <SiteBannerStack site={site} />

        <section className="relative w-full min-w-0 flex flex-col rounded-2xl bg-white/80 shadow-sm ring-1 ring-slate-200/50 transition-all dark:bg-[#1e293b]/80 dark:ring-slate-800/50 md:rounded-[2rem] p-4 pb-8 sm:p-6 sm:pb-10 md:p-10">
          {maintenanceBlocksPublic ? (
            <MaintenanceOverlay
              message={site?.maintenance?.message}
              onEnterAdmin={() => navSelect(() => setActiveTab('admin'))}
            />
          ) : null}
          {renderContent()}
        </section>
      </main>
        </div>
      </div>
    </>
  );
}

export default App;
