import { useState } from 'react';
import { Lock, User, LogIn, AlertCircle } from 'lucide-react';
import { fetchApi } from '../utils/apiFetch';

export default function Login({ setAuthToken, variant = 'fullscreen' }) {
  const embedded = variant === 'embedded';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { ok, data } = await fetchApi('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (ok) {
        localStorage.setItem('scraptor_auth_token', data.token);
        setAuthToken(data.token);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (e) {
      setError(e.message || 'Could not connect to backend server');
    } finally {
      setLoading(false);
    }
  };

  const shellClass = embedded
    ? 'w-full max-w-lg mx-auto py-4'
    : 'min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-[#0b1120] px-4 transition-colors duration-500';

  return (
    <div className={shellClass}>
      <div
        className={
          embedded
            ? 'w-full bg-white dark:bg-[#1e293b] p-8 rounded-[2rem] shadow-lg ring-1 ring-slate-200 dark:ring-slate-800'
            : 'max-w-md w-full bg-white dark:bg-[#1e293b] p-8 rounded-[2rem] shadow-xl ring-1 ring-slate-200 dark:ring-slate-800'
        }
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30 mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
            Ordal Access
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            Access is reserved for elite members only.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-300 font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-all"
                placeholder="Username"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-all"
                placeholder="Password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3.5 px-4 rounded-2xl shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? (
              'Authenticating...'
            ) : (
              <>
                Sign in <LogIn className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
