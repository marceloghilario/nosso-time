import { Link } from 'react-router-dom';
import { Plus, ShieldCheck, Users } from 'lucide-react';
import { api } from '../services/api';
import { useApi } from '../hooks/useApi';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Teams() {
  const { data, loading, error } = useApi(() => api.listTeams());

  return (
    <div className="space-y-5">
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

      {!loading && !error && data && (
        <>
          {data.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <div className="w-14 h-14 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="w-7 h-7 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Nenhum time ainda</h3>
              <p className="text-gray-500 mt-1 mb-4">
                Comece criando seu primeiro time.
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
              {data.map((team) => (
                <Link
                  key={team.teamId}
                  to={`/teams/${team.teamId}`}
                  className="group bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-primary-200 transition"
                >
                  <div className="flex items-start justify-between gap-3">
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
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        team.plan === 'PRO'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <ShieldCheck className="w-3 h-3" />
                      {team.plan}
                    </span>
                  </div>
                  <p className="mt-4 text-xs text-gray-500">
                    {team.photoCount} foto{team.photoCount === 1 ? '' : 's'}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
