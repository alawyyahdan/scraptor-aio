import { useState, useEffect } from 'react';
import { Palette, Plus, Trash2, Save, MessageSquare, LayoutTemplate, Heart, Eye } from 'lucide-react';
import { fetchJson } from '../utils/apiFetch';
import HelpTooltip from './HelpTooltip';
import ToggleSwitch from './ToggleSwitch';
import { BERANDA_ICON_OPTIONS, FEATURE_CARD_COLORS } from '../lib/berandaIcons.jsx';
import AdminSitePreview from './AdminSitePreview';
import DonationPopupModal from './DonationPopupModal';
import { mergeDonationPopup } from '../lib/siteModalDefaults';

const DEFAULT_BRANDING = {
  appName: 'Scraptor UI',
  appSubtitle: 'Public + Admin',
  sidebarIcon: 'LayoutDashboard',
  documentTitle: 'Scraptor UI',
  faviconUrl: '',
};

function emptyCard() {
  const id = `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  return {
    id,
    enabled: true,
    icon: 'Layers',
    iconColor: 'fuchsia',
    title: '',
    body: '',
  };
}

export default function AdminSiteTab({ authToken, site, onSaved, setSettingsErr, showToast }) {
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [donationPreviewOpen, setDonationPreviewOpen] = useState(false);

  useEffect(() => {
    if (!site) return;
    const d = structuredClone(site);
    d.branding = {
      ...DEFAULT_BRANDING,
      ...(site.branding && typeof site.branding === 'object' ? site.branding : {}),
    };
    setDraft(d);
  }, [site]);

  if (!draft) {
    return <p className="py-8 text-center text-slate-500 animate-pulse">Loading…</p>;
  }

  const patch = (path, value) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      const parts = path.split('.');
      let o = next;
      for (let i = 0; i < parts.length - 1; i++) {
        const k = parts[i];
        if (o[k] == null || typeof o[k] !== 'object') o[k] = {};
        o = o[k];
      }
      o[parts[parts.length - 1]] = value;
      return next;
    });
  };

  const patchBanner = (kind, field, value) => {
    setDraft((prev) => ({
      ...prev,
      banners: {
        ...prev.banners,
        [kind]: { ...prev.banners[kind], [field]: value },
      },
    }));
  };

  const save = async () => {
    setBusy(true);
    setSettingsErr(null);
    try {
      const data = await fetchJson('/api/admin/settings', {
        method: 'POST',
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ site: draft }),
      });
      showToast('Site customization saved.');
      onSaved?.(data?.site);
    } catch (e) {
      setSettingsErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const cards = draft.beranda?.featureCards || [];
  const donationPreviewMerged = mergeDonationPopup(draft.modals?.donationPopup);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(300px,38%)] lg:gap-8 xl:gap-10 lg:items-start">
        <aside className="order-1 lg:order-2 min-w-0 lg:sticky lg:top-3 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pb-4 lg:pl-1 lg:-mr-1">
          <AdminSitePreview site={draft} />
        </aside>

        <div className="order-2 lg:order-1 min-w-0 space-y-10">
      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 p-5 md:p-6 shadow-sm space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <LayoutTemplate className="w-5 h-5 text-violet-500 shrink-0" />
          Branding
          <HelpTooltip
            title="Branding"
            text="Sidebar header (title, subtitle, icon), browser tab title pattern “Page · name”, and favicon. Use a public HTTPS image URL or a small data:image/… URL."
          />
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-1">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">App name</label>
            <input
              type="text"
              value={draft.branding?.appName ?? ''}
              onChange={(e) => patch('branding.appName', e.target.value)}
              maxLength={80}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
            />
          </div>
          <div className="sm:col-span-1">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Subtitle</label>
            <input
              type="text"
              value={draft.branding?.appSubtitle ?? ''}
              onChange={(e) => patch('branding.appSubtitle', e.target.value)}
              maxLength={120}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Sidebar logo icon</label>
          <select
            value={draft.branding?.sidebarIcon || 'LayoutDashboard'}
            onChange={(e) => patch('branding.sidebarIcon', e.target.value)}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
          >
            {BERANDA_ICON_OPTIONS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
            Browser title (suffix after “Page ·”)
          </label>
          <input
            type="text"
            value={draft.branding?.documentTitle ?? ''}
            onChange={(e) => patch('branding.documentTitle', e.target.value)}
            maxLength={120}
            placeholder="Scraptor UI"
            className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
          />
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Example: <span className="font-mono text-slate-600 dark:text-slate-300">Home · {draft.branding?.documentTitle?.trim() || 'Scraptor UI'}</span>
          </p>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Favicon URL</label>
          <textarea
            value={draft.branding?.faviconUrl ?? ''}
            onChange={(e) => patch('branding.faviconUrl', e.target.value)}
            rows={2}
            placeholder="https://…/favicon.ico or data:image/png;base64,…"
            className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white font-mono"
          />
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Leave empty to use the default site icon. External URLs must allow the browser to load them (CORS does not apply to favicons).
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Branding is not auto-saved. Use <strong className="font-semibold text-slate-600 dark:text-slate-300">Save</strong> here or the full{' '}
            <strong className="font-semibold text-slate-600 dark:text-slate-300">Save customization</strong> button at the bottom of this page.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={save}
            className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold px-4 py-2.5 shadow-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 p-5 md:p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Palette className="w-5 h-5 text-indigo-500" />
          Maintenance
          <HelpTooltip
            title="Maintenance"
            text="Public users see a maintenance screen in the content area; you can still open Login → Dashboard. Save after changes."
          />
        </h3>
        <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Maintenance mode</span>
          <ToggleSwitch
            checked={!!draft.maintenance?.enabled}
            onChange={(on) => patch('maintenance.enabled', on)}
            ariaLabel="Maintenance mode"
          />
        </div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Message</label>
        <textarea
          value={draft.maintenance?.message || ''}
          onChange={(e) => patch('maintenance.message', e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
        />
      </section>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 p-5 md:p-6 shadow-sm space-y-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Public banners</h3>
        {(['warning', 'info', 'success']).map((kind) => (
          <div key={kind} className="border-t border-slate-100 dark:border-slate-800 pt-4 first:border-0 first:pt-0">
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="text-sm font-semibold capitalize text-slate-800 dark:text-slate-200">{kind}</span>
              <ToggleSwitch
                checked={!!draft.banners?.[kind]?.enabled}
                onChange={(on) => patchBanner(kind, 'enabled', on)}
                ariaLabel={`Banner ${kind}`}
              />
            </div>
            <textarea
              value={draft.banners?.[kind]?.text || ''}
              onChange={(e) => patchBanner(kind, 'text', e.target.value)}
              rows={2}
              placeholder="Banner text (optional if off)"
              className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
            />
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 p-5 md:p-6 shadow-sm space-y-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-500" />
          Visitor popups
          <HelpTooltip
            title="Modals"
            text="Terms (first visit), mobile notice (layar sempit), dan popup donasi QRIS (setelah N klik di situs publik, tidak di halaman Dashboard). Tersimpan di server; pengunjung perlu refresh untuk teks terbaru setelah Anda simpan."
          />
        </h3>

        <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            First-visit agreement
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Title</label>
              <input
                value={draft.modals?.terms?.title || ''}
                onChange={(e) => patch('modals.terms.title', e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Subtitle</label>
              <input
                value={draft.modals?.terms?.subtitle || ''}
                onChange={(e) => patch('modals.terms.subtitle', e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">
              Bullet list
            </label>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Press <kbd className="rounded border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 px-1">Enter</kbd> for a new line (one line = one bullet on the public page). For{' '}
              <strong className="text-slate-700 dark:text-slate-300">bold</strong>, wrap with{' '}
              <code className="rounded bg-slate-200/80 dark:bg-slate-700 px-1 text-[11px]">**like this**</code>.
            </p>
            <textarea
              value={(draft.modals?.terms?.bullets || []).join('\n')}
              onChange={(e) => {
                const raw = e.target.value.replace(/\r\n/g, '\n');
                const bullets = raw.split('\n').map((line) => line.trim().slice(0, 2000));
                patch('modals.terms.bullets', bullets);
              }}
              rows={8}
              className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white resize-y min-h-[10rem] font-mono text-[13px] leading-relaxed"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Amber note (inside card)</label>
            <textarea
              value={draft.modals?.terms?.footerNote || ''}
              onChange={(e) => patch('modals.terms.footerNote', e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Accept button label</label>
            <input
              value={draft.modals?.terms?.acceptLabel || ''}
              onChange={(e) => patch('modals.terms.acceptLabel', e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Mobile notice
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Shown at the bottom when width &lt; 768px; hidden on desktop.
              </p>
            </div>
            <ToggleSwitch
              checked={!!draft.modals?.desktopNotice?.enabled}
              onChange={(on) => patch('modals.desktopNotice.enabled', on)}
              ariaLabel="Enable mobile notice"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Title</label>
            <input
              value={draft.modals?.desktopNotice?.title || ''}
              onChange={(e) => patch('modals.desktopNotice.title', e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Body</label>
            <textarea
              value={draft.modals?.desktopNotice?.body || ''}
              onChange={(e) => patch('modals.desktopNotice.body', e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Button label</label>
            <input
              value={draft.modals?.desktopNotice?.dismissLabel || ''}
              onChange={(e) => patch('modals.desktopNotice.dismissLabel', e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-2">
              <Heart className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Popup donasi (QRIS)
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-xl">
                  Muncul sekali per kunjungan (tab) setelah pengunjung mengklik sebanyak ambang di bawah.
                  Tidak dihitung saat berada di halaman Login / Dashboard. Simpan agar pengaturan live di
                  situs publik.
                </p>
              </div>
            </div>
            <ToggleSwitch
              checked={!!draft.modals?.donationPopup?.enabled}
              onChange={(on) => patch('modals.donationPopup.enabled', on)}
              ariaLabel="Aktifkan popup donasi"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">
                Ambang jumlah klik
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={draft.modals?.donationPopup?.clickThreshold ?? 5}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  patch(
                    'modals.donationPopup.clickThreshold',
                    Number.isFinite(v) ? Math.min(100, Math.max(1, v)) : 5
                  );
                }}
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">
                URL gambar QR / QRIS
              </label>
              <input
                value={draft.modals?.donationPopup?.imageUrl ?? '/qris.jpeg'}
                onChange={(e) => patch('modals.donationPopup.imageUrl', e.target.value)}
                placeholder="/qris.jpeg"
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm font-mono text-slate-900 dark:text-white"
              />
              <p className="mt-1 text-[11px] text-slate-500">Default: file di <code className="rounded bg-slate-200/80 dark:bg-slate-700 px-1">public/qris.jpeg</code></p>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Judul</label>
            <input
              value={draft.modals?.donationPopup?.title || ''}
              onChange={(e) => patch('modals.donationPopup.title', e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Teks / pesan</label>
            <textarea
              value={draft.modals?.donationPopup?.body || ''}
              onChange={(e) => patch('modals.donationPopup.body', e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/40 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Tunda tombol tutup (hitung mundur)
              </span>
              <ToggleSwitch
                checked={!!draft.modals?.donationPopup?.closeDelayEnabled}
                onChange={(on) => patch('modals.donationPopup.closeDelayEnabled', on)}
                ariaLabel="Tunda tutup popup"
              />
            </div>
            {draft.modals?.donationPopup?.closeDelayEnabled !== false ? (
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase whitespace-nowrap">
                  Detik
                </label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={draft.modals?.donationPopup?.closeDelaySeconds ?? 5}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    patch(
                      'modals.donationPopup.closeDelaySeconds',
                      Number.isFinite(v) ? Math.min(120, Math.max(1, v)) : 5
                    );
                  }}
                  className="w-24 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
              </div>
            ) : null}
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Label tombol tutup</label>
            <input
              value={draft.modals?.donationPopup?.closeLabel || ''}
              onChange={(e) => patch('modals.donationPopup.closeLabel', e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/40 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  PayPal (teks &quot;OR&quot; + tombol)
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Tampil di bawah QR jika aktif dan URL valid (https).
                </p>
              </div>
              <ToggleSwitch
                checked={!!draft.modals?.donationPopup?.paypalEnabled}
                onChange={(on) => patch('modals.donationPopup.paypalEnabled', on)}
                ariaLabel="Aktifkan PayPal"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">URL PayPal</label>
              <input
                type="url"
                value={draft.modals?.donationPopup?.paypalUrl ?? ''}
                onChange={(e) => patch('modals.donationPopup.paypalUrl', e.target.value)}
                placeholder="https://paypal.me/username"
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm font-mono text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Label tombol PayPal</label>
              <input
                value={draft.modals?.donationPopup?.paypalLabel ?? ''}
                onChange={(e) => patch('modals.donationPopup.paypalLabel', e.target.value)}
                placeholder="Donasi via PayPal"
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setDonationPreviewOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-800 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/20"
          >
            <Eye className="w-4 h-4" />
            Pratinjau popup (draft)
          </button>
        </div>
      </section>

      <DonationPopupModal
        open={donationPreviewOpen}
        onClose={() => setDonationPreviewOpen(false)}
        title={donationPreviewMerged.title}
        body={donationPreviewMerged.body}
        imageUrl={donationPreviewMerged.imageUrl}
        closeDelayEnabled={donationPreviewMerged.closeDelayEnabled}
        closeDelaySeconds={donationPreviewMerged.closeDelaySeconds}
        closeLabel={donationPreviewMerged.closeLabel}
        paypalEnabled={donationPreviewMerged.paypalEnabled}
        paypalUrl={donationPreviewMerged.paypalUrl}
        paypalLabel={donationPreviewMerged.paypalLabel}
      />

      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 p-5 md:p-6 shadow-sm space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Home page copy</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Hero icon (Lucide)</label>
            <select
              value={draft.beranda?.heroIcon || 'Sparkles'}
              onChange={(e) => patch('beranda.heroIcon', e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
            >
              {BERANDA_ICON_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Top label (badge)</label>
            <input
              value={draft.beranda?.heroBadge || ''}
              onChange={(e) => patch('beranda.heroBadge', e.target.value)}
              placeholder="Empty = default: Crawler Scraptor"
              className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">Hero title</label>
          <input
            value={draft.beranda?.heroTitle || ''}
            onChange={(e) => patch('beranda.heroTitle', e.target.value)}
            placeholder="Empty = default copy"
            className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">Intro paragraph</label>
          <textarea
            value={draft.beranda?.heroSubtitle || ''}
            onChange={(e) => patch('beranda.heroSubtitle', e.target.value)}
            rows={4}
            placeholder="Empty = default copy"
            className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">Search card title</label>
          <input
            value={draft.beranda?.searchTitle || ''}
            onChange={(e) => patch('beranda.searchTitle', e.target.value)}
            placeholder="Empty = Search endpoints (all platforms)"
            className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
          />
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-bold text-slate-900 dark:text-white">Feature cards</h4>
            <HelpTooltip
              title="Cards"
              text="Add custom cards. “Replace” hides built-in cards when any custom card is enabled. “Append” adds yours below the built-ins."
            />
          </div>
          <div className="flex flex-wrap gap-3 items-center mb-3">
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="radio"
                name="cardMode"
                checked={draft.beranda?.cardMode !== 'replace'}
                onChange={() => patch('beranda.cardMode', 'append')}
              />
              Append below built-ins
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="radio"
                name="cardMode"
                checked={draft.beranda?.cardMode === 'replace'}
                onChange={() => patch('beranda.cardMode', 'replace')}
              />
              Replace all (only cards below)
            </label>
          </div>

          <div className="space-y-3">
            {cards.map((c, idx) => (
              <div
                key={c.id}
                className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2 bg-slate-50/50 dark:bg-slate-800/40"
              >
                <div className="flex items-center justify-between">
                  <ToggleSwitch
                    checked={!!c.enabled}
                    onChange={(on) => {
                      const next = structuredClone(cards);
                      next[idx] = { ...next[idx], enabled: on };
                      patch('beranda.featureCards', next);
                    }}
                    ariaLabel={`Enable card ${idx + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const next = cards.filter((_, i) => i !== idx);
                      patch('beranda.featureCards', next);
                    }}
                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-500/10"
                    aria-label="Remove card"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <select
                    value={c.icon}
                    onChange={(e) => {
                      const next = structuredClone(cards);
                      next[idx].icon = e.target.value;
                      patch('beranda.featureCards', next);
                    }}
                    className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs"
                  >
                    {BERANDA_ICON_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <select
                    value={c.iconColor}
                    onChange={(e) => {
                      const next = structuredClone(cards);
                      next[idx].iconColor = e.target.value;
                      patch('beranda.featureCards', next);
                    }}
                    className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs"
                  >
                    {FEATURE_CARD_COLORS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  value={c.title}
                  onChange={(e) => {
                    const next = structuredClone(cards);
                    next[idx].title = e.target.value;
                    patch('beranda.featureCards', next);
                  }}
                  placeholder="Card title"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm"
                />
                <textarea
                  value={c.body}
                  onChange={(e) => {
                    const next = structuredClone(cards);
                    next[idx].body = e.target.value;
                    patch('beranda.featureCards', next);
                  }}
                  placeholder="Body (plain text; HTML not rendered)"
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm"
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => patch('beranda.featureCards', [...cards, emptyCard()])}
            className="mt-3 inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 px-3 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Plus className="w-4 h-4" /> Add card
          </button>
        </div>
      </section>
        </div>
      </div>

      <div className="flex justify-end border-t border-slate-200/80 pt-2 dark:border-slate-700/80">
        <button
          type="button"
          disabled={busy}
          onClick={save}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-3 font-bold text-white shadow-md disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {busy ? 'Saving…' : 'Save customization'}
        </button>
      </div>
    </div>
  );
}
