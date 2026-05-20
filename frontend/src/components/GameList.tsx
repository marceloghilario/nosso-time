import { Link } from 'react-router-dom';
import { Calendar, ChevronRight, Clock, MapPin } from 'lucide-react';
import type { Game, GameStatus } from '../types';
import { GAME_STATUS_LABELS } from '../utils/constants';

interface Props {
  teamId: string;
  games: Game[];
  readOnly?: boolean;
}

const MONTH_SHORT = [
  'JAN',
  'FEV',
  'MAR',
  'ABR',
  'MAI',
  'JUN',
  'JUL',
  'AGO',
  'SET',
  'OUT',
  'NOV',
  'DEZ',
];

interface StatusStyle {
  /** Color band shown at the top of the date tile. */
  band: string;
  /** Dot color used inside the status pill. */
  dot: string;
  /** Background + text for the status pill. */
  pill: string;
}

const statusStyles: Record<GameStatus, StatusStyle> = {
  AGENDADO: {
    band: 'bg-amber-400',
    dot: 'bg-amber-500',
    pill: 'bg-amber-50 text-amber-700 ring-amber-200/70',
  },
  REALIZADO: {
    band: 'bg-emerald-500',
    dot: 'bg-emerald-500',
    pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200/70',
  },
};

interface ParsedDate {
  day: string;
  monthShort: string;
}

const parseDate = (date: string): ParsedDate | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  const monthIdx = Number(match[2]) - 1;
  if (monthIdx < 0 || monthIdx > 11) return null;
  return { day: match[3], monthShort: MONTH_SHORT[monthIdx] };
};

function DateTile({
  status,
  date,
}: {
  status: GameStatus;
  date: string | undefined;
}) {
  const parsed = date ? parseDate(date) : null;
  const style = statusStyles[status];
  return (
    <div className="shrink-0 w-14 sm:w-16 rounded-xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden text-center">
      <div className={`h-1.5 ${style.band}`} aria-hidden="true" />
      {parsed ? (
        <div className="py-1.5">
          <p className="text-xl sm:text-2xl font-extrabold leading-none text-slate-900 tabular-nums">
            {parsed.day}
          </p>
          <p className="text-[10px] font-semibold tracking-wider text-slate-500 mt-1">
            {parsed.monthShort}
          </p>
        </div>
      ) : (
        <div className="py-2">
          <p className="text-[10px] font-semibold tracking-wider text-slate-500 leading-tight">
            A<br />DEFINIR
          </p>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: GameStatus }) {
  const s = statusStyles[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${s.pill}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
      {GAME_STATUS_LABELS[status]}
    </span>
  );
}

function ScoreBlock({
  scoreFor,
  scoreAgainst,
}: {
  scoreFor: number;
  scoreAgainst: number;
}) {
  let tone = 'text-slate-700 bg-slate-50 ring-slate-200/80';
  if (scoreFor > scoreAgainst) {
    tone = 'text-emerald-700 bg-emerald-50 ring-emerald-200/70';
  } else if (scoreFor < scoreAgainst) {
    tone = 'text-rose-700 bg-rose-50 ring-rose-200/70';
  }
  return (
    <div
      className={`shrink-0 inline-flex items-baseline gap-1.5 rounded-lg px-2.5 py-1 ring-1 ${tone}`}
    >
      <span className="text-xl sm:text-2xl font-extrabold tabular-nums leading-none">
        {scoreFor}
      </span>
      <span className="text-xs font-semibold opacity-60">×</span>
      <span className="text-xl sm:text-2xl font-extrabold tabular-nums leading-none">
        {scoreAgainst}
      </span>
    </div>
  );
}

export default function GameList({ teamId, games, readOnly }: Props) {
  if (games.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-8 text-center">
        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Calendar className="w-6 h-6 text-slate-400" />
        </div>
        <p className="text-slate-600">Nenhum jogo cadastrado ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {games.map((game) => {
        const hasResult = game.status === 'REALIZADO' && game.result;
        const body = (
          <div className="flex items-stretch gap-3 sm:gap-4">
            <DateTile status={game.status} date={game.date} />
            <div className="min-w-0 flex-1 flex flex-col justify-between gap-1.5 py-0.5">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                  Confronto
                </p>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                  vs <span className="text-slate-900">{game.opponent}</span>
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                {game.time && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="tabular-nums">{game.time}</span>
                  </span>
                )}
                {game.location && (
                  <span className="inline-flex items-center gap-1 min-w-0">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{game.location}</span>
                  </span>
                )}
                <StatusPill status={game.status} />
              </div>
            </div>
            <div className="shrink-0 flex flex-col items-end justify-center gap-1">
              {hasResult && game.result ? (
                <ScoreBlock
                  scoreFor={game.result.scoreFor}
                  scoreAgainst={game.result.scoreAgainst}
                />
              ) : (
                <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                  vs
                </span>
              )}
              {!readOnly && (
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary-500 transition-colors" />
              )}
            </div>
          </div>
        );
        if (readOnly) {
          return (
            <div
              key={game.gameId}
              className="block bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-3 sm:p-4"
            >
              {body}
            </div>
          );
        }
        return (
          <Link
            key={game.gameId}
            to={`/teams/${teamId}/jogos/${game.gameId}`}
            className="group block bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-3 sm:p-4 hover:ring-primary-300 hover:shadow-md transition"
          >
            {body}
          </Link>
        );
      })}
    </div>
  );
}
