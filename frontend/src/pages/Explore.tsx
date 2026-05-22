import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Compass, Loader2 } from 'lucide-react';
import { api, ApiError } from '../services/api';
import TeamLogo from '../components/TeamLogo';
import type { PublicTeamSummary } from '../types';

type RequestState =
  | { status: 'loading' }
  | { status: 'success'; data: PublicTeamSummary[] }
  | { status: 'error'; error: string };

export default function Explore() {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [state, setState] = useState<RequestState>({ status: 'loading' });

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(query), 250);
    return () => window.clearTimeout(id);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    api
      .searchPublicTeams(debounced)
      .then((data) => {
        if (cancelled) return;
        setState({ status: 'success', data });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof ApiError ? err.message : 'Erro ao buscar times';
        setState({ status: 'error', error: message });
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Compass className="w-6 h-6 text-primary-600" />
            Explorar times
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">
            Pesquise e veja informações de times criados por outros usuários
            (somente leitura).
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome do time..."
          className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {state.status === 'error' && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </div>
      )}

      {state.status === 'loading' && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Buscando times...
        </div>
      )}

      {state.status === 'success' &&
        (state.data.length === 0 ? (
          <div className="bg-slate-50 rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="w-14 h-14 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Search className="w-7 h-7 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Nenhum time encontrado
            </h3>
            <p className="text-gray-500 mt-1">
              {debounced
                ? 'Tente outro termo de busca.'
                : 'Ainda não há times cadastrados.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {state.data.map((team) => (
              <Link
                key={team.teamId}
                to={`/explorar/${team.teamId}`}
                className="group bg-slate-50 rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md hover:border-primary-200 transition"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <TeamLogo
                    name={team.name}
                    logoUrl={team.logoUrl}
                    size={48}
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 group-hover:text-primary-700 truncate">
                      {team.name}
                    </h3>
                    {team.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {team.description}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-gray-500">
                      {team.photoCount} foto
                      {team.photoCount === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ))}
    </div>
  );
}
