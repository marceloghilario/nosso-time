import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  Plus,
  Save,
  Trash2,
  Trophy,
} from 'lucide-react';
import { api, ApiError } from '../services/api';
import { useApi } from '../hooks/useApi';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import type {
  Championship,
  ChampionshipGame,
  ChampionshipGameGoal,
  ChampionshipGameTeamView,
  GameGuest,
  GameLineup,
  Player,
} from '../types';
import { PLAYER_POSITION_LABELS, comparePlayers } from '../utils/constants';

interface GoalDraft {
  key: string;
  teamSide: 'HOME' | 'AWAY';
  playerId: string;
  playerName: string;
  minute: string;
}

const newKey = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const toGoalDraft = (g: ChampionshipGameGoal): GoalDraft => ({
  key: newKey(),
  teamSide: g.teamSide,
  playerId: g.playerId,
  playerName: g.playerName,
  minute: g.minute !== undefined ? String(g.minute) : '',
});

const formatGuestLabel = (g: GameGuest): string =>
  g.number !== undefined ? `${g.name} (#${g.number})` : g.name;

interface TeamSideOption {
  id: string;
  label: string;
  source: 'roster' | 'guest';
  name: string;
}

const teamSideOptions = (
  view: ChampionshipGameTeamView | undefined,
): TeamSideOption[] => {
  if (!view) return [];
  const confirmed = new Set(view.confirmedPlayerIds);
  const players = [...view.players]
    .filter((p) => confirmed.has(p.playerId))
    .sort(comparePlayers);
  const opts: TeamSideOption[] = players.map((p) => ({
    id: p.playerId,
    label:
      p.number !== undefined
        ? `${p.name} (#${p.number}) — ${PLAYER_POSITION_LABELS[p.position]}`
        : `${p.name} — ${PLAYER_POSITION_LABELS[p.position]}`,
    source: 'roster',
    name: p.name,
  }));
  for (const g of view.guests) {
    opts.push({
      id: g.guestId,
      label: `${formatGuestLabel(g)} (convidado)`,
      source: 'guest',
      name: g.name,
    });
  }
  return opts;
};

const groupGoalsBySide = (
  goals: GoalDraft[],
  side: 'HOME' | 'AWAY',
): GoalDraft[] => goals.filter((g) => g.teamSide === side);

export default function ChampionshipGameEditor() {
  const {
    championshipId = '',
    championshipGameId = '',
  } = useParams<{
    championshipId: string;
    championshipGameId: string;
  }>();
  const { showSuccess, showError } = useToast();

  const championshipReq = useApi<Championship>(
    () => api.getChampionship(championshipId),
    [championshipId],
  );
  const championship = championshipReq.data;

  const game: ChampionshipGame | undefined = useMemo(() => {
    if (!championship) return undefined;
    return championship.games.find((g) => g.gameId === championshipGameId);
  }, [championship, championshipGameId]);

  const homeTeamView = useApi<ChampionshipGameTeamView | null>(
    async () => {
      if (!game?.homeTeamId) return null;
      return api.getChampionshipGameTeamView(
        championshipId,
        championshipGameId,
        game.homeTeamId,
      );
    },
    [championshipId, championshipGameId, game?.homeTeamId],
  );
  const awayTeamView = useApi<ChampionshipGameTeamView | null>(
    async () => {
      if (!game?.awayTeamId) return null;
      return api.getChampionshipGameTeamView(
        championshipId,
        championshipGameId,
        game.awayTeamId,
      );
    },
    [championshipId, championshipGameId, game?.awayTeamId],
  );

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [penalties, setPenalties] = useState<'HOME' | 'AWAY' | ''>('');
  const [goals, setGoals] = useState<GoalDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);

  const snapshot = game
    ? `${game.gameId}:${championship?.updatedAt ?? ''}`
    : null;

  if (game && snapshot && snapshot !== hydratedFor) {
    setHydratedFor(snapshot);
    setDate(game.date ?? '');
    setTime(game.time ?? '');
    setLocation(game.location ?? '');
    setHomeScore(
      game.homeScore !== undefined ? String(game.homeScore) : '',
    );
    setAwayScore(
      game.awayScore !== undefined ? String(game.awayScore) : '',
    );
    setPenalties(game.winnerByPenalties ?? '');
    setGoals((game.goals ?? []).map(toGoalDraft));
  }

  if (championshipReq.loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Carregando…
      </div>
    );
  }

  if (championshipReq.error || !championship) {
    return (
      <div className="space-y-3">
        <Link
          to="/campeonatos"
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Campeonatos
        </Link>
        <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {championshipReq.error ?? 'Campeonato não encontrado.'}
        </p>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="space-y-3">
        <Link
          to={`/campeonatos/${championshipId}`}
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          {championship.name}
        </Link>
        <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          Jogo não encontrado.
        </p>
      </div>
    );
  }

  if (!championship.viewerIsCreator) {
    return (
      <div className="space-y-3">
        <Link
          to={`/campeonatos/${championshipId}`}
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          {championship.name}
        </Link>
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Apenas o criador do campeonato pode editar os dados da partida. Para
          gerenciar seu time, abra o jogo como meu time na lista.
        </p>
      </div>
    );
  }

  const teamsDefined = Boolean(game.homeTeamId && game.awayTeamId);
  const isKnockout =
    game.phase !== 'RR' && game.phase !== 'GROUP';
  const homeScoreNum = homeScore === '' ? null : Number(homeScore);
  const awayScoreNum = awayScore === '' ? null : Number(awayScore);
  const isDraw =
    homeScoreNum !== null &&
    awayScoreNum !== null &&
    homeScoreNum === awayScoreNum;
  const needsPenalties = isKnockout && isDraw;

  const homeOptions = teamSideOptions(homeTeamView.data ?? undefined);
  const awayOptions = teamSideOptions(awayTeamView.data ?? undefined);

  const addGoal = (side: 'HOME' | 'AWAY') => {
    setGoals((prev) => [
      ...prev,
      {
        key: newKey(),
        teamSide: side,
        playerId: '',
        playerName: '',
        minute: '',
      },
    ]);
  };

  const updateGoal = (key: string, patch: Partial<GoalDraft>) => {
    setGoals((prev) =>
      prev.map((g) => (g.key === key ? { ...g, ...patch } : g)),
    );
  };

  const removeGoal = (key: string) => {
    setGoals((prev) => prev.filter((g) => g.key !== key));
  };

  const onScorerPick = (
    key: string,
    side: 'HOME' | 'AWAY',
    playerId: string,
  ) => {
    const options = side === 'HOME' ? homeOptions : awayOptions;
    const found = options.find((o) => o.id === playerId);
    updateGoal(key, {
      playerId,
      playerName: found?.name ?? '',
    });
  };

  const handleSave = async () => {
    if (!teamsDefined) return;
    if (homeScoreNum !== null && (homeScoreNum < 0 || homeScoreNum > 99)) {
      showError('Placar inválido');
      return;
    }
    if (awayScoreNum !== null && (awayScoreNum < 0 || awayScoreNum > 99)) {
      showError('Placar inválido');
      return;
    }
    if (
      (homeScoreNum !== null && awayScoreNum === null) ||
      (homeScoreNum === null && awayScoreNum !== null)
    ) {
      showError('Preencha placar dos dois times ou deixe ambos em branco.');
      return;
    }
    if (needsPenalties && !penalties) {
      showError('Em mata-mata, defina o vencedor por pênaltis.');
      return;
    }
    const goalsPayload: ChampionshipGameGoal[] = [];
    for (const g of goals) {
      if (!g.playerId) continue;
      if (!g.playerName) continue;
      const minute = g.minute ? Number.parseInt(g.minute, 10) : undefined;
      const item: ChampionshipGameGoal = {
        teamSide: g.teamSide,
        playerId: g.playerId,
        playerName: g.playerName,
      };
      if (minute !== undefined && Number.isFinite(minute)) {
        item.minute = minute;
      }
      goalsPayload.push(item);
    }

    setSaving(true);
    try {
      await api.updateChampionshipGame(championshipId, championshipGameId, {
        date: date || null,
        time: time || null,
        location: location || null,
        homeScore: homeScoreNum !== null ? homeScoreNum : undefined,
        awayScore: awayScoreNum !== null ? awayScoreNum : undefined,
        winnerByPenalties: needsPenalties
          ? (penalties as 'HOME' | 'AWAY')
          : null,
        goals: goalsPayload,
      });
      showSuccess('Partida atualizada');
      championshipReq.refetch();
      homeTeamView.refetch();
      awayTeamView.refetch();
    } catch (err) {
      showError(
        err instanceof ApiError ? err.message : 'Erro ao salvar partida',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (
      !window.confirm(
        'Limpar placar e resultado desta partida? Isto também limpa autores dos gols.',
      )
    )
      return;
    setSaving(true);
    try {
      await api.updateChampionshipGame(championshipId, championshipGameId, {
        clear: true,
      });
      setHomeScore('');
      setAwayScore('');
      setPenalties('');
      setGoals([]);
      showSuccess('Resultado limpo');
      championshipReq.refetch();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Erro ao limpar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <Link
        to={`/campeonatos/${championshipId}`}
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        {championship.name}
      </Link>

      <div className="bg-slate-50 rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex items-center gap-3">
          <Trophy className="w-5 h-5 text-primary-600 shrink-0" />
          <h2 className="text-lg font-bold text-gray-900">
            {game.homeTeamName ?? 'A definir'} × {game.awayTeamName ?? 'A definir'}
          </h2>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Você é o criador do campeonato. Os campos abaixo são propagados para
          cada time que abrir esta partida.
        </p>
      </div>

      <section className="bg-slate-50 rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Dados da partida
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Data</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Horário</span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </label>
        </div>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Local</span>
          <input
            type="text"
            maxLength={200}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </label>
      </section>

      <section className="bg-slate-50 rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Placar
        </h3>
        <div className="flex flex-wrap items-end justify-center gap-3 sm:gap-5">
          <div className="text-center">
            <p className="text-[11px] font-medium text-gray-500 mb-1 truncate max-w-[10rem]">
              {game.homeTeamName ?? 'Mandante'}
            </p>
            <input
              type="number"
              min={0}
              max={99}
              inputMode="numeric"
              placeholder="—"
              value={homeScore}
              onChange={(e) => setHomeScore(e.target.value)}
              disabled={!teamsDefined || saving}
              className="w-20 sm:w-24 rounded-lg border border-gray-200 bg-white px-2 py-3 text-center text-3xl font-extrabold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
            />
          </div>
          <span className="text-2xl font-bold text-gray-300 self-end pb-3">
            x
          </span>
          <div className="text-center">
            <p className="text-[11px] font-medium text-gray-500 mb-1 truncate max-w-[10rem]">
              {game.awayTeamName ?? 'Visitante'}
            </p>
            <input
              type="number"
              min={0}
              max={99}
              inputMode="numeric"
              placeholder="—"
              value={awayScore}
              onChange={(e) => setAwayScore(e.target.value)}
              disabled={!teamsDefined || saving}
              className="w-20 sm:w-24 rounded-lg border border-gray-200 bg-white px-2 py-3 text-center text-3xl font-extrabold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
            />
          </div>
        </div>
        {needsPenalties && (
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-gray-600">
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
      </section>

      <section className="bg-slate-50 rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Autores dos gols
        </h3>

        {(['HOME', 'AWAY'] as const).map((side) => {
          const opts = side === 'HOME' ? homeOptions : awayOptions;
          const sideGoals = groupGoalsBySide(goals, side);
          const teamName =
            side === 'HOME' ? game.homeTeamName : game.awayTeamName;
          const view =
            side === 'HOME' ? homeTeamView.data : awayTeamView.data;
          const loadingView =
            side === 'HOME' ? homeTeamView.loading : awayTeamView.loading;
          return (
            <div key={side} className="rounded-lg border border-gray-100 p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-sm font-medium text-gray-900">
                  {teamName ?? side}
                </p>
                <button
                  type="button"
                  onClick={() => addGoal(side)}
                  disabled={opts.length === 0}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <Plus className="w-3 h-3" />
                  Gol
                </button>
              </div>
              {loadingView && (
                <p className="text-[11px] text-gray-500">
                  Carregando jogadores confirmados…
                </p>
              )}
              {!loadingView && opts.length === 0 && (
                <p className="text-[11px] text-gray-500">
                  {view && view.linkedGameId === null
                    ? 'O dono deste time ainda não abriu a partida.'
                    : 'Nenhum jogador confirmado ou convidado disponível neste time.'}
                </p>
              )}
              {sideGoals.length > 0 && (
                <ul className="space-y-2">
                  {sideGoals.map((g) => (
                    <li
                      key={g.key}
                      className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2"
                    >
                      <select
                        value={g.playerId}
                        onChange={(e) =>
                          onScorerPick(g.key, side, e.target.value)
                        }
                        className="flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="" disabled>
                          Selecione um jogador
                        </option>
                        {opts.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.label}
                          </option>
                        ))}
                        {g.playerId &&
                          !opts.some((o) => o.id === g.playerId) && (
                            <option value={g.playerId}>
                              {g.playerName} (jogador removido)
                            </option>
                          )}
                      </select>
                      <input
                        type="number"
                        min={0}
                        max={200}
                        placeholder="min"
                        value={g.minute}
                        onChange={(e) =>
                          updateGoal(g.key, { minute: e.target.value })
                        }
                        className="w-20 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeGoal(g.key)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600"
                        aria-label="Remover gol"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </section>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {game.status === 'REALIZADO' && (
          <button
            type="button"
            onClick={handleClear}
            disabled={saving}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Limpar resultado
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !teamsDefined}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Salvar partida
        </button>
      </div>

      <TeamSidePanel
        title={`Time do ${game.homeTeamName ?? 'mandante'}`}
        view={homeTeamView.data}
        loading={homeTeamView.loading}
        error={homeTeamView.error}
      />
      <TeamSidePanel
        title={`Time do ${game.awayTeamName ?? 'visitante'}`}
        view={awayTeamView.data}
        loading={awayTeamView.loading}
        error={awayTeamView.error}
      />
    </div>
  );
}

function TeamSidePanel({
  title,
  view,
  loading,
  error,
}: {
  title: string;
  view: ChampionshipGameTeamView | null | undefined;
  loading: boolean;
  error: string | null;
}) {
  if (loading) {
    return (
      <section className="bg-slate-50 rounded-xl shadow-sm border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">{title}</h3>
        <LoadingSpinner label="Carregando dados do time..." />
      </section>
    );
  }
  if (error) {
    return (
      <section className="bg-slate-50 rounded-xl shadow-sm border border-slate-200 p-5 space-y-2">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <p className="text-xs text-rose-600">{error}</p>
      </section>
    );
  }
  if (!view) return null;

  const playersById = new Map<string, Player>();
  for (const p of view.players) playersById.set(p.playerId, p);
  const guestsById = new Map<string, GameGuest>();
  for (const g of view.guests) guestsById.set(g.guestId, g);

  const confirmedPlayers = view.confirmedPlayerIds
    .map((id) => playersById.get(id))
    .filter((p): p is Player => Boolean(p))
    .sort(comparePlayers);

  const lineup: GameLineup | null = view.lineup;

  return (
    <section className="bg-slate-50 rounded-xl shadow-sm border border-slate-200 p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <span className="text-[10px] uppercase tracking-wider text-gray-400">
          Somente leitura
        </span>
      </div>

      {view.linkedGameId === null && (
        <p className="text-xs text-gray-500">
          Este time ainda não abriu o jogo. Quando o dono do time fizer isso,
          os jogadores confirmados, convidados e escalação aparecerão aqui.
        </p>
      )}

      {view.linkedGameId !== null && (
        <>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
              Confirmados ({confirmedPlayers.length})
            </p>
            {confirmedPlayers.length === 0 ? (
              <p className="text-xs text-gray-500">
                Nenhum jogador confirmado.
              </p>
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {confirmedPlayers.map((p) => (
                  <li
                    key={p.playerId}
                    className="inline-flex items-center gap-1 rounded-full bg-primary-50 border border-primary-200 px-2 py-0.5 text-xs text-primary-800"
                  >
                    <span className="font-medium">{p.name}</span>
                    {p.number !== undefined && (
                      <span className="text-primary-600/80">#{p.number}</span>
                    )}
                    <span className="text-primary-600/60">
                      · {PLAYER_POSITION_LABELS[p.position]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
              Convidados ({view.guests.length})
            </p>
            {view.guests.length === 0 ? (
              <p className="text-xs text-gray-500">Nenhum convidado.</p>
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {view.guests.map((g) => (
                  <li
                    key={g.guestId}
                    className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs text-amber-800"
                  >
                    <span className="font-medium">{g.name}</span>
                    {g.number !== undefined && (
                      <span>#{g.number}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
              Escalação
            </p>
            {lineup === null || lineup.positions.length === 0 ? (
              <p className="text-xs text-gray-500">
                Sem escalação registrada.
              </p>
            ) : (
              <p className="text-xs text-gray-700">
                Esquema <span className="font-semibold">{lineup.scheme}</span> ·{' '}
                {lineup.positions.length} jogadores escalados
                {lineup.positions.length > 0 && (
                  <>
                    : {lineup.positions
                      .map(
                        (pos) =>
                          playersById.get(pos.playerId)?.name ??
                          guestsById.get(pos.playerId)?.name ??
                          '—',
                      )
                      .filter(Boolean)
                      .join(', ')}
                  </>
                )}
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
