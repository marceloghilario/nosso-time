import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Camera, LayoutGrid, Users } from 'lucide-react';
import { DndContext } from '@dnd-kit/core';
import { api, ApiError } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import PlayerList from '../components/PlayerList';
import GameList from '../components/GameList';
import PhotoGallery from '../components/PhotoGallery';
import TeamHero from '../components/TeamHero';
import TabBar, { type TabItem } from '../components/TabBar';
import TeamQuickStats from '../components/TeamQuickStats';
import TeamFollowActions from '../components/TeamFollowActions';
import { TacticalBoard } from '../components/tactical/TacticalBoard';
import PlayerMarker from '../components/tactical/PlayerMarker';
import type {
  Game,
  Media,
  Player,
  PublicTeamDetail as PublicTeamDetailData,
} from '../types';

type Tab = 'players' | 'games' | 'gallery' | 'tatica';

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

  const load = useCallback(
    (signal?: { cancelled: boolean }) => {
      api
        .getPublicTeam(teamId)
        .then((detail) => {
          if (signal?.cancelled) return;
          if (detail.myRole === 'OWNER' || detail.myRole === 'ADMIN') {
            setState({ status: 'redirected' });
            navigate(`/teams/${teamId}`, { replace: true });
            return;
          }
          setState({ status: 'success', data: detail });
        })
        .catch((err: unknown) => {
          if (signal?.cancelled) return;
          const message =
            err instanceof ApiError ? err.message : 'Erro ao carregar o time';
          setState({ status: 'error', error: message });
        });
    },
    [teamId, navigate],
  );

  useEffect(() => {
    const signal = { cancelled: false };
    load(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [load]);

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
            myRole={state.data.myRole ?? null}
            playerCount={
              state.data.team.playerCount ?? state.data.players.length
            }
            gameCount={state.data.team.gameCount ?? state.data.games.length}
            photoCount={
              state.data.team.photoCount ?? state.data.media.length
            }
            championshipCount={state.data.team.championshipCount}
          />

          <TeamFollowActions
            teamId={teamId}
            myRole={state.data.myRole ?? null}
            pendingAdminRequest={state.data.pendingAdminRequest ?? null}
            onChanged={() => load()}
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
              ...(state.data.primaryFormation
                ? [
                    {
                      id: 'tatica' as const,
                      label: 'Tática',
                      icon: <LayoutGrid className="w-4 h-4" />,
                    },
                  ]
                : []),
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
            {tab === 'tatica' && state.data.primaryFormation && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-800">
                    Formação Principal
                  </h3>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                    {state.data.primaryFormation.name} · {state.data.primaryFormation.scheme}
                  </span>
                </div>
                <DndContext>
                  <TacticalBoard modality={state.data.team.modality} droppableId="public-primary">
                    {state.data.primaryFormation.playerPositions.map((pos) => (
                      <PlayerMarker
                        key={pos.playerId}
                        position={pos}
                        interactive={false}
                      />
                    ))}
                  </TacticalBoard>
                </DndContext>
              </div>
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


