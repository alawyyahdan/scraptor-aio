/**
 * Pull a useful string from an axios error for UI / debugging (includes JSON body when present).
 */
export function axiosErrorMessage(err) {
  if (!err) return 'Unknown error';
  const res = err.response;
  if (!res) return err.message || 'Network error (no response)';
  const d = res.data;
  if (typeof d === 'string' && d.trim()) return d.trim().slice(0, 2000);
  if (d && typeof d === 'object') {
    const m = d.message ?? d.error;
    if (m != null && String(m).trim()) return String(m).trim();
    try {
      return `${res.status} ${res.statusText || ''}: ${JSON.stringify(d)}`.trim();
    } catch {
      return err.message || `HTTP ${res.status}`;
    }
  }
  return err.message || `HTTP ${res.status}`;
}
