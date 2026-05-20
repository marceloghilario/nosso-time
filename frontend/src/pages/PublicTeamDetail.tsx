import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Camera, Users } from 'lucide-react';
import { api, ApiError } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import PlayerList from '../components/PlayerList';
import GameList from '../components/GameList';
import PhotoGallery from '../components/PhotoGallery';
import TeamHero from '../components/TeamHero';
import TabBar, { type TabItem } from '../components/TabBar';
import TeamQuickStats from '../components/TeamQuickStats';
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
    <div className="space-y-4 sm:space-y-5">
      <Link
        to="/explorar"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-600 bg-white ring-1 ring-slate-200/80 shadow-sm hover:text-slate-900 hover:bg-slate-50 transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
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
          <TeamHero
            name={state.data.team.name}
            logoUrl={state.data.team.logoUrl}
            description={state.data.team.description}
            readOnly
            playerCount={
              state.data.team.playerCount ?? state.data.players.length
            }
            gameCount={state.data.team.gameCount ?? state.data.games.length}
            photoCount={
              state.data.team.photoCount ?? state.data.media.length
            }
            championshipCount={state.data.team.championshipCount}
          />

          {state.data.games.length > 0 && (
            <TeamQuickStats games={state.data.games} />
          )}

          {(() => {
            const tabItems: TabItem<Tab>[] = [
              {
                id: 'players',
                label: 'Jogadores',
                icon: <Users className="w-4 h-4" />,
                count: state.data.players.length,
              },
              {
                id: 'games',
                label: 'Jogos',
                icon: <Calendar className="w-4 h-4" />,
                count: state.data.games.length,
              },
              {
                id: 'gallery',
                label: 'Galeria',
                icon: <Camera className="w-4 h-4" />,
                count: state.data.media.length,
              },
            ];
            return (
              <TabBar items={tabItems} value={tab} onChange={setTab} />
            );
          })()}

          <div className="space-y-3">
            {tab === 'players' && (
              <PlayerList
                players={state.data.players as unknown as Player[]}
              />
            )}
            {tab === 'games' && (
              <GameList
                teamId={teamId}
                games={state.data.games as unknown as Game[]}
                readOnly
              />
            )}
            {tab === 'gallery' && (
              <PhotoGallery media={state.data.media as unknown as Media[]} />
            )}
          </div>
        </>
      )}
    </div>
  );
}


