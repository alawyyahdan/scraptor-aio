import { Fragment } from 'react';

const STRONG_DEFAULT = 'font-semibold text-slate-900 dark:text-white';

/**
 * Render teks biasa + potongan **tebal** (tanpa HTML mentah).
 * @param {string} strongClassName - opsional, mis. di kotak amber
 */
export function renderInlineBold(text, strongClassName = STRONG_DEFAULT) {
  if (text == null || text === '') return text;
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const m = part.match(/^\*\*(.+)\*\*$/);
    if (m) {
      return (
        <strong key={i} className={strongClassName}>
          {m[1]}
        </strong>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}
