import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ExternalLink, Loader2, Pencil } from 'lucide-react';
import { api, ApiError } from '../../services/api';
import type {
  Championship,
  ChampionshipGame,
  ChampionshipGameLink,
  ChampionshipPhase,
  ChampionshipParticipant,
} from '../../types';

interface Props {
  championship: Championship;
  onUpdated: () => void;
}

const PHASE_ORDER: ChampionshipPhase[] = [
  'RR',
  'GROUP',
  'R16',
  'QF',
  'SF',
  'F',
  '3RD',
];

const PHASE_LABEL: Record<ChampionshipPhase, string> = {
  RR: 'Pontos corridos',
  GROUP: 'Fase de grupos',
  R16: 'Oitavas de final',
  QF: 'Quartas de final',
  SF: 'Semifinais',
  F: 'Final',
  '3RD': 'Disputa de 3º lugar',
};

const myParticipantsInGame = (
  game: ChampionshipGame,
  participants: ChampionshipParticipant[],
): ChampionshipParticipant[] => {
  const mine: ChampionshipParticipant[] = [];
  for (const p of participants) {
    if (!p.isMine) continue;
    if (p.teamId === game.homeTeamId || p.teamId === game.awayTeamId) {
      mine.push(p);
    }
  }
  return mine;
};

const getGameLinks = (game: ChampionshipGame): ChampionshipGameLink[] => {
  if (game.links && game.links.length > 0) return game.links;
  if (game.linkedGameId && game.linkedTeamId) {
    return [{ teamId: game.linkedTeamId, gameId: game.linkedGameId }];
  }
  return [];
};

const formatScheduledLabel = (
  game: ChampionshipGame,
): string | null => {
  const parts: string[] = [];
  if (game.date) {
    const [y, m, d] = game.date.split('-');
    parts.push(`${d}/${m}/${y}`);
  }
  if (game.time) parts.push(game.time);
  if (game.location) parts.push(game.location);
  return parts.length > 0 ? parts.join(' · ') : null;
};

const sortByDate = (a: ChampionshipGame, b: ChampionshipGame): number => {
  // Undated games go to the end.
  if (!a.date && !b.date) {
    return a.round - b.round || (a.bracketIndex ?? 0) - (b.bracketIndex ?? 0);
  }
  if (!a.date) return 1;
  if (!b.date) return -1;
  if (a.date !== b.date) return a.date.localeCompare(b.date);
  const at = a.time ?? '';
  const bt = b.time ?? '';
  if (at !== bt) {
    if (!at) return 1;
    if (!bt) return -1;
    return at.localeCompare(bt);
  }
  return a.round - b.round || (a.bracketIndex ?? 0) - (b.bracketIndex ?? 0);
};

const GameRow = ({
  game,
  championshipId,
  participants,
  viewerIsCreator,
  onUpdated,
}: {
  game: ChampionshipGame;
  championshipId: string;
  participants: ChampionshipParticipant[];
  viewerIsCreator: boolean;
  onUpdated: () => void;
}) => {
  const navigate = useNavigate();
  const [linking, setLinking] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const myTeams = useMemo(
    () => myParticipantsInGame(game, participants),
    [game, participants],
  );
  const links = useMemo(() => getGameLinks(game), [game]);

  const openAsGame = async (teamId: string) => {
    const existing = links.find((l) => l.teamId === teamId);
    if (existing) {
      navigate(`/teams/${existing.teamId}/jogos/${existing.gameId}`);
      return;
    }
    setLinking(teamId);
    setLinkError(null);
    try {
      const link = await api.linkChampionshipGame(
        championshipId,
        game.gameId,
        { teamId },
      );
      onUpdated();
      navigate(`/teams/${link.teamId}/jogos/${link.gameId}`);
    } catch (err) {
      setLinkError(
        err instanceof ApiError ? err.message : 'Erro ao abrir jogo',
      );
    } finally {
      setLinking(null);
    }
  };

  const teamsDefined = Boolean(game.homeTeamId && game.awayTeamId);
  const hasScore =
    game.homeScore !== undefined && game.awayScore !== undefined;
  const scheduled = formatScheduledLabel(game);

  return (
    <li className="bg-slate-50 rounded-xl shadow-sm border border-slate-200 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-[10rem] text-right text-sm font-medium text-gray-900 truncate">
          {game.homeTeamName ?? <span className="text-gray-400">A definir</span>}
        </div>
        <div className="flex items-center gap-1 text-base font-bold text-gray-900 tabular-nums">
          <span className="inline-block w-10 text-center">
            {hasScore ? game.homeScore : '—'}
          </span>
          <span className="text-gray-400">x</span>
          <span className="inline-block w-10 text-center">
            {hasScore ? game.awayScore : '—'}
          </span>
        </div>
        <div className="flex-1 min-w-[10rem] text-left text-sm font-medium text-gray-900 truncate">
          {game.awayTeamName ?? <span className="text-gray-400">A definir</span>}
        </div>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
        {scheduled && <span className="text-gray-500">{scheduled}</span>}
        {game.winnerByPenalties && (
          <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-amber-700">
            Pênaltis:{' '}
            {game.winnerByPenalties === 'HOME'
              ? game.homeTeamName
              : game.awayTeamName}
          </span>
        )}
        {game.status === 'REALIZADO' && (
          <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-emerald-700">
            Realizado
          </span>
        )}
      </div>
      {linkError && (
        <p className="mt-2 text-xs text-rose-600">{linkError}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
        {viewerIsCreator && (
          <Link
            to={`/campeonatos/${championshipId}/jogos/${game.gameId}`}
            className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-primary-700"
            aria-disabled={!teamsDefined}
          >
            <Pencil className="w-3 h-3" />
            Editar partida
          </Link>
        )}
        {myTeams.length > 0 && (
          myTeams.length === 1 ? (
            <button
              type="button"
              onClick={() => openAsGame(myTeams[0].teamId)}
              disabled={linking !== null || !teamsDefined}
              className="inline-flex items-center gap-1 rounded-lg border border-primary-200 bg-primary-50 px-2 py-1 text-xs font-medium text-primary-700 hover:bg-primary-100 disabled:opacity-50"
            >
              {linking === myTeams[0].teamId ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <ExternalLink className="w-3 h-3" />
              )}
              Abrir como meu time
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[11px] text-gray-500">Abrir como:</span>
              {myTeams.map((p) => (
                <button
                  key={p.teamId}
                  type="button"
                  onClick={() => openAsGame(p.teamId)}
                  disabled={linking !== null || !teamsDefined}
                  className="inline-flex items-center gap-1 rounded-lg border border-primary-200 bg-primary-50 px-2 py-1 text-xs font-medium text-primary-700 hover:bg-primary-100 disabled:opacity-50"
                >
                  {linking === p.teamId ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <ExternalLink className="w-3 h-3" />
                  )}
                  {p.teamName}
                </button>
              ))}
            </div>
          )
        )}
      </div>
    </li>
  );
};

export default function GamesList({ championship, onUpdated }: Props) {
  const grouped = useMemo(() => {
    const byPhase = new Map<ChampionshipPhase, ChampionshipGame[]>();
    for (const g of championship.games) {
      if (!byPhase.has(g.phase)) byPhase.set(g.phase, []);
      byPhase.get(g.phase)!.push(g);
    }
    const phases = PHASE_ORDER.filter((p) => byPhase.has(p));
    return phases.map((phase) => {
      const games = byPhase.get(phase)!;
      const byGroup = new Map<string | undefined, ChampionshipGame[]>();
      for (const g of games) {
        const key = g.group;
        if (!byGroup.has(key)) byGroup.set(key, []);
        byGroup.get(key)!.push(g);
      }
      for (const [, list] of byGroup) {
        list.sort(sortByDate);
      }
      return { phase, byGroup };
    });
  }, [championship]);

  const [phaseFilter, setPhaseFilter] = useState<ChampionshipPhase | 'ALL'>(
    'ALL',
  );

  const visible = grouped.filter(
    (g) => phaseFilter === 'ALL' || g.phase === phaseFilter,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setPhaseFilter('ALL')}
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            phaseFilter === 'ALL'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Todas as fases
        </button>
        {grouped.map(({ phase }) => (
          <button
            key={phase}
            type="button"
            onClick={() => setPhaseFilter(phase)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              phaseFilter === phase
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {PHASE_LABEL[phase]}
          </button>
        ))}
      </div>

      {visible.length === 0 && (
        <p className="text-sm text-gray-500">Nenhum jogo nesta fase.</p>
      )}

      {visible.map(({ phase, byGroup }) => (
        <section key={phase} className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-900">
            {PHASE_LABEL[phase]}
          </h3>
          {[...byGroup.entries()].map(([groupName, games]) => (
            <div key={groupName ?? 'no-group'} className="space-y-2">
              {groupName && (
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {groupName}
                </p>
              )}
              <ul className="space-y-2">
                {games.map((g) => (
                  <GameRow
                    key={g.gameId}
                    game={g}
                    championshipId={championship.championshipId}
                    participants={championship.participants}
                    viewerIsCreator={championship.viewerIsCreator === true}
                    onUpdated={onUpdated}
                  />
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
