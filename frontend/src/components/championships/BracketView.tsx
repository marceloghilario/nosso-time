import { useMemo } from 'react';
import type {
  Championship,
  ChampionshipGame,
  ChampionshipPhase,
} from '../../types';

interface Props {
  championship: Championship;
}

const KO_PHASES: ChampionshipPhase[] = ['R16', 'QF', 'SF', 'F', '3RD'];

const PHASE_LABEL: Record<ChampionshipPhase, string> = {
  RR: '',
  GROUP: '',
  R16: 'Oitavas',
  QF: 'Quartas',
  SF: 'Semifinais',
  F: 'Final',
  '3RD': '3º lugar',
};

const winnerOf = (game: ChampionshipGame): 'HOME' | 'AWAY' | null => {
  if (game.status !== 'REALIZADO') return null;
  if (game.homeScore === undefined || game.awayScore === undefined) return null;
  if (game.homeScore > game.awayScore) return 'HOME';
  if (game.homeScore < game.awayScore) return 'AWAY';
  return game.winnerByPenalties ?? null;
};

const MatchCard = ({ game }: { game: ChampionshipGame }) => {
  const winner = winnerOf(game);
  return (
    <div className="bg-slate-50 rounded-lg border border-slate-200 shadow-sm w-44 text-xs">
      <div
        className={`flex items-center justify-between gap-1 px-2 py-1.5 border-b border-gray-100 ${
          winner === 'HOME' ? 'font-bold text-gray-900' : 'text-gray-700'
        }`}
      >
        <span className="truncate flex-1">
          {game.homeTeamName ?? <span className="text-gray-400">—</span>}
        </span>
        <span
          className={`tabular-nums ${
            winner === 'HOME' ? 'text-emerald-700' : ''
          }`}
        >
          {game.homeScore ?? '-'}
        </span>
        {winner === 'HOME' &&
          game.homeScore === game.awayScore &&
          game.winnerByPenalties === 'HOME' && (
            <span className="text-[10px] text-emerald-700">(p)</span>
          )}
      </div>
      <div
        className={`flex items-center justify-between gap-1 px-2 py-1.5 ${
          winner === 'AWAY' ? 'font-bold text-gray-900' : 'text-gray-700'
        }`}
      >
        <span className="truncate flex-1">
          {game.awayTeamName ?? <span className="text-gray-400">—</span>}
        </span>
        <span
          className={`tabular-nums ${
            winner === 'AWAY' ? 'text-emerald-700' : ''
          }`}
        >
          {game.awayScore ?? '-'}
        </span>
        {winner === 'AWAY' &&
          game.homeScore === game.awayScore &&
          game.winnerByPenalties === 'AWAY' && (
            <span className="text-[10px] text-emerald-700">(p)</span>
          )}
      </div>
    </div>
  );
};

export default function BracketView({ championship }: Props) {
  const columns = useMemo(() => {
    const byPhase = new Map<ChampionshipPhase, ChampionshipGame[]>();
    for (const g of championship.games) {
      if (!KO_PHASES.includes(g.phase)) continue;
      if (!byPhase.has(g.phase)) byPhase.set(g.phase, []);
      byPhase.get(g.phase)!.push(g);
    }
    return KO_PHASES.filter((p) => byPhase.has(p)).map((phase) => {
      const games = byPhase.get(phase)!.slice();
      games.sort(
        (a, b) => (a.bracketIndex ?? 0) - (b.bracketIndex ?? 0),
      );
      return { phase, games };
    });
  }, [championship]);

  if (columns.length === 0) {
    return (
      <div className="bg-slate-50 rounded-xl shadow-sm border border-slate-200 p-5 text-sm text-gray-500">
        {championship.format === 'COPA'
          ? 'O chaveamento será gerado quando a fase de grupos for concluída.'
          : 'Sem chaveamento disponível.'}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-4 min-w-min">
        {columns.map(({ phase, games }) => (
          <div key={phase} className="flex flex-col gap-3 shrink-0">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              {PHASE_LABEL[phase]}
            </h4>
            <div className="flex flex-col gap-3 justify-around flex-1">
              {games.map((g) => (
                <MatchCard key={g.gameId} game={g} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
