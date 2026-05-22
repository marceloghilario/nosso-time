import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, ShieldCheck, UserMinus, Users } from 'lucide-react';
import { api, ApiError } from '../services/api';
import { useApi } from '../hooks/useApi';
import LoadingSpinner from '../components/LoadingSpinner';
import TeamLogo from '../components/TeamLogo';
import RoleBadge from '../components/RoleBadge';
import type { FollowedTeam, Team } from '../types';

export default function Teams() {
  const managedQuery = useApi(() => api.listTeams());
  const followedQuery = useApi(() => api.listFollowedTeams());

  const managed = managedQuery.data ?? [];
  const followed = followedQuery.data ?? [];

  const loading = managedQuery.loading || followedQuery.loading;
  const error = managedQuery.error ?? followedQuery.error;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Meus times</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            Gerencie seus times, jogadores, jogos e fotos.
          </p>
        </div>
        <Link
          to="/teams/novo"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Novo time
        </Link>
      </div>

      {loading && <LoadingSpinner label="Carregando seus times..." />}
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {!loading && !error && (
        <ManagedTeams teams={managed} />
      )}

      {!loading && !error && (
        <FollowedTeams
          teams={followed}
          onChange={() => followedQuery.refetch()}
        />
      )}
    </div>
  );
}

function ManagedTeams({ teams }: { teams: Team[] }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-slate-500" />
        <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-500">
          Times que eu gerencio
        </h3>
        <span className="text-xs text-slate-400">{teams.length}</span>
      </div>
      {teams.length === 0 ? (
        <div className="bg-slate-50 rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-12 text-center">
          <div className="w-14 h-14 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <Users className="w-7 h-7 text-primary-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Nenhum time ainda</h3>
          <p className="text-gray-500 mt-1 mb-4">
            Crie seu próprio time ou peça permissão de admin em um time que você acompanha.
          </p>
          <Link
            to="/teams/novo"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Criar time
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {teams.map((team) => (
            <Link
              key={team.teamId}
              to={`/teams/${team.teamId}`}
              className="group bg-slate-50 rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-5 hover:shadow-md hover:ring-primary-300 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <TeamLogo
                    name={team.name}
                    logoUrl={team.logoUrl}
                    size={48}
                  />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 group-hover:text-primary-700 truncate">
                      {team.name}
                    </h3>
                    {team.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {team.description}
                      </p>
                    )}
                  </div>
                </div>
                {team.myRole && <RoleBadge role={team.myRole} />}
              </div>
              <p className="mt-4 text-xs text-gray-500">
                {team.photoCount} foto{team.photoCount === 1 ? '' : 's'}
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function FollowedTeams({
  teams,
  onChange,
}: {
  teams: FollowedTeam[];
  onChange: () => void;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleUnfollow = useCallback(
    async (teamId: string) => {
      setErrorMsg(null);
      setPendingId(teamId);
      try {
        await api.unfollowTeam(teamId);
        onChange();
      } catch (err) {
        setErrorMsg(
          err instanceof ApiError
            ? err.message
            : 'Não foi possível deixar de seguir o time.',
        );
      } finally {
        setPendingId(null);
      }
    },
    [onChange],
  );

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Search className="w-4 h-4 text-slate-500" />
        <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-500">
          Seguindo
        </h3>
        <span className="text-xs text-slate-400">{teams.length}</span>
      </div>
      {errorMsg && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMsg}
        </div>
      )}
      {teams.length === 0 ? (
        <div className="bg-slate-50 rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6 text-center">
          <p className="text-sm text-slate-500">
            Você ainda não segue nenhum time.{' '}
            <Link to="/explorar" className="text-primary-600 font-medium hover:underline">
              Explorar times
            </Link>
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {teams.map((team) => (
            <div
              key={team.teamId}
              className="group bg-slate-50 rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-4 hover:shadow-md hover:ring-primary-300 transition"
            >
              <div className="flex items-start gap-3">
                <Link
                  to={`/explorar/${team.teamId}`}
                  className="flex items-start gap-3 min-w-0 flex-1"
                >
                  <TeamLogo
                    name={team.name}
                    logoUrl={team.logoUrl}
                    size={44}
                  />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 group-hover:text-primary-700 truncate">
                      {team.name}
                    </h3>
                    {team.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {team.description}
                      </p>
                    )}
                    <div className="mt-2">
                      <RoleBadge role="FOLLOWER" />
                    </div>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => handleUnfollow(team.teamId)}
                  disabled={pendingId === team.teamId}
                  title="Deixar de seguir"
                  className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-rose-600 disabled:opacity-50 px-2 py-1 rounded-md hover:bg-rose-50 transition"
                >
                  <UserMinus className="w-3.5 h-3.5" />
                  Deixar de seguir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
