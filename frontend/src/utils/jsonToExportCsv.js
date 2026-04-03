function isPlainObject(x) {
  return x !== null && typeof x === 'object' && !Array.isArray(x);
}

function pickTabularRows(data) {
  if (!data || typeof data !== 'object') return null;
  if (Array.isArray(data)) {
    return data.length > 0 && data.every(isPlainObject) ? data : null;
  }
  for (const v of Object.values(data)) {
    if (Array.isArray(v) && v.length > 0 && v.every(isPlainObject)) return v;
  }
  return null;
}

function escapeCell(val) {
  if (val === null || val === undefined) return '""';
  const s = typeof val === 'object' ? JSON.stringify(val) : String(val);
  return `"${s.replace(/"/g, '""')}"`;
}

/**
 * Utamakan baris-tabular jika ada array of objects; kalau tidak, key / value tingkat atas.
 */
export function jsonToExportCsv(data) {
  const rows = pickTabularRows(data);
  if (rows) {
    const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))];
    const lines = [keys.map(escapeCell).join(',')];
    for (const row of rows) {
      lines.push(keys.map((k) => escapeCell(row[k])).join(','));
    }
    return lines.join('\n');
  }
  if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
    const lines = [['key', 'value'].map(escapeCell).join(',')];
    for (const [k, v] of Object.entries(data)) {
      lines.push([escapeCell(k), escapeCell(v)].join(','));
    }
    return lines.join('\n');
  }
  return escapeCell(JSON.stringify(data));
}
