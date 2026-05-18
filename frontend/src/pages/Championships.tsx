import { Link } from 'react-router-dom';
import { Plus, Trophy, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { useApi } from '../hooks/useApi';
import type { Championship, ChampionshipFormat } from '../types';

const FORMAT_LABEL: Record<ChampionshipFormat, string> = {
  PONTOS_CORRIDOS: 'Pontos corridos',
  MATA_MATA: 'Mata-mata',
  COPA: 'Copa (grupos + mata-mata)',
};

const STATUS_LABEL: Record<Championship['status'], string> = {
  EM_ANDAMENTO: 'Em andamento',
  FINALIZADO: 'Finalizado',
};

export default function ChampionshipsPage() {
  const { data, loading, error } = useApi<Championship[]>(() =>
    api.listChampionships(),
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-primary-600" />
            Meus campeonatos
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">
            Crie torneios entre seus times e outros times cadastrados.
          </p>
        </div>
        <Link
          to="/campeonatos/novo"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus className="w-4 h-4" />
          Novo campeonato
        </Link>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Carregando…
        </div>
      )}

      {error && (
        <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {data && data.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
          <Trophy className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-700 font-medium">
            Você ainda não criou nenhum campeonato.
          </p>
          <p className="text-gray-500 text-sm mt-1">
            Use <span className="font-semibold">"Novo campeonato"</span> para
            montar seu primeiro torneio.
          </p>
        </div>
      )}

      {data && data.length > 0 && (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data.map((c) => (
            <li key={c.championshipId}>
              <Link
                to={`/campeonatos/${c.championshipId}`}
                className="block bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                    <Trophy className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {c.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {FORMAT_LABEL[c.format]}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5">
                        {c.participants.length} times
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
                          c.status === 'EM_ANDAMENTO'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {STATUS_LABEL[c.status]}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
