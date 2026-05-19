import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  Trash2,
  Trophy,
  Users as UsersIcon,
} from 'lucide-react';
import { api, ApiError } from '../services/api';
import { useApi } from '../hooks/useApi';
import TeamLogo from '../components/TeamLogo';
import StandingsTable from '../components/championships/StandingsTable';
import BracketView from '../components/championships/BracketView';
import GamesList from '../components/championships/GamesList';
import type {
  Championship,
  ChampionshipFormat,
} from '../types';

const FORMAT_LABEL: Record<ChampionshipFormat, string> = {
  PONTOS_CORRIDOS: 'Pontos corridos',
  MATA_MATA: 'Mata-mata',
  COPA: 'Copa (grupos + mata-mata)',
};

type Tab = 'TIMES' | 'JOGOS' | 'CLASSIFICACAO' | 'CHAVEAMENTO';

const tabsFor = (format: ChampionshipFormat): Tab[] => {
  if (format === 'PONTOS_CORRIDOS') return ['TIMES', 'JOGOS', 'CLASSIFICACAO'];
  if (format === 'MATA_MATA') return ['TIMES', 'JOGOS', 'CHAVEAMENTO'];
  return ['TIMES', 'JOGOS', 'CLASSIFICACAO', 'CHAVEAMENTO'];
};

const TAB_LABEL: Record<Tab, string> = {
  TIMES: 'Times',
  JOGOS: 'Jogos',
  CLASSIFICACAO: 'Classificação',
  CHAVEAMENTO: 'Chaveamento',
};

export default function ChampionshipDetail() {
  const { championshipId } = useParams<{ championshipId: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('JOGOS');
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const query = useApi<Championship>(
    () => api.getChampionship(championshipId!),
    [championshipId],
  );

  const championship = query.data;

  const availableTabs = useMemo(
    () => (championship ? tabsFor(championship.format) : []),
    [championship],
  );

  const handleDelete = async () => {
    if (!championship) return;
    if (
      !window.confirm(
        `Excluir o campeonato "${championship.name}"? Esta ação não pode ser desfeita.`,
      )
    )
      return;
    setDeleting(true);
    setActionError(null);
    try {
      await api.deleteChampionship(championship.championshipId);
      navigate('/campeonatos');
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : 'Erro ao excluir',
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleGameUpdated = () => {
    query.refetch();
  };

  if (query.loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Carregando…
      </div>
    );
  }

  if (query.error || !championship) {
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
          {query.error ?? 'Campeonato não encontrado.'}
        </p>
      </div>
    );
  }

  const validTabs = availableTabs.includes(tab) ? tab : availableTabs[0];

  return (
    <div className="space-y-5">
      <Link
        to="/campeonatos"
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Campeonatos
      </Link>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
            <Trophy className="w-6 h-6 text-primary-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900 truncate">
              {championship.name}
            </h2>
            <p className="text-sm text-gray-500">
              {FORMAT_LABEL[championship.format]} ·{' '}
              {championship.participants.length} times
            </p>
            {!championship.viewerIsCreator && (
              <p className="mt-1 text-xs text-gray-500">
                Visualização do campeonato (somente o criador edita os dados das
                partidas).
              </p>
            )}
          </div>
          {championship.viewerIsCreator && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 text-rose-600 px-2.5 py-1.5 text-xs font-medium hover:bg-rose-50 disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Excluir
            </button>
          )}
        </div>
        {actionError && (
          <p className="mt-3 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            {actionError}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1 border-b border-gray-200">
        {availableTabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
              validTabs === t
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>

      {validTabs === 'TIMES' && (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {championship.participants.map((p) => (
            <li
              key={p.teamId}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                p.isMine
                  ? 'border-primary-200 bg-primary-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <TeamLogo name={p.teamName} logoUrl={p.logoUrl} size={28} />
              <span className="text-sm font-medium text-gray-900 truncate flex-1">
                {p.teamName}
              </span>
              {p.isMine && (
                <span className="text-[10px] rounded-full bg-primary-100 text-primary-700 px-1.5 py-0.5 uppercase">
                  seu
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {validTabs === 'JOGOS' && (
        <GamesList
          championship={championship}
          onUpdated={handleGameUpdated}
        />
      )}

      {validTabs === 'CLASSIFICACAO' && (
        <StandingsTable championship={championship} />
      )}

      {validTabs === 'CHAVEAMENTO' && (
        <BracketView championship={championship} />
      )}

      <div className="text-xs text-gray-400 flex items-center gap-1">
        <UsersIcon className="w-3 h-3" />
        {championship.participants.length} participantes ·{' '}
        {championship.games.length} jogos
      </div>
    </div>
  );
}
