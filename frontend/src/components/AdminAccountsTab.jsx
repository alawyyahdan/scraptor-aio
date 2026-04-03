import { useState, useEffect, useCallback } from 'react';
import { UserPlus, Save, Trash2, Shield, KeyRound } from 'lucide-react';
import { fetchJson } from '../utils/apiFetch';
import HelpTooltip from './HelpTooltip';

export default function AdminAccountsTab({
  authToken,
  setAuthToken,
  setSettingsErr,
  showToast,
}) {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [self, setSelf] = useState('');

  const [addUser, setAddUser] = useState('');
  const [addPass, setAddPass] = useState('');
  const [addBusy, setAddBusy] = useState(false);

  const [oldPw, setOldPw] = useState('');
  const [newUser, setNewUser] = useState('');
  const [newPw, setNewPw] = useState('');
  const [selfBusy, setSelfBusy] = useState(false);

  const [delBusy, setDelBusy] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setSettingsErr(null);
    try {
      const data = await fetchJson('/api/admin/accounts', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setSelf(data.self || '');
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (e) {
      setSettingsErr(e.message || 'Gagal memuat admin.');
    } finally {
      setLoading(false);
    }
  }, [authToken, setSettingsErr]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setAddBusy(true);
    setSettingsErr(null);
    try {
      await fetchJson('/api/admin/accounts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: addUser.trim(),
          password: addPass,
        }),
      });
      setAddUser('');
      setAddPass('');
      showToast?.('Admin ditambahkan.');
      await load();
    } catch (err) {
      setSettingsErr(err.message || 'Gagal menambah admin.');
    } finally {
      setAddBusy(false);
    }
  };

  const handleSelfSave = async (e) => {
    e.preventDefault();
    setSelfBusy(true);
    setSettingsErr(null);
    try {
      const data = await fetchJson('/api/admin/account', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          oldPassword: oldPw,
          newUsername: newUser.trim() || undefined,
          newPassword: newPw || undefined,
        }),
      });
      if (data.token) {
        localStorage.setItem('scraptor_auth_token', data.token);
        setAuthToken?.(data.token);
      }
      if (data.username) setSelf(data.username);
      setOldPw('');
      setNewUser('');
      setNewPw('');
      showToast?.('Akun diperbarui.');
      setUsers(Array.isArray(data.users) ? data.users : []);
      await load();
    } catch (err) {
      setSettingsErr(err.message || 'Gagal menyimpan.');
    } finally {
      setSelfBusy(false);
    }
  };

  const handleDelete = async (username) => {
    if (!window.confirm(`Hapus admin "${username}"?`)) return;
    setDelBusy(username);
    setSettingsErr(null);
    try {
      await fetchJson(
        `/api/admin/accounts/${encodeURIComponent(username)}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      showToast?.('Admin dihapus.');
      await load();
    } catch (err) {
      setSettingsErr(err.message || 'Gagal menghapus.');
    } finally {
      setDelBusy(null);
    }
  };

  if (loading) {
    return (
      <p className="text-slate-500 dark:text-slate-400 py-8 text-center animate-pulse">
        Loading admins…
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 p-5 md:p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
          <KeyRound className="w-5 h-5 text-indigo-500" />
          Akun Anda (username &amp; password)
          <HelpTooltip
            title="Ubah akun"
            text="Password saat ini wajib untuk menyimpan perubahan. Isi username baru dan/atau password baru (minimal 8 karakter). Jika ganti username, sesi diperbarui otomatis."
          />
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Login sebagai:{' '}
          <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
            {self || '—'}
          </span>
        </p>
        <form onSubmit={handleSelfSave} className="space-y-3 max-w-lg">
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
              Password saat ini *
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={oldPw}
              onChange={(e) => setOldPw(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/80 px-4 py-2.5 text-sm text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
              Username baru (opsional)
            </label>
            <input
              type="text"
              autoComplete="username"
              placeholder="kosongkan jika tidak diubah"
              value={newUser}
              onChange={(e) => setNewUser(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/80 px-4 py-2.5 text-sm text-slate-900 dark:text-white font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
              Password baru (opsional)
            </label>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="minimal 8 karakter"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/80 px-4 py-2.5 text-sm text-slate-900 dark:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={selfBusy}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-4 py-2.5 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {selfBusy ? 'Menyimpan…' : 'Simpan perubahan akun'}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 p-5 md:p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
          <UserPlus className="w-5 h-5 text-emerald-500" />
          Tambah admin
        </h3>
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row flex-wrap gap-3 max-w-3xl items-end">
          <div className="flex-1 min-w-[10rem]">
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
              Username
            </label>
            <input
              type="text"
              required
              autoComplete="off"
              value={addUser}
              onChange={(e) => setAddUser(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/80 px-4 py-2.5 text-sm text-slate-900 dark:text-white font-mono"
            />
          </div>
          <div className="flex-1 min-w-[10rem]">
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
              Password awal
            </label>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={addPass}
              onChange={(e) => setAddPass(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/80 px-4 py-2.5 text-sm text-slate-900 dark:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={addBusy}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold px-4 py-2.5 disabled:opacity-50 h-[42px]"
          >
            <UserPlus className="w-4 h-4" />
            {addBusy ? '…' : 'Tambah'}
          </button>
        </form>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
          3–32 karakter: huruf kecil, angka, <code className="font-mono">._-</code> (akan dinormalisasi ke huruf
          kecil).
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 p-5 md:p-6 shadow-sm overflow-x-auto">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-slate-500" />
          Daftar admin ({users.length})
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
              <th className="pb-2 pr-4">Username</th>
              <th className="pb-2 pr-4">Dibuat</th>
              <th className="pb-2 w-24" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {users.map((row) => (
              <tr key={row.username} className="text-slate-700 dark:text-slate-300">
                <td className="py-2.5 font-mono font-semibold">
                  {row.username}
                  {row.username === self ? (
                    <span className="ml-2 text-xs font-sans font-normal text-indigo-600 dark:text-indigo-400">
                      (Anda)
                    </span>
                  ) : null}
                </td>
                <td className="py-2.5 text-xs text-slate-500">
                  {row.createdAt
                    ? new Date(row.createdAt).toLocaleString()
                    : '—'}
                </td>
                <td className="py-2.5">
                  {row.username !== self ? (
                    <button
                      type="button"
                      disabled={delBusy === row.username}
                      onClick={() => handleDelete(row.username)}
                      className="inline-flex items-center gap-1 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 px-2 py-1 text-xs font-bold disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Hapus
                    </button>
                  ) : (
                    <span className="text-slate-400 text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 ? (
          <p className="text-amber-600 dark:text-amber-400 text-sm mt-4">
            Belum ada admin di file. Set <code className="font-mono">ADMIN_USER</code> dan{' '}
            <code className="font-mono">ADMIN_PASS</code> di .env lalu restart backend untuk seed pertama.
          </p>
        ) : null}
      </section>
    </div>
  );
}
