/**
 * Slider on/off — aksesibel, cocok untuk boolean & fitur.
 */
export default function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  id,
  ariaLabel,
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`
        relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ease-out
        focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2
        dark:focus-visible:ring-offset-slate-900
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${checked
          ? 'bg-gradient-to-r from-indigo-500 to-purple-600 shadow-inner shadow-indigo-900/30'
          : 'bg-slate-200 dark:bg-slate-600'}
      `}
    >
      <span
        className={`
          absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-200 ease-out
          ${checked ? 'translate-x-5' : 'translate-x-0'}
        `}
      />
    </button>
  );
}
