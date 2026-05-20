import type { ReactNode } from 'react';
import {
  Calendar,
  Camera,
  Crown,
  Eye,
  ShieldCheck,
  Trophy,
  UserCheck,
  Users,
} from 'lucide-react';
import TeamLogo from './TeamLogo';
import type { TeamRole } from '../types';

interface TeamHeroProps {
  name: string;
  logoUrl?: string;
  description?: string;
  planLabel?: string;
  isPro?: boolean;
  readOnly?: boolean;
  /**
   * Caller's role on this team — renders a colored chip in the hero header.
   * `null`/`undefined` hides the chip.
   */
  myRole?: TeamRole | null;
  playerCount?: number;
  gameCount?: number;
  photoCount?: number;
  championshipCount?: number;
  /**
   * Render slot in the upper-right corner of the hero (e.g. a logo uploader,
   * action buttons). Sits over the gradient background.
   */
  logoOverlay?: ReactNode;
  /**
   * Replaces the default <TeamLogo /> rendering with a custom node — useful
   * when you need the inline upload affordance.
   */
  logoSlot?: ReactNode;
}

interface KPI {
  icon: ReactNode;
  value: number;
  label: string;
}

const PitchBackdrop = () => (
  <svg
    aria-hidden="true"
    className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.08]"
    viewBox="0 0 800 320"
    preserveAspectRatio="xMidYMid slice"
  >
    <defs>
      <pattern
        id="pitch-stripes"
        width="80"
        height="320"
        patternUnits="userSpaceOnUse"
      >
        <rect x="0" y="0" width="80" height="320" fill="transparent" />
        <rect x="0" y="0" width="40" height="320" fill="rgba(255,255,255,0.04)" />
      </pattern>
    </defs>
    <rect x="0" y="0" width="800" height="320" fill="url(#pitch-stripes)" />
    {/* Center line */}
    <line
      x1="400"
      y1="0"
      x2="400"
      y2="320"
      stroke="rgba(255,255,255,0.18)"
      strokeWidth="1.5"
    />
    {/* Center circle */}
    <circle
      cx="400"
      cy="160"
      r="55"
      fill="none"
      stroke="rgba(255,255,255,0.18)"
      strokeWidth="1.5"
    />
    <circle cx="400" cy="160" r="2.5" fill="rgba(255,255,255,0.4)" />
    {/* Left penalty box */}
    <rect
      x="0"
      y="80"
      width="80"
      height="160"
      fill="none"
      stroke="rgba(255,255,255,0.18)"
      strokeWidth="1.5"
    />
    <rect
      x="0"
      y="120"
      width="30"
      height="80"
      fill="none"
      stroke="rgba(255,255,255,0.18)"
      strokeWidth="1.5"
    />
    {/* Right penalty box */}
    <rect
      x="720"
      y="80"
      width="80"
      height="160"
      fill="none"
      stroke="rgba(255,255,255,0.18)"
      strokeWidth="1.5"
    />
    <rect
      x="770"
      y="120"
      width="30"
      height="80"
      fill="none"
      stroke="rgba(255,255,255,0.18)"
      strokeWidth="1.5"
    />
  </svg>
);

const KpiCard = ({ icon, value, label }: KPI) => (
  <div className="flex items-center gap-2.5 rounded-xl bg-white/10 backdrop-blur-sm px-3 py-2 ring-1 ring-white/15">
    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/15 text-white shrink-0">
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-base font-bold text-white tabular-nums leading-none">
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wider text-white/70 mt-1 truncate">
        {label}
      </p>
    </div>
  </div>
);

const ROLE_CHIP: Record<
  TeamRole,
  { label: string; Icon: typeof Crown; classes: string }
> = {
  OWNER: {
    label: 'Owner',
    Icon: Crown,
    classes: 'bg-emerald-400/15 text-emerald-200 ring-emerald-300/30',
  },
  ADMIN: {
    label: 'Admin',
    Icon: ShieldCheck,
    classes: 'bg-sky-400/15 text-sky-200 ring-sky-300/30',
  },
  FOLLOWER: {
    label: 'Seguidor',
    Icon: UserCheck,
    classes: 'bg-white/10 text-white/90 ring-white/20',
  },
};

export default function TeamHero({
  name,
  logoUrl,
  description,
  planLabel,
  isPro,
  readOnly,
  myRole,
  playerCount,
  gameCount,
  photoCount,
  championshipCount,
  logoSlot,
}: TeamHeroProps) {
  const kpis: KPI[] = [
    {
      icon: <Users className="w-4 h-4" />,
      value: playerCount ?? 0,
      label: 'Jogadores',
    },
    {
      icon: <Calendar className="w-4 h-4" />,
      value: gameCount ?? 0,
      label: 'Jogos',
    },
    {
      icon: <Trophy className="w-4 h-4" />,
      value: championshipCount ?? 0,
      label: 'Campeonatos',
    },
    {
      icon: <Camera className="w-4 h-4" />,
      value: photoCount ?? 0,
      label: 'Fotos',
    },
  ];

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-800/40 shadow-lg">
      {/* Base gradient */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900"
      />
      {/* Pitch backdrop pattern */}
      <PitchBackdrop />
      {/* Top-left glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-emerald-500/20 blur-3xl"
      />
      {/* Bottom-right glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -right-20 w-80 h-80 rounded-full bg-primary-500/15 blur-3xl"
      />

      <div className="relative p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="shrink-0">
              <div className="rounded-full p-1 ring-2 ring-white/20 bg-white/5 shadow-xl">
                {logoSlot ?? (
                  <TeamLogo name={name} logoUrl={logoUrl} size={88} />
                )}
              </div>
            </div>
            <div className="min-w-0 pt-1">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight truncate">
                {name}
              </h2>
              {description && (
                <p className="text-sm text-white/70 mt-1.5 line-clamp-2">
                  {description}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {myRole && (() => {
                  const cfg = ROLE_CHIP[myRole];
                  const Icon = cfg.Icon;
                  return (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${cfg.classes}`}
                    >
                      <Icon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                  );
                })()}
                {planLabel && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${
                      isPro
                        ? 'bg-amber-400/15 text-amber-200 ring-amber-300/30'
                        : 'bg-white/10 text-white/90 ring-white/20'
                    }`}
                  >
                    {planLabel}
                  </span>
                )}
                {readOnly && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-white/90 ring-1 ring-white/20">
                    <Eye className="w-3 h-3" />
                    Somente leitura
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {kpis.map((k) => (
            <KpiCard key={k.label} {...k} />
          ))}
        </div>
      </div>
    </section>
  );
}
