import type { ReactNode } from 'react';
import {
  ArrowRight,
  CalendarClock,
  Flag,
  History,
  Sparkles,
} from 'lucide-react';
import type { GameResult, GameStatus } from '../types';

interface MinimalGame {
  date: string;
  time: string;
  opponent: string;
  status: GameStatus;
  result?: GameResult;
}

interface Props {
  games: MinimalGame[];
}

const MONTH_SHORT = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
];

const formatShortDate = (date: string): string | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  const monthIdx = Number(match[2]) - 1;
  if (monthIdx < 0 || monthIdx > 11) return null;
  return `${match[3]} ${MONTH_SHORT[monthIdx]}`;
};

const compareAsc = (a: MinimalGame, b: MinimalGame): number => {
  if (a.date !== b.date) return a.date.localeCompare(b.date);
  return (a.time ?? '').localeCompare(b.time ?? '');
};

function StatCard({
  tone,
  icon,
  label,
  primary,
  secondary,
  meta,
}: {
  tone: 'slate' | 'amber' | 'emerald' | 'primary';
  icon: ReactNode;
  label: string;
  primary: ReactNode;
  secondary?: ReactNode;
  meta?: ReactNode;
}) {
  const toneClasses: Record<typeof tone, { icon: string; chip: string }> = {
    slate: {
      icon: 'bg-slate-100 text-slate-600',
      chip: 'bg-slate-100 text-slate-700 ring-slate-200/70',
    },
    amber: {
      icon: 'bg-amber-100 text-amber-700',
      chip: 'bg-amber-50 text-amber-700 ring-amber-200/70',
    },
    emerald: {
      icon: 'bg-emerald-100 text-emerald-700',
      chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200/70',
    },
    primary: {
      icon: 'bg-primary-100 text-primary-700',
      chip: 'bg-primary-50 text-primary-700 ring-primary-200/70',
    },
  };
  return (
    <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm p-3 sm:p-4 flex flex-col gap-2 min-h-[88px]">
      <div className="flex items-center gap-2">
        <div
          className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${toneClasses[tone].icon}`}
          aria-hidden="true"
        >
          {icon}
        </div>
        <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
          {label}
        </p>
        {meta && (
          <span
            className={`ml-auto inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${toneClasses[tone].chip}`}
          >
            {meta}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-900 truncate">{primary}</p>
        {secondary && (
          <p className="text-xs text-slate-500 truncate">{secondary}</p>
        )}
      </div>
    </div>
  );
}

export default function TeamQuickStats({ games }: Props) {
  const scheduled = games.filter((g) => g.status === 'AGENDADO' && g.date);
  scheduled.sort(compareAsc);
  const nextGame = scheduled[0];

  const completed = games.filter(
    (g): g is MinimalGame & { result: GameResult } =>
      g.status === 'REALIZADO' && Boolean(g.result),
  );
  completed.sort((a, b) => -compareAsc(a, b));
  const lastGame = completed[0];

  const wins = completed.filter(
    (g) => g.result.scoreFor > g.result.scoreAgainst,
  ).length;
  const draws = completed.filter(
    (g) => g.result.scoreFor === g.result.scoreAgainst,
  ).length;
  const losses = completed.filter(
    (g) => g.result.scoreFor < g.result.scoreAgainst,
  ).length;
  const winRate =
    completed.length === 0 ? null : Math.round((wins / completed.length) * 100);

  const nextDateLabel = nextGame ? formatShortDate(nextGame.date) : null;

  let lastTone: 'emerald' | 'slate' | 'amber' = 'slate';
  let lastResultLabel = 'Empate';
  if (lastGame) {
    if (lastGame.result.scoreFor > lastGame.result.scoreAgainst) {
      lastTone = 'emerald';
      lastResultLabel = 'Vitória';
    } else if (lastGame.result.scoreFor < lastGame.result.scoreAgainst) {
      lastTone = 'amber';
      lastResultLabel = 'Derrota';
    }
  }

  return (
    <section aria-label="Resumo do time">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-slate-400" aria-hidden="true" />
        <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-500">
          Resumo do time
        </h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
        <StatCard
          tone="amber"
          icon={<CalendarClock className="w-4 h-4" />}
          label="Próxima partida"
          meta={nextDateLabel ?? undefined}
          primary={
            nextGame ? (
              <span className="inline-flex items-center gap-1">
                vs {nextGame.opponent}
                <ArrowRight
                  className="w-3.5 h-3.5 text-slate-300 shrink-0"
                  aria-hidden="true"
                />
              </span>
            ) : (
              <span className="text-slate-400 font-medium">
                Nada agendado
              </span>
            )
          }
          secondary={
            nextGame ? (
              <span className="tabular-nums">{nextGame.time}</span>
            ) : (
              'Quando houver, aparece aqui'
            )
          }
        />
        <StatCard
          tone={lastGame ? lastTone : 'slate'}
          icon={<History className="w-4 h-4" />}
          label="Último resultado"
          meta={lastGame ? lastResultLabel : undefined}
          primary={
            lastGame ? (
              <span className="tabular-nums font-extrabold">
                {lastGame.result.scoreFor}
                <span className="px-1 text-slate-400">×</span>
                {lastGame.result.scoreAgainst}
              </span>
            ) : (
              <span className="text-slate-400 font-medium">Sem jogos</span>
            )
          }
          secondary={
            lastGame ? `vs ${lastGame.opponent}` : 'Realize um jogo pra ver'
          }
        />
        <StatCard
          tone={winRate !== null && winRate >= 50 ? 'emerald' : 'primary'}
          icon={<Flag className="w-4 h-4" />}
          label="Aproveitamento"
          meta={
            completed.length > 0
              ? `${completed.length} ${
                  completed.length === 1 ? 'jogo' : 'jogos'
                }`
              : undefined
          }
          primary={
            winRate !== null ? (
              <span className="tabular-nums">{winRate}%</span>
            ) : (
              <span className="text-slate-400 font-medium">—</span>
            )
          }
          secondary={
            completed.length > 0 ? (
              <span className="inline-flex items-center gap-2">
                <span className="inline-flex items-center gap-1">
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"
                    aria-hidden="true"
                  />
                  {wins}V
                </span>
                <span className="inline-flex items-center gap-1">
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full bg-slate-400"
                    aria-hidden="true"
                  />
                  {draws}E
                </span>
                <span className="inline-flex items-center gap-1">
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500"
                    aria-hidden="true"
                  />
                  {losses}D
                </span>
              </span>
            ) : (
              'V/E/D ainda sem registro'
            )
          }
        />
      </div>
    </section>
  );
}
