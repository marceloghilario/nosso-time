import { Crown, ShieldCheck, UserCheck } from 'lucide-react';
import type { TeamRole } from '../types';

interface RoleBadgeProps {
  role: TeamRole;
  className?: string;
}

/**
 * Compact chip describing the caller's role on a team.
 * Used in the My Teams page, hero cards and admin panels.
 */
export default function RoleBadge({ role, className = '' }: RoleBadgeProps) {
  const config = {
    OWNER: {
      label: 'Owner',
      Icon: Crown,
      classes: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
    },
    ADMIN: {
      label: 'Admin',
      Icon: ShieldCheck,
      classes: 'bg-sky-100 text-sky-800 ring-sky-200',
    },
    FOLLOWER: {
      label: 'Seguidor',
      Icon: UserCheck,
      classes: 'bg-slate-100 text-slate-700 ring-slate-200',
    },
  }[role];
  const Icon = config.Icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ${config.classes} ${className}`}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}
