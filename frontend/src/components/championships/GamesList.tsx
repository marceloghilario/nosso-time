import { useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { api, ApiError } from '../../services/api';
import type {
  Championship,
  ChampionshipGame,
  ChampionshipPhase,
} from '../../types';

interface Props {
  championship: Championship;
  onUpdated: (championship: Championship) => void;
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

const isKnockout = (phase: ChampionshipPhase): boolean =>
  phase !== 'RR' && phase !== 'GROUP';

const GameRow = ({
  game,
  championshipId,
  onUpdated,
}: {
  game: ChampionshipGame;
  championshipId: string;
  onUpdated: (c: Championship) => void;
}) => {
  const [home, setHome] = useState<string>(
    game.homeScore !== undefined ? String(game.homeScore) : '',
  );
  const [away, setAway] = useState<string>(
    game.awayScore !== undefined ? String(game.awayScore) : '',
  );
  const [penalties, setPenalties] = useState<'HOME' | 'AWAY' | ''>(
    game.winnerByPenalties ?? '',
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const homeReady = home !== '' && !Number.isNaN(Number(home));
  const awayReady = away !== '' && !Number.isNaN(Number(away));
  const isDraw =
    homeReady && awayReady && Number(home) === Number(away);
  const needsPenalties = isKnockout(game.phase) && isDraw;
  const teamsDefined = Boolean(game.homeTeamId && game.awayTeamId);

  const save = async () => {
    if (!teamsDefined) return;
    if (!homeReady || !awayReady) {
      setError('Preencha placar dos dois times.');
      return;
    }
    if (needsPenalties && !penalties) {
      setError('Em mata-mata, defina o vencedor por pênaltis.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await api.updateChampionshipGame(
        championshipId,
        game.gameId,
        {
          homeScore: Number(home),
          awayScore: Number(away),
          winnerByPenalties: needsPenalties
            ? (penalties as 'HOME' | 'AWAY')
            : null,
        },
      );
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const clear = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.updateChampionshipGame(
        championshipId,
        game.gameId,
        { clear: true },
      );
      setHome('');
      setAway('');
      setPenalties('');
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao limpar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-[10rem] text-right text-sm font-medium text-gray-900 truncate">
          {game.homeTeamName ?? <span className="text-gray-400">A definir</span>}
        </div>
        <input
          type="number"
          min={0}
          max={99}
          disabled={!teamsDefined || saving}
          value={home}
          onChange={(e) => setHome(e.target.value)}
          className="w-14 rounded-lg border border-gray-200 bg-white px-1 py-1.5 text-center text-base font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
        />
        <span className="text-gray-400">x</span>
        <input
          type="number"
          min={0}
          max={99}
          disabled={!teamsDefined || saving}
          value={away}
          onChange={(e) => setAway(e.target.value)}
          className="w-14 rounded-lg border border-gray-200 bg-white px-1 py-1.5 text-center text-base font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
        />
        <div className="flex-1 min-w-[10rem] text-left text-sm font-medium text-gray-900 truncate">
          {game.awayTeamName ?? <span className="text-gray-400">A definir</span>}
        </div>
      </div>
      {needsPenalties && (
        <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
          <span>Vencedor nos pênaltis:</span>
          <select
            value={penalties}
            onChange={(e) =>
              setPenalties((e.target.value as 'HOME' | 'AWAY') || '')
            }
            className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Selecione…</option>
            <option value="HOME">{game.homeTeamName}</option>
            <option value="AWAY">{game.awayTeamName}</option>
          </select>
        </div>
      )}
      {error && (
        <p className="mt-2 text-xs text-rose-600">{error}</p>
      )}
      <div className="mt-2 flex items-center justify-end gap-2">
        {game.status === 'REALIZADO' && (
          <button
            type="button"
            onClick={clear}
            disabled={saving}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <X className="w-3 h-3" /> Limpar
          </button>
        )}
        <button
          type="button"
          onClick={save}
          disabled={saving || !teamsDefined}
          className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {saving && <Loader2 className="w-3 h-3 animate-spin" />}
          Salvar placar
        </button>
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
