import { Wrench } from 'lucide-react';

export default function MaintenanceOverlay({ message, onEnterAdmin }) {
  const text =
    message?.trim() ||
    'We are performing maintenance. Please try again later.';

  return (
    <div
      className="absolute inset-0 z-[60] flex flex-col items-center justify-center overflow-y-auto bg-[#0b1120]/98 px-6 py-12 text-center backdrop-blur-md dark:bg-slate-950/98"
      role="alert"
    >
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400">
        <Wrench className="h-8 w-8" />
      </div>
      <h1 className="text-xl font-black text-white sm:text-2xl">Maintenance</h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400 sm:text-base">{text}</p>
      {onEnterAdmin ? (
        <button
          type="button"
          onClick={onEnterAdmin}
          className="mt-8 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-500"
        >
          Sign in
        </button>
      ) : null}
    </div>
  );
}
