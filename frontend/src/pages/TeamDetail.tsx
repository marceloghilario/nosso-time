import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Camera, LayoutGrid, Plus, Users } from 'lucide-react';
import { api } from '../services/api';
import { useApi } from '../hooks/useApi';
import LoadingSpinner from '../components/LoadingSpinner';
import PlayerList from '../components/PlayerList';
import GameList from '../components/GameList';
import PhotoGallery from '../components/PhotoGallery';
import TeamLogoUploader from '../components/TeamLogoUploader';
import type { Team } from '../types';

type Tab = 'players' | 'games' | 'gallery';

export default function TeamDetail() {
  const { teamId = '' } = useParams<{ teamId: string }>();
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 min-w-0">
                <TeamLogoUploader
                  team={team}
                  size={80}
                  onChange={handleTeamUpdated}
                />
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-gray-900 truncate">{team.name}</h2>
                  {team.description && (
                    <p className="text-sm text-gray-500 mt-1">{team.description}</p>
                  )}
                </div>
              </div>
              <span
                className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                  team.plan === 'PRO'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                Plano {team.plan}
              </span>
            </div>
            <div className="mt-4">
              <Link
                to={`/teams/${teamId}/tatica`}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
              >
                <LayoutGrid className="w-4 h-4" />
                Montagem tática
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex border-b border-gray-100">
              <TabButton
                active={tab === 'players'}
                onClick={() => setTab('players')}
                icon={<Users className="w-4 h-4" />}
                label="Jogadores"
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
