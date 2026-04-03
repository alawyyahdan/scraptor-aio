import { useState } from 'react';
import axios from 'axios';
import { FileJson, FileText, Briefcase, MapPin } from 'lucide-react';
import { API_BASE } from '../config/apiBase';
import { axiosErrorMessage } from '../utils/axiosErrorMessage';

export default function LinkedIn() {
    const [searchQuery, setSearchQuery] = useState('data scientist');
    const [location, setLocation] = useState('Indonesia');
    const [pages, setPages] = useState(2);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);

    const handleScrape = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setResults(null);

        try {
            const res = await axios.post(`${API_BASE}/api/linkedin/scrape`, {
                search_query: searchQuery,
                location: location,
                max_pages: parseInt(pages)
            });
            setResults(res.data);
        } catch (err) {
            setError(axiosErrorMessage(err));
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
        if (!results || !results.data) return;
        downloadFile(JSON.stringify(results.data, null, 2), `linkedin_jobs_${searchQuery.replace(' ', '_')}.json`, "application/json");
    };

    const exportCSV = () => {
        if (!results || !results.data || !results.data.length) return;
        const keys = Object.keys(results.data[0]);
        const header = keys.join(",");
        const rows = results.data.map(row => {
            return keys.map(k => `"${String(row[k] || '').replace(/"/g, '""')}"`).join(",");
        }).join("\n");
        
        downloadFile(header + "\n" + rows, `linkedin_jobs_${searchQuery.replace(' ', '_')}.csv`, "text/csv;charset=utf-8;");
    };

    return (
        <div>
            <form onSubmit={handleScrape} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Job keywords</label>
                    <input 
                        type="text" 
                        required
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm transition-colors"
                        placeholder="data scientist"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Location</label>
                    <input 
                        type="text" 
                        required
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm transition-colors"
                        placeholder="Indonesia"
                        value={location}
                        onChange={e => setLocation(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Max pages</label>
                    <input 
                        type="number" 
                        min="1" max="10"
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm transition-colors"
                        value={pages}
                        onChange={e => setPages(e.target.value)}
                    />
                </div>
                <div className="md:col-span-4 mt-2 mb-4">
                    <button 
                        type="submit" 
                        disabled={loading}
                        className={`px-8 py-3.5 rounded-xl text-white font-bold shadow-sm transition-all focus:ring-4 focus:ring-indigo-300 dark:focus:ring-indigo-800 ${loading ? 'bg-indigo-400 dark:bg-indigo-600 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 active:scale-[0.98]'}`}
                    >
                        {loading ? '⏳ Scraping LinkedIn…' : '🚀 Scrape job listings'}
                    </button>
                </div>
            </form>

            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 rounded-xl mb-6 border border-red-200 dark:border-red-500/20 backdrop-blur-sm">
                    <strong>Error:</strong>
                    <pre className="mt-2 text-xs font-mono whitespace-pre-wrap max-h-64 overflow-y-auto custom-scrollbar">{error}</pre>
                </div>
            )}

            {results && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-800 dark:text-indigo-300 p-5 rounded-2xl mb-8 flex flex-col sm:flex-row justify-between items-center border border-indigo-200 dark:border-indigo-500/20 shadow-sm gap-4">
                        <span className="text-lg">Found <strong>{results.total_jobs}</strong> jobs across {results.pages_scraped} page(s).</span>
                        <div className="flex gap-3">
                            <button onClick={exportCSV} className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 px-4 py-2.5 rounded-xl font-medium transition shadow-sm">
                                <FileText className="w-5 h-5 text-emerald-500 dark:text-emerald-400" /> Export CSV
                            </button>
                            <button onClick={exportJSON} className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 px-4 py-2.5 rounded-xl font-medium transition shadow-sm">
                                <FileJson className="w-5 h-5 text-indigo-500 dark:text-indigo-400" /> Export JSON
                            </button>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden flex flex-col transition-colors">
                        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 dark:text-slate-200">Job listings</h3>
                            <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-3 py-1.5 rounded-full font-medium">Scroll for more ▼</span>
                        </div>
                        <div className="overflow-auto max-h-[60vh] relative custom-scrollbar">
                            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                <thead className="bg-slate-50/90 dark:bg-slate-800/90 backdrop-blur-md sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-12 text-center">No</th>
                                        <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-1/4">Company & location</th>
                                        <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-1/4">Job title & link</th>
                                        <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Description</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-transparent divide-y divide-slate-100 dark:divide-slate-800/50">
                                    {results.data.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-4 py-5 text-sm text-slate-500 dark:text-slate-400 align-top font-mono text-center">
                                                {idx + 1}
                                            </td>
                                            <td className="px-6 py-5 text-sm text-slate-900 dark:text-slate-100 align-top">
                                                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2"><Briefcase className="w-4 h-4 text-slate-400 dark:text-slate-500"/> {item.Company}</div>
                                                <div className="text-slate-500 dark:text-slate-400 text-xs mt-3 flex items-center gap-2"><MapPin className="w-4 h-4 text-red-500 dark:text-red-400"/> {item.Location}</div>
                                            </td>
                                            <td className="px-6 py-5 text-sm align-top leading-relaxed break-words">
                                                <span className="text-indigo-700 dark:text-indigo-400 font-bold text-lg">{item.Title}</span>
                                                <div className="mt-3">
                                                    <a href={item.URL?.includes('http') ? item.URL : `https://www.linkedin.com${item.URL}`} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold flex items-center gap-1.5 transition-colors">
                                                        Open posting ↗
                                                    </a>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-sm text-slate-700 dark:text-slate-300 align-top leading-relaxed break-words relative">
                                                 <div className="line-clamp-4 italic opacity-90">{item.Description || '-'}</div>
                                            </td>
                                        </tr>
                                    ))}
                                    {results.data.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                                                No jobs found. Try different keywords.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
