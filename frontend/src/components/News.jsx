import { useState, useEffect } from 'react';
import axios from 'axios';
import { FileJson, FileText, Image as ImageIcon } from 'lucide-react';
import { API_BASE } from '../config/apiBase';
import { axiosErrorMessage } from '../utils/axiosErrorMessage';
import { jsonToExportCsv } from '../utils/jsonToExportCsv';

export default function News() {
  const [categories, setCategories] = useState(null);
  const [categoriesErr, setCategoriesErr] = useState(null);
  const [categoryUrl, setCategoryUrl] = useState('');
  const [limit, setLimit] = useState(8);
  const [loading, setLoading] = useState(false);
  const [articles, setArticles] = useState(null);
  const [scrapeMeta, setScrapeMeta] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/news/categories`);
        if (!cancelled && res.data?.categories) {
          setCategories(res.data.categories);
          setCategoriesErr(null);
        }
      } catch (e) {
        if (!cancelled) {
          setCategories(null);
          setCategoriesErr(axiosErrorMessage(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleScrape = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setArticles(null);
    setScrapeMeta(null);

    try {
      const res = await axios.post(
        `${API_BASE}/api/news/scrape`,
        {
          category_url: categoryUrl.trim(),
          limit: parseInt(String(limit), 10) || 8,
        },
        { timeout: 180000 }
      );
      const body = res.data;
      if (body?.status === 'ok' && Array.isArray(body.data)) {
        setArticles(body.data);
        setScrapeMeta(
          body.meta ?? {
            _note:
              'This response had no `meta` object (older backend?). For empty lists you still need server debug: link counts, extractFailures.',
            responseKeys: body && typeof body === 'object' ? Object.keys(body) : [],
          }
        );
      } else if (body?.status === 'ok' && body.data == null) {
        setArticles([]);
        setScrapeMeta({
          _note: 'Server said ok but `data` was missing; treating as empty list.',
          raw: body,
        });
      } else {
        const dbg = body?.debug != null ? ` ${JSON.stringify(body.debug)}` : '';
        const preview =
          body && typeof body === 'object'
            ? `\n\nRaw response:\n${JSON.stringify(body, null, 2).slice(0, 6000)}`
            : '';
        setError(`${body?.message || body?.error || 'Unrecognized response'}${dbg}${preview}`);
      }
    } catch (err) {
      const d = err.response?.data;
      const dbg = d?.debug != null ? `\n\nDebug: ${JSON.stringify(d.debug, null, 2)}` : '';
      setError(`${axiosErrorMessage(err)}${dbg}`);
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = (content, fileName, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
  };

  const exportJSON = () => {
    if (!articles?.length) return;
    downloadFile(JSON.stringify(articles, null, 2), 'news_articles.json', 'application/json');
  };

  const exportCSV = () => {
    if (!articles?.length) return;
    downloadFile(jsonToExportCsv(articles), 'news_articles.csv', 'text/csv;charset=utf-8;');
  };

  return (
    <div>
      <form onSubmit={handleScrape} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="md:col-span-3">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Portal & category
          </label>
          <select
            required
            value={categoryUrl}
            onChange={(e) => setCategoryUrl(e.target.value)}
            disabled={!categories}
            className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm transition-colors disabled:opacity-60"
          >
            <option value="">
              {categories ? 'Select portal and section…' : categoriesErr ? 'Failed to load list' : 'Loading portals…'}
            </option>
            {categories &&
              Object.entries(categories).map(([portal, sections]) => (
                <optgroup key={portal} label={portal}>
                  {Object.entries(sections).map(([label, catUrl]) => (
                    <option key={`${portal}-${label}`} value={catUrl}>
                      {label}
                    </option>
                  ))}
                </optgroup>
              ))}
          </select>
          {categoriesErr ? (
            <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{categoriesErr}</p>
          ) : (
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              Fixed list matches server (Kompas, Detik, CNN Indonesia, Liputan6).
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Max articles
          </label>
          <input
            type="number"
            min="1"
            max="30"
            className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm transition-colors"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
          />
        </div>
        <div className="md:col-span-4 mt-2 mb-4">
          <button
            type="submit"
            disabled={loading}
            className={`px-8 py-3.5 rounded-xl text-white font-bold shadow-sm transition-all focus:ring-4 focus:ring-purple-300 dark:focus:ring-purple-800 ${
              loading
                ? 'bg-purple-400 dark:bg-purple-600 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 active:scale-[0.98]'
            }`}
          >
            {loading ? '⏳ Fetching articles…' : '🚀 Extract article list'}
          </button>
        </div>
      </form>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 rounded-xl mb-6 border border-red-200 dark:border-red-500/20 backdrop-blur-sm">
          <strong>Error:</strong>
          <pre className="mt-2 text-xs whitespace-pre-wrap font-mono max-h-64 overflow-y-auto custom-scrollbar opacity-95">
            {error}
          </pre>
        </div>
      )}

      {articles !== null && articles.length === 0 && (
        <div className="p-4 bg-amber-50 dark:bg-amber-500/10 text-amber-900 dark:text-amber-200 rounded-xl mb-6 border border-amber-200 dark:border-amber-500/25">
          <strong className="font-bold">No articles returned (0 results)</strong>
          <p className="mt-2 text-sm opacity-90">
            {scrapeMeta?.hint ||
              'The request finished but there is nothing to show. Check debug JSON below — link pattern may not match this portal, or every extraction failed.'}
          </p>
          {scrapeMeta ? (
            <pre className="mt-3 p-3 rounded-lg bg-white/80 dark:bg-slate-900/80 text-xs font-mono overflow-x-auto max-h-80 overflow-y-auto custom-scrollbar border border-amber-200/50 dark:border-slate-600">
              {JSON.stringify(scrapeMeta, null, 2)}
            </pre>
          ) : null}
        </div>
      )}

      {articles && articles.length > 0 && scrapeMeta?.extractFailures?.length ? (
        <div className="p-4 mb-6 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Partial failures ({scrapeMeta.extractFailures.length} extraction error(s) — debugging)
          </p>
          <pre className="mt-2 text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto custom-scrollbar text-slate-600 dark:text-slate-400">
            {JSON.stringify(scrapeMeta.extractFailures, null, 2)}
          </pre>
        </div>
      ) : null}

      {articles && articles.length > 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
          <div className="bg-purple-50 dark:bg-purple-500/10 text-purple-800 dark:text-purple-300 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-center border border-purple-200 dark:border-purple-500/20 shadow-sm gap-4">
            <span className="text-lg font-medium">
              Extracted <strong>{articles.length}</strong> article(s)
            </span>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={exportCSV}
                className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 px-4 py-2.5 rounded-xl font-medium transition shadow-sm"
              >
                <FileText className="w-5 h-5 text-emerald-500 dark:text-emerald-400" /> Export CSV
              </button>
              <button
                type="button"
                onClick={exportJSON}
                className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 px-4 py-2.5 rounded-xl font-medium transition shadow-sm"
              >
                <FileJson className="w-5 h-5 text-indigo-500 dark:text-indigo-400" /> Export JSON
              </button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {articles.map((item, idx) => (
              <article
                key={item.url || idx}
                className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm flex flex-col md:flex-row transition-colors"
              >
                <div className="md:w-36 bg-slate-100 dark:bg-slate-800 flex items-center justify-center p-3 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700 shrink-0">
                  {item.top_image ? (
                    <img
                      src={item.top_image}
                      alt=""
                      className="w-full h-24 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                    />
                  ) : (
                    <div className="text-slate-400 flex flex-col items-center gap-1 py-4">
                      <ImageIcon className="w-10 h-10" />
                      <span className="text-xs">No image</span>
                    </div>
                  )}
                </div>
                <div className="p-5 flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-snug mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3 mb-3">
                    {item.summary || item.text || ''}
                  </p>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    Open article ↗
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
