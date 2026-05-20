import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Camera, LayoutGrid, Plus, Users } from 'lucide-react';
import { api } from '../services/api';
import { useApi } from '../hooks/useApi';
import LoadingSpinner from '../components/LoadingSpinner';
import PlayerList from '../components/PlayerList';
import GameList from '../components/GameList';
import PhotoGallery from '../components/PhotoGallery';
import TeamLogoUploader from '../components/TeamLogoUploader';
import TeamHero from '../components/TeamHero';
import type { Team } from '../types';

type Tab = 'players' | 'games' | 'gallery';

export default function TeamDetail() {
  const { teamId = '' } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('players');

  const teamReq = useApi(() => api.getTeam(teamId), [teamId]);
  const playersReq = useApi(() => api.listPlayers(teamId), [teamId]);
  const gamesReq = useApi(() => api.listGames(teamId), [teamId]);
  const mediaReq = useApi(() => api.listMediaByTeam(teamId), [teamId]);

  const [overrideState, setOverrideState] = useState<{
    teamId: string;
    team: Team;
  } | null>(null);
  const teamOverride =
    overrideState && overrideState.teamId === teamId ? overrideState.team : null;
  const handleTeamUpdated = (updated: Team): void => {
    setOverrideState({ teamId, team: updated });
  };
  const team = teamOverride ?? teamReq.data;

  return (
    <div className="space-y-5">
      <Link
        to="/teams"
        className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Meus times
      </Link>

      {teamReq.loading && <LoadingSpinner label="Carregando time..." />}
      {teamReq.error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {teamReq.error}
        </div>
      )}

      {team && (
        <>
          <TeamHero
            name={team.name}
            logoUrl={team.logoUrl}
            description={team.description}
            planLabel={`Plano ${team.plan}`}
            isPro={team.plan === 'PRO'}
            playerCount={team.playerCount ?? playersReq.data?.length}
            gameCount={team.gameCount ?? gamesReq.data?.length}
            photoCount={team.photoCount ?? mediaReq.data?.length}
            championshipCount={team.championshipCount}
            logoSlot={
              <TeamLogoUploader
                team={team}
                size={88}
                onChange={handleTeamUpdated}
              />
            }
          />

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex border-b border-gray-100">
              <TabButton
                active={tab === 'players'}
                onClick={() => setTab('players')}
                icon={<Users className="w-4 h-4" />}
                label="Jogadores"
              />
              <TabButton
                active={false}
                onClick={() => navigate(`/teams/${teamId}/tatica`)}
                icon={<LayoutGrid className="w-4 h-4" />}
                label="Campo"
              />
              <TabButton
                active={tab === 'games'}
                onClick={() => setTab('games')}
                icon={<Calendar className="w-4 h-4" />}
                label="Jogos"
              />
              <TabButton
                active={tab === 'gallery'}
                onClick={() => setTab('gallery')}
                icon={<Camera className="w-4 h-4" />}
                label="Galeria"
              />
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              {tab === 'players' && (
                <>
                  <ActionRow
                    to={`/teams/${teamId}/jogadores/novo`}
                    label="Adicionar jogador"
                  />
                  {playersReq.loading && <LoadingSpinner label="Carregando jogadores..." />}
                  {playersReq.error && (
                    <ErrorBox message={playersReq.error} />
                  )}
                  {playersReq.data && <PlayerList players={playersReq.data} />}
                </>
              )}
              {tab === 'games' && (
                <>
                  <ActionRow
                    to={`/teams/${teamId}/jogos/novo`}
                    label="Adicionar jogo"
                  />
                  {gamesReq.loading && <LoadingSpinner label="Carregando jogos..." />}
                  {gamesReq.error && <ErrorBox message={gamesReq.error} />}
                  {gamesReq.data && (
                    <GameList teamId={teamId} games={gamesReq.data} />
                  )}
                </>
              )}
              {tab === 'gallery' && (
                <>
                  <ActionRow
                    to={`/teams/${teamId}/upload`}
                    label="Enviar foto"
                  />
                  {mediaReq.loading && <LoadingSpinner label="Carregando fotos..." />}
                  {mediaReq.error && <ErrorBox message={mediaReq.error} />}
                  {mediaReq.data && <PhotoGallery media={mediaReq.data} />}
                </>
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

function ActionRow({ to, label }: { to: string; label: string }) {
  return (
    <div className="flex justify-end">
      <Link
        to={to}
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 transition-colors"
      >
        <Plus className="w-4 h-4" />
        {label}
      </Link>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      {message}
    </div>
  );
}
