import { useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  Plus,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import { api, ApiError } from '../services/api';
import { useApi } from '../hooks/useApi';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import PhotoGallery from '../components/PhotoGallery';
import type { GameGoal, GameStatus, Player } from '../types';
import { GAME_STATUS_LABELS } from '../utils/constants';

interface GoalDraft {
  key: string;
  playerId: string;
  minute: string;
}

const newGoalKey = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const toDraft = (g: GameGoal): GoalDraft => ({
  key: newGoalKey(),
  playerId: g.playerId,
  minute: g.minute !== undefined ? String(g.minute) : '',
});

export default function GameDetail() {
  const { teamId = '', gameId = '' } = useParams<{
    teamId: string;
    gameId: string;
  }>();
  const { showSuccess, showError } = useToast();

  const gameReq = useApi(() => api.getGame(teamId, gameId), [teamId, gameId]);
  const playersReq = useApi(() => api.listPlayers(teamId), [teamId]);
  const mediaReq = useApi(
    () => api.listMediaByGame(teamId, gameId),
    [teamId, gameId],
  );

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [opponent, setOpponent] = useState('');
  const [status, setStatus] = useState<GameStatus>('AGENDADO');
  const [scoreFor, setScoreFor] = useState('');
  const [scoreAgainst, setScoreAgainst] = useState('');
  const [goals, setGoals] = useState<GoalDraft[]>([]);
  const [saving, setSaving] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  const game = gameReq.data;
  const players = useMemo<Player[]>(
    () => playersReq.data ?? [],
    [playersReq.data],
  );

  const gameSnapshotKey = game ? `${game.gameId}:${game.updatedAt}` : null;
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);
  if (game && gameSnapshotKey && gameSnapshotKey !== hydratedFor) {
    setHydratedFor(gameSnapshotKey);
    setDate(game.date);
    setTime(game.time);
    setLocation(game.location);
    setOpponent(game.opponent);
    setStatus(game.status);
    setScoreFor(
      game.result?.scoreFor !== undefined ? String(game.result.scoreFor) : '',
    );
    setScoreAgainst(
      game.result?.scoreAgainst !== undefined
        ? String(game.result.scoreAgainst)
        : '',
    );
    setGoals((game.goals ?? []).map(toDraft));
  }

  const handleScoreChange = (
    setter: (value: string) => void,
    value: string,
  ) => {
    setter(value);
    if (value !== '' && status !== 'REALIZADO') {
      setStatus('REALIZADO');
    }
  };

  const addGoal = () => {
    setGoals((prev) => [
      ...prev,
      { key: newGoalKey(), playerId: players[0]?.playerId ?? '', minute: '' },
    ]);
  };

  const updateGoal = (key: string, patch: Partial<Omit<GoalDraft, 'key'>>) => {
    setGoals((prev) =>
      prev.map((g) => (g.key === key ? { ...g, ...patch } : g)),
    );
  };

  const removeGoal = (key: string) => {
    setGoals((prev) => prev.filter((g) => g.key !== key));
  };

  const parsedScoreFor = scoreFor === '' ? null : Number.parseInt(scoreFor, 10);
  const parsedScoreAgainst =
    scoreAgainst === '' ? null : Number.parseInt(scoreAgainst, 10);

  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    try {
      const effectiveStatus: GameStatus =
        status === 'REALIZADO' ||
        parsedScoreFor !== null ||
        parsedScoreAgainst !== null
          ? 'REALIZADO'
          : 'AGENDADO';

      let result:
        | { scoreFor: number; scoreAgainst: number }
        | undefined;
      if (effectiveStatus === 'REALIZADO') {
        const sf = parsedScoreFor ?? 0;
        const sa = parsedScoreAgainst ?? 0;
        if (Number.isNaN(sf) || Number.isNaN(sa) || sf < 0 || sa < 0) {
          showError('Informe um placar válido');
          setSaving(false);
          return;
        }
        result = { scoreFor: sf, scoreAgainst: sa };
      }

      const payloadGoals =
        effectiveStatus === 'REALIZADO'
          ? goals
              .filter((g) => g.playerId)
              .map((g) => {
                const minuteNum = g.minute ? Number.parseInt(g.minute, 10) : NaN;
                return {
                  playerId: g.playerId,
                  minute: Number.isFinite(minuteNum) ? minuteNum : undefined,
                };
              })
          : undefined;

      await api.updateGame(teamId, gameId, {
        date,
        time,
        location,
        opponent,
        status: effectiveStatus,
        result,
        goals: payloadGoals,
      });
      showSuccess('Jogo atualizado');
      gameReq.refetch();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Erro ao salvar jogo');
    } finally {
      setSaving(false);
    }
  };

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
  };

  const handleUpload = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    try {
      const contentType = file.type || 'image/jpeg';
      const { uploadUrl, s3Key } = await api.getMediaUploadUrl(teamId, {
        contentType,
        fileName: file.name,
        type: 'PHOTO',
      });
      await api.uploadToS3(uploadUrl, file, contentType);
      await api.createMedia(teamId, {
        s3Key,
        contentType,
        type: 'PHOTO',
        gameId,
        caption: caption.trim() || undefined,
      });
      showSuccess('Foto enviada');
      setFile(null);
      setCaption('');
      mediaReq.refetch();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Erro ao enviar foto');
    } finally {
      setUploading(false);
    }
  };

  const formattedDate = (d: string, t: string): string => {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y} às ${t}`;
  };

  const goalCountForScore = goals.filter((g) => g.playerId).length;
  const scoreForFinal = parsedScoreFor ?? 0;
  const goalsExceedScore =
    status === 'REALIZADO' && goalCountForScore > scoreForFinal;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <Link
        to={`/teams/${teamId}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar ao time
      </Link>

      {gameReq.loading && <LoadingSpinner label="Carregando jogo..." />}
      {gameReq.error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {gameReq.error}
        </div>
      )}

      {game && (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-gray-900 truncate">
                  vs {game.opponent}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {formattedDate(game.date, game.time)} · {game.location}
                </p>
              </div>
              <span
                className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                  status === 'REALIZADO'
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {GAME_STATUS_LABELS[status]}
              </span>
            </div>
          </div>

          <form
            onSubmit={handleSave}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-5"
          >
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Placar
              </h3>
              <div className="flex items-center justify-center gap-3 sm:gap-5">
                <div className="text-center">
                  <p className="text-[11px] font-medium text-gray-500 mb-1 truncate max-w-[8rem] sm:max-w-[12rem]">
                    Meu time
                  </p>
                  <input
                    type="number"
                    min={0}
                    max={99}
                    inputMode="numeric"
                    placeholder="—"
                    value={scoreFor}
                    onChange={(e) =>
                      handleScoreChange(setScoreFor, e.target.value)
                    }
                    className="w-20 sm:w-24 rounded-lg border border-gray-200 bg-white px-2 py-3 text-center text-3xl font-extrabold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <span className="text-2xl font-bold text-gray-300 self-end pb-3">
                  x
                </span>
                <div className="text-center">
                  <p className="text-[11px] font-medium text-gray-500 mb-1 truncate max-w-[8rem] sm:max-w-[12rem]">
                    {game.opponent}
                  </p>
                  <input
                    type="number"
                    min={0}
                    max={99}
                    inputMode="numeric"
                    placeholder="—"
                    value={scoreAgainst}
                    onChange={(e) =>
                      handleScoreChange(setScoreAgainst, e.target.value)
                    }
                    className="w-20 sm:w-24 rounded-lg border border-gray-200 bg-white px-2 py-3 text-center text-3xl font-extrabold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <p className="text-[11px] text-center text-gray-400">
                Ao preencher o placar, o jogo é marcado como{' '}
                <span className="font-semibold">Realizado</span>{' '}
                automaticamente.
              </p>
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Autores dos gols
                </h3>
                <button
                  type="button"
                  onClick={addGoal}
                  disabled={players.length === 0}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <Plus className="w-3 h-3" />
                  Adicionar gol
                </button>
              </div>
              {players.length === 0 && (
                <p className="text-xs text-gray-500">
                  Cadastre jogadores no time para registrar autores de gols.
                </p>
              )}
              {goals.length === 0 && players.length > 0 && (
                <p className="text-xs text-gray-500">
                  Nenhum autor registrado. Gols sem autor (ex.: gol contra)
                  podem ficar só no placar acima.
                </p>
              )}
              <ul className="space-y-2">
                {goals.map((g) => (
                  <li
                    key={g.key}
                    className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2"
                  >
                    <select
                      value={g.playerId}
                      onChange={(e) =>
                        updateGoal(g.key, { playerId: e.target.value })
                      }
                      className="flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="" disabled>
                        Selecione um jogador
                      </option>
                      {players.map((p) => (
                        <option key={p.playerId} value={p.playerId}>
                          {p.number !== undefined ? `#${p.number} ` : ''}
                          {p.name}
                        </option>
                      ))}
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
              {goalsExceedScore && (
                <p className="text-xs text-rose-600">
                  Há mais autores ({goalCountForScore}) do que gols do time (
                  {scoreForFinal}). Ajuste o placar ou remova autores antes de
                  salvar.
                </p>
              )}
            </section>

            <section className="space-y-3 border-t border-gray-100 pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Dados do jogo
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Data</span>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">
                    Horário
                  </span>
                  <input
                    type="time"
                    required
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
                  required
                  maxLength={200}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  Adversário
                </span>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={opponent}
                  onChange={(e) => setOpponent(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  Status
                </span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as GameStatus)}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="AGENDADO">Agendado</option>
                  <option value="REALIZADO">Realizado</option>
                </select>
              </label>
            </section>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Salvando…' : 'Salvar jogo'}
              </button>
            </div>
          </form>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-1.5">
                <Camera className="w-4 h-4" />
                Fotos do jogo
              </h3>
            </div>

            <form
              onSubmit={handleUpload}
              className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-3 space-y-3"
            >
              <label className="block">
                <span className="text-xs font-medium text-gray-700">
                  Arquivo
                </span>
                <input
                  type="file"
                  accept="image/*"
                  required
                  onChange={handleFile}
                  className="mt-1 block w-full text-sm text-gray-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-700">
                  Legenda (opcional)
                </span>
                <input
                  type="text"
                  maxLength={500}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </label>
              <button
                type="submit"
                disabled={uploading || !file}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
              >
                {uploading ? (
                  <LoadingSpinner className="text-white" />
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Enviar foto
                  </>
                )}
              </button>
            </form>

            {mediaReq.loading && <LoadingSpinner label="Carregando fotos..." />}
            {mediaReq.error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {mediaReq.error}
              </div>
            )}
            {mediaReq.data && <PhotoGallery media={mediaReq.data} />}
          </div>
        </>
      )}
    </div>
  );
}
