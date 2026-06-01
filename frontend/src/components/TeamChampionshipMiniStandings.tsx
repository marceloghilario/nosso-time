import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Trophy } from 'lucide-react';
import { api } from '../services/api';
import { useApi } from '../hooks/useApi';
import {
  computeStandings,
  type StandingRow,
} from './championships/standings';
import type { Championship, ChampionshipFormat } from '../types';

interface Props {
  teamId: string;
}

interface ScopedStandings {
  rows: StandingRow[];
  phaseLabel: string;
}

const formatLabel: Record<ChampionshipFormat, string> = {
  PONTOS_CORRIDOS: 'Pontos corridos',
  MATA_MATA: 'Mata-mata',
  COPA: 'Copa',
};

function pickChampionship(
  championships: Championship[],
  teamId: string,
): Championship | undefined {
  const candidates = championships.filter((c) =>
    c.participants.some((p) => p.teamId === teamId),
  );
  if (candidates.length === 0) return undefined;
  const teamGamesCount = (c: Championship): number =>
    c.games.filter(
      (g) => g.homeTeamId === teamId || g.awayTeamId === teamId,
    ).length;
  return [...candidates].sort((a, b) => {
    const aActive = a.status === 'EM_ANDAMENTO' ? 1 : 0;
    const bActive = b.status === 'EM_ANDAMENTO' ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive;
    const aCount = teamGamesCount(a);
    const bCount = teamGamesCount(b);
    if (aCount !== bCount) return bCount - aCount;
    return b.updatedAt.localeCompare(a.updatedAt);
  })[0];
}

function buildScoped(
  championship: Championship,
  teamId: string,
): ScopedStandings | null {
  if (championship.format === 'PONTOS_CORRIDOS') {
    const rows = computeStandings(
      championship,
      (g) => g.phase === 'RR',
      championship.participants.map((p) => p.teamId),
    );
    return { rows, phaseLabel: 'Pontos corridos' };
  }
  if (championship.format === 'COPA' && championship.groups) {
    const group = championship.groups.find((g) => g.teamIds.includes(teamId));
    if (!group) return null;
    const rows = computeStandings(
      championship,
      (g) => g.phase === 'GROUP' && g.group === group.name,
      group.teamIds,
    );
    return { rows, phaseLabel: `Fase de grupos · ${group.name}` };
  }
  return null;
}

function summaryRows(
  rows: StandingRow[],
  teamId: string,
  maxRows = 4,
): { row: StandingRow; pos: number; gap?: boolean }[] {
  if (rows.length <= maxRows) {
    return rows.map((row, idx) => ({ row, pos: idx + 1 }));
  }
  const top = rows
    .slice(0, 3)
    .map((row, idx) => ({ row, pos: idx + 1 }));
  const teamIdx = rows.findIndex((r) => r.teamId === teamId);
  if (teamIdx === -1 || teamIdx < 3) return top;
  const teamRow = { row: rows[teamIdx], pos: teamIdx + 1, gap: true };
  return [...top, teamRow];
}

export default function TeamChampionshipMiniStandings({ teamId }: Props) {
  const championshipsReq = useApi(() => api.listChampionships(), []);

  const view = useMemo(() => {
    if (!championshipsReq.data) return null;
    const championship = pickChampionship(championshipsReq.data, teamId);
    if (!championship) return null;
    const scoped = buildScoped(championship, teamId);
    return { championship, scoped };
  }, [championshipsReq.data, teamId]);

  if (championshipsReq.loading || championshipsReq.error || !view) return null;
  const { championship, scoped } = view;

  const teamRow = scoped?.rows.find((r) => r.teamId === teamId);
  const teamPos =
    scoped && teamRow ? scoped.rows.findIndex((r) => r.teamId === teamId) + 1 : 0;
  const totalParticipants = scoped?.rows.length ?? championship.participants.length;
  const visibleRows = scoped ? summaryRows(scoped.rows, teamId) : [];
  const hasResults = scoped?.rows.some((r) => r.played > 0) ?? false;

  return (
    <section
      aria-label="Classificação do campeonato"
      className="bg-slate-50 rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-3 sm:p-4 space-y-3"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-500 flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5" />
          Classificação do campeonato
        </h3>
        <Link
          to={`/campeonatos/${championship.championshipId}`}
          className="text-xs font-semibold text-primary-600 hover:text-primary-700 inline-flex items-center gap-1"
        >
          Ver completa
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          to={`/campeonatos/${championship.championshipId}`}
          className="text-base font-bold text-slate-900 hover:text-primary-700 transition"
        >
          {championship.name}
        </Link>
        <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-600 bg-slate-100 ring-1 ring-slate-200 rounded-full px-2 py-0.5">
          {formatLabel[championship.format]}
        </span>
        {scoped && (
          <span className="text-[11px] uppercase tracking-wider font-semibold text-primary-700 bg-primary-50 ring-1 ring-primary-200 rounded-full px-2 py-0.5">
            {scoped.phaseLabel}
          </span>
        )}
        <span
          className={`text-[11px] uppercase tracking-wider font-semibold rounded-full px-2 py-0.5 ring-1 ${
            championship.status === 'EM_ANDAMENTO'
              ? 'text-amber-700 bg-amber-50 ring-amber-200'
              : 'text-slate-600 bg-slate-100 ring-slate-200'
          }`}
        >
          {championship.status === 'EM_ANDAMENTO' ? 'Em andamento' : 'Finalizado'}
        </span>
      </div>

      {!scoped && (
        <p className="text-sm text-slate-500">
          Este campeonato é do tipo {formatLabel[championship.format].toLowerCase()}.
          Não há fase de pontos pra gerar tabela.
        </p>
      )}

      {scoped && !hasResults && (
        <p className="text-sm text-slate-500">
          Sem resultados registrados ainda. Quando os jogos forem realizados, a tabela aparece aqui.
        </p>
      )}

      {scoped && hasResults && teamRow && (
        <div className="bg-white rounded-xl ring-1 ring-primary-200 shadow-sm px-3 py-2.5 flex items-center gap-3 flex-wrap">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-extrabold tabular-nums text-slate-900">
              {teamPos}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              /{totalParticipants}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-wider font-semibold text-slate-500">
              Sua posição
            </div>
            <div className="text-sm font-semibold text-slate-900 tabular-nums">
              {teamRow.points} pts ·{' '}
              <span className="text-slate-600">
                {teamRow.played} J · {teamRow.wins}V {teamRow.draws}E{' '}
                {teamRow.losses}D · SG {teamRow.gd >= 0 ? '+' : ''}
                {teamRow.gd}
              </span>
            </div>
          </div>
        </div>
      )}

      {scoped && hasResults && (
        <div className="overflow-x-auto -mx-1">
          <table className="min-w-full text-xs sm:text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-2 py-1.5 text-left font-medium">#</th>
                <th className="px-2 py-1.5 text-left font-medium">Time</th>
                <th className="px-1.5 py-1.5 text-center font-medium">P</th>
                <th className="px-1.5 py-1.5 text-center font-medium">J</th>
                <th className="px-1.5 py-1.5 text-center font-medium">V</th>
                <th className="px-1.5 py-1.5 text-center font-medium">E</th>
                <th className="px-1.5 py-1.5 text-center font-medium">D</th>
                <th className="px-1.5 py-1.5 text-center font-medium">SG</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map(({ row, pos, gap }, idx) => {
                const isCurrent = row.teamId === teamId;
                return (
                  <tr
                    key={row.teamId}
                    className={`${
                      isCurrent
                        ? 'bg-primary-50/80 ring-1 ring-primary-300'
                        : idx % 2
                        ? 'bg-white'
                        : ''
                    } ${gap ? 'border-t-2 border-dashed border-slate-200' : ''}`}
                  >
                    <td
                      className={`px-2 py-1.5 tabular-nums ${
                        isCurrent
                          ? 'text-primary-700 font-bold'
                          : 'text-slate-500 font-medium'
                      }`}
                    >
                      {pos}
                    </td>
                    <td
                      className={`px-2 py-1.5 truncate max-w-[8.5rem] sm:max-w-none ${
                        isCurrent
                          ? 'text-primary-900 font-bold'
                          : 'text-slate-900 font-medium'
                      }`}
                    >
                      {row.teamName}
                    </td>
                    <td className="px-1.5 py-1.5 text-center font-bold tabular-nums text-slate-900">
                      {row.points}
                    </td>
                    <td className="px-1.5 py-1.5 text-center tabular-nums text-slate-700">
                      {row.played}
                    </td>
                    <td className="px-1.5 py-1.5 text-center tabular-nums text-slate-700">
                      {row.wins}
                    </td>
                    <td className="px-1.5 py-1.5 text-center tabular-nums text-slate-700">
                      {row.draws}
                    </td>
                    <td className="px-1.5 py-1.5 text-center tabular-nums text-slate-700">
                      {row.losses}
                    </td>
                    <td className="px-1.5 py-1.5 text-center tabular-nums text-slate-700">
                      {row.gd >= 0 ? '+' : ''}
                      {row.gd}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
