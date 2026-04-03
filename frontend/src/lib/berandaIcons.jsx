/* eslint-disable react-refresh/only-export-components -- shared icon map + small helpers */
import {
  Sparkles,
  Layers,
  Shield,
  Zap,
  Globe2,
  Database,
  Cpu,
  Heart,
  Star,
  Info,
  LayoutDashboard,
  Search,
  Wrench,
  Megaphone,
  Lock,
  Rocket,
} from 'lucide-react';

/** Nama → komponen ikon (untuk Beranda & kartu fitur kustom) */
export const BERANDA_ICON_MAP = {
  Sparkles,
  Layers,
  Shield,
  Zap,
  Globe2,
  Database,
  Cpu,
  Heart,
  Star,
  Info,
  LayoutDashboard,
  Search,
  Wrench,
  Megaphone,
  Lock,
  Rocket,
};

export const BERANDA_ICON_OPTIONS = Object.keys(BERANDA_ICON_MAP).sort();

export function BerandaIcon({ name, className }) {
  const Cmp = BERANDA_ICON_MAP[name] || Sparkles;
  return <Cmp className={className} />;
}

const COLOR_CLASS = {
  fuchsia: 'text-fuchsia-500',
  amber: 'text-amber-500',
  emerald: 'text-emerald-500',
  sky: 'text-sky-500',
  violet: 'text-violet-500',
  rose: 'text-rose-500',
  indigo: 'text-indigo-500',
};

export function featureCardIconClass(color) {
  return COLOR_CLASS[color] || COLOR_CLASS.fuchsia;
}

export const FEATURE_CARD_COLORS = Object.keys(COLOR_CLASS);
