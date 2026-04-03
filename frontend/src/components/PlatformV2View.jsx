import { useState, useEffect, useMemo } from 'react';
import { Send, DatabaseBackup, ChevronDown, AlertCircle, FileJson, FileText } from 'lucide-react';
import { fetchApi } from '../utils/apiFetch';
import { redactScrapeResponse } from '../utils/redactScrapeResponse';
import { jsonToExportCsv } from '../utils/jsonToExportCsv';
import ToggleSwitch from './ToggleSwitch';
import HelpTooltip from './HelpTooltip';

function isBooleanParam(p) {
  if (p.kind === 'boolean') return true;
  if (p.type !== 'select' || !p.options || p.options.length !== 2) {
    return false;
  }
  const a = String(p.options[0]).toLowerCase();
  const b = String(p.options[1]).toLowerCase();
  return a !== b && ((a === 'true' && b === 'false') || (a === 'false' && b === 'true'));
}

function buildQuery(parameters, formData) {
  const q = {};
  for (const p of parameters) {
    const raw = formData[p.name];
    if (raw === undefined || raw === '') continue;

    if (p.type === 'number') {
      const n = Number(raw);
      if (!Number.isNaN(n)) q[p.name] = n;
      continue;
    }

    if (isBooleanParam(p)) {
      q[p.name] = String(raw).toLowerCase() === 'true';
      continue;
    }

    q[p.name] = raw;
  }
  return q;
}

export default function PlatformV2View({ platformInfo, activeSubTab, setActiveSubTab }) {
  const [formData, setFormData] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const activeEndpoint = useMemo(
    () =>
      platformInfo.endpoints.find((e) => e.id === activeSubTab) ||
      platformInfo.endpoints[0],
    [platformInfo, activeSubTab]
  );

  const safeResult = useMemo(
    () => (result ? redactScrapeResponse(result) : null),
    [result]
  );

  useEffect(() => {
    const init = {};
    for (const p of activeEndpoint.parameters || []) {
      if (isBooleanParam(p)) {
        init[p.name] =
          p.default !== undefined && p.default !== ''
            ? p.default
            : 'false';
      } else if (p.default !== undefined && p.default !== '') {
        init[p.name] = p.default;
      }
    }
    setFormData(init);
    setResult(null);
    setError(null);
  }, [activeEndpoint.id]); // eslint-disable-line react-hooks/exhaustive-deps -- params come from catalog per id

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleScrape = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const query = buildQuery(activeEndpoint.parameters || [], formData);

    try {
      const { ok, status, data } = await fetchApi('/api/scrape-creators/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: activeEndpoint.path, query }),
      });

      if (!ok) {
        const msg = data.error || data.message || `Request failed (${status})`;
        let detail = '';
        try {
          detail = `\n\nDebug (full body):\n${JSON.stringify(data, null, 2)}`;
        } catch {
          detail = '';
        }
        setError(`${msg}${detail}`.slice(0, 12000));
        setResult(data.data || data.details ? data : null);
        return;
      }

      setResult(data);
    } catch (err) {
      setError(err.message || 'Could not reach backend');
    } finally {
      setLoading(false);
    }
  };

  const downloadBlob = (content, fileName, mime) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportFileBase = `${platformInfo.id}_${activeEndpoint.id}`;

  return (
    <div className="flex min-h-0 min-w-0 flex-col">
      <nav
        className="mb-6 border-b border-slate-200/90 dark:border-slate-700/70"
        aria-label="Pilih endpoint"
      >
        <div
          className="-mx-1 flex gap-0.5 overflow-x-auto px-1 [-ms-overflow-style:auto] [scrollbar-width:thin]"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {platformInfo.endpoints.map((ep) => {
            const on = activeEndpoint.id === ep.id;
            return (
            <button
              key={ep.id}
              type="button"
              onClick={() => {
                setActiveSubTab(ep.id);
              }}
              className={`shrink-0 border-b-2 px-3 py-2.5 text-left text-xs transition-colors sm:px-4 sm:text-sm ${
                on
                  ? '-mb-px border-indigo-500 font-semibold text-indigo-600 dark:border-violet-400 dark:text-violet-300'
                  : 'border-transparent font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {ep.name}
            </button>
            );
          })}
        </div>
      </nav>

      <div className="mb-6 rounded-2xl bg-slate-50/80 p-5 dark:bg-slate-800/35 md:p-6">
        <div className="flex flex-wrap items-start gap-2 mb-2">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">
            {activeEndpoint.name}
          </h3>
          {activeEndpoint.description ? (
            <HelpTooltip title="Endpoint" text={activeEndpoint.description} />
          ) : null}
        </div>
        <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mb-6 break-all">
          {activeEndpoint.method} {activeEndpoint.path}
        </p>

        <form onSubmit={handleScrape} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-5">
            {(activeEndpoint.parameters || []).map((param) => (
              <div key={param.name} className="min-w-0">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  <span className="truncate">{param.label}</span>
                  {param.required && <span className="text-red-500 shrink-0">*</span>}
                  {param.description ? (
                    <HelpTooltip title={param.label} text={param.description} />
                  ) : null}
                </label>
                {isBooleanParam(param) ? (
                  <div className="flex items-center gap-3 h-10">
                    <ToggleSwitch
                      checked={String(formData[param.name]).toLowerCase() === 'true'}
                      onChange={(on) =>
                        setFormData({
                          ...formData,
                          [param.name]: on ? 'true' : 'false',
                        })
                      }
                      ariaLabel={param.label}
                    />
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      {String(formData[param.name]).toLowerCase() === 'true' ? 'On' : 'Off'}
                    </span>
                  </div>
                ) : param.type === 'select' ? (
                  <div className="relative">
                    <select
                      name={param.name}
                      required={param.required}
                      value={formData[param.name] ?? ''}
                      onChange={handleInputChange}
                      className="w-full appearance-none bg-white dark:bg-[#0b1120] border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all font-medium text-sm"
                    >
                      <option value="">Select...</option>
                      {param.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-4 top-3.5 text-slate-400 pointer-events-none" />
                  </div>
                ) : (
                  <input
                    type={param.type}
                    name={param.name}
                    value={formData[param.name] ?? ''}
                    placeholder={param.placeholder}
                    required={param.required}
                    onChange={handleInputChange}
                    className="w-full bg-white dark:bg-[#0b1120] border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all font-medium text-sm"
                  />
                )}
              </div>
            ))}
          </div>

          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-300 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-bold">Request error</p>
                <pre className="mt-1 opacity-90 text-xs font-mono whitespace-pre-wrap break-words max-h-64 overflow-y-auto custom-scrollbar">
                  {error}
                </pre>
              </div>
            </div>
          )}

          <div className="flex justify-end mt-2">
            <button
              type="submit"
              disabled={loading}
              className={`px-6 py-3 rounded-xl font-bold text-white flex items-center gap-2 shadow-lg transition-all text-sm ${
                loading
                  ? 'opacity-70 bg-indigo-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              {loading ? (
                'Calling API...'
              ) : (
                <>
                  Execute Scrape <Send className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {safeResult && (
        <div className="mt-2 bg-[#0b1120] rounded-2xl overflow-hidden border border-slate-800 shadow-inner flex flex-col min-h-0 max-h-[min(24rem,40vh)]">
          <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900 shrink-0">
            <div className="flex items-center gap-2">
              <DatabaseBackup className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-mono text-indigo-300 font-bold uppercase tracking-widest">
                Response
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  downloadBlob(
                    JSON.stringify(safeResult, null, 2),
                    `${exportFileBase}.json`,
                    'application/json'
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 border border-slate-600"
              >
                <FileJson className="w-3.5 h-3.5 text-indigo-400" />
                Export JSON
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadBlob(
                    jsonToExportCsv(safeResult),
                    `${exportFileBase}.csv`,
                    'text/csv;charset=utf-8;'
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 border border-slate-600"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                Export CSV
              </button>
            </div>
          </div>
          <div className="p-4 overflow-auto custom-scrollbar flex-1">
            <pre className="text-xs md:text-sm font-mono text-emerald-400">
              {JSON.stringify(safeResult, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
