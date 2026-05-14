import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Camera, Eye, Users } from 'lucide-react';
import { api, ApiError } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import PlayerList from '../components/PlayerList';
import GameList from '../components/GameList';
import PhotoGallery from '../components/PhotoGallery';
import TeamLogo from '../components/TeamLogo';
import type {
  Game,
  Media,
  Player,
  PublicTeamDetail as PublicTeamDetailData,
} from '../types';

type Tab = 'players' | 'games' | 'gallery';

type RequestState =
  | { status: 'loading' }
  | { status: 'success'; data: PublicTeamDetailData }
  | { status: 'error'; error: string }
  | { status: 'redirected' };

export default function PublicTeamDetail() {
  const { teamId = '' } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<RequestState>({ status: 'loading' });
  const [tab, setTab] = useState<Tab>('players');

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      api.getPublicTeam(teamId),
      api.listTeams().catch(() => []),
    ])
      .then(([detail, myTeams]) => {
        if (cancelled) return;
        const isOwner = myTeams.some((t) => t.teamId === teamId);
        if (isOwner) {
          setState({ status: 'redirected' });
          navigate(`/teams/${teamId}`, { replace: true });
          return;
        }
        setState({ status: 'success', data: detail });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof ApiError ? err.message : 'Erro ao carregar o time';
        setState({ status: 'error', error: message });
      });

    return () => {
      cancelled = true;
    };
  }, [teamId, navigate]);

  return (
    <div className="space-y-5">
      <Link
        to="/explorar"
        className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Explorar
      </Link>

      {state.status === 'loading' && <LoadingSpinner label="Carregando time..." />}
      {state.status === 'error' && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </div>
      )}

      {state.status === 'success' && (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 min-w-0">
                <TeamLogo
                  name={state.data.team.name}
                  logoUrl={state.data.team.logoUrl}
                  size={80}
                />
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-gray-900 truncate">
                    {state.data.team.name}
                  </h2>
                  {state.data.team.description && (
                    <p className="text-sm text-gray-500 mt-1">
                      {state.data.team.description}
                    </p>
                  )}
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 whitespace-nowrap">
                <Eye className="w-3 h-3" />
                Somente leitura
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex border-b border-gray-100">
              <TabButton
                active={tab === 'players'}
                onClick={() => setTab('players')}
                icon={<Users className="w-4 h-4" />}
                label={`Jogadores (${state.data.players.length})`}
              />
              <TabButton
                active={tab === 'games'}
                onClick={() => setTab('games')}
                icon={<Calendar className="w-4 h-4" />}
                label={`Jogos (${state.data.games.length})`}
              />
              <TabButton
                active={tab === 'gallery'}
                onClick={() => setTab('gallery')}
                icon={<Camera className="w-4 h-4" />}
                label={`Galeria (${state.data.media.length})`}
              />
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              {tab === 'players' && (
                <PlayerList
                  players={state.data.players as unknown as Player[]}
                />
              )}
              {tab === 'games' && (
                <GameList games={state.data.games as unknown as Game[]} />
              )}
              {tab === 'gallery' && (
                <PhotoGallery media={state.data.media as unknown as Media[]} />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
        active
          ? 'text-primary-700 border-b-2 border-primary-600 bg-primary-50/40'
          : 'text-gray-500 hover:text-gray-800'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
