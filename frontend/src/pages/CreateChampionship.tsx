import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Search, Trophy, X } from 'lucide-react';
import { api, ApiError } from '../services/api';
import type {
  ChampionshipParticipantInput,
  CreateChampionshipInput,
} from '../services/api';
import { useApi } from '../hooks/useApi';
import TeamLogo from '../components/TeamLogo';
import type {
  ChampionshipFormat,
  PublicTeamSummary,
  Team,
} from '../types';
import { CHAMPIONSHIP_FORMATS } from '../types';

const FORMAT_LABEL: Record<ChampionshipFormat, string> = {
  PONTOS_CORRIDOS: 'Pontos corridos (todos contra todos)',
  MATA_MATA: 'Mata-mata (eliminação simples)',
  COPA: 'Copa (grupos + mata-mata)',
};

const FORMAT_HELP: Record<ChampionshipFormat, string> = {
  PONTOS_CORRIDOS: 'Cada time enfrenta todos uma vez. Mínimo 3 times.',
  MATA_MATA: 'Sorteio de chaveamento. Mínimo 2, ideal 4/8/16 times.',
  COPA: 'Grupos de até 4 times, top 2 avançam pro mata-mata. Mín. 4 times.',
};

export default function CreateChampionship() {
  const navigate = useNavigate();
  const teamsQ = useApi<Team[]>(() => api.listTeams());

  const [name, setName] = useState('');
  const [format, setFormat] = useState<ChampionshipFormat>('PONTOS_CORRIDOS');
  const [selected, setSelected] = useState<ChampionshipParticipantInput[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PublicTeamSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(searchQuery), 250);
    return () => window.clearTimeout(id);
  }, [searchQuery]);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      const id = window.setTimeout(() => setSearchResults([]), 0);
      return () => window.clearTimeout(id);
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setSearching(true);
      api
        .searchPublicTeams(debouncedQuery)
        .then((data) => {
          if (cancelled) return;
          setSearchResults(data);
        })
        .catch(() => {
          if (cancelled) return;
          setSearchResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [debouncedQuery]);

  const selectedIds = useMemo(
    () => new Set(selected.map((p) => p.teamId)),
    [selected],
  );

  const toggleTeam = (
    team: { teamId: string; name: string; logoUrl?: string },
    isMine: boolean,
  ) => {
    setSelected((prev) => {
      if (prev.some((p) => p.teamId === team.teamId)) {
        return prev.filter((p) => p.teamId !== team.teamId);
      }
      const next: ChampionshipParticipantInput = {
        teamId: team.teamId,
        teamName: team.name,
        isMine,
      };
      if (team.logoUrl) next.logoUrl = team.logoUrl;
      return [...prev, next];
    });
  };

  const removeSelected = (teamId: string) => {
    setSelected((prev) => prev.filter((p) => p.teamId !== teamId));
  };

  const minParticipants =
    format === 'PONTOS_CORRIDOS' ? 3 : format === 'COPA' ? 4 : 2;
  const enough = selected.length >= minParticipants;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Defina um nome para o campeonato.');
      return;
    }
    if (!enough) {
      setError(`Selecione ao menos ${minParticipants} times.`);
      return;
    }
    if (selected.length > 16) {
      setError('Máximo de 16 times nesta versão.');
      return;
    }
    const payload: CreateChampionshipInput = {
      name: name.trim(),
      format,
      participants: selected,
    };
    setSaving(true);
    try {
      const championship = await api.createChampionship(payload);
      navigate(`/campeonatos/${championship.championshipId}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao criar.');
    } finally {
      setSaving(false);
    }
  };

  const myTeams = teamsQ.data ?? [];

  return (
    <div className="space-y-5">
      <Link
        to="/campeonatos"
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Campeonatos
      </Link>

      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-primary-600" />
          Novo campeonato
        </h2>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-5"
      >
        <label className="block">
          <span className="text-sm font-medium text-gray-700">
            Nome do campeonato
          </span>
          <input
            type="text"
            required
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex.: Copa de Verão 2025"
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </label>

        <div className="space-y-1">
          <span className="text-sm font-medium text-gray-700">Formato</span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {CHAMPIONSHIP_FORMATS.map((f) => {
              const active = format === f;
              return (
                <button
                  type="button"
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`text-left rounded-lg border px-3 py-2 transition-colors ${
                    active
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <p
                    className={`text-sm font-semibold ${
                      active ? 'text-primary-700' : 'text-gray-900'
                    }`}
                  >
                    {FORMAT_LABEL[f]}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {FORMAT_HELP[f]}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <section className="space-y-3 border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              Times participantes
            </h3>
            <span className="text-xs text-gray-500">
              {selected.length} selecionado(s) · mínimo {minParticipants}
            </span>
          </div>

          {selected.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {selected.map((p) => (
                <li
                  key={p.teamId}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${
                    p.isMine
                      ? 'bg-primary-50 text-primary-800 border border-primary-200'
                      : 'bg-gray-100 text-gray-800 border border-gray-200'
                  }`}
                >
                  <TeamLogo
                    name={p.teamName}
                    logoUrl={p.logoUrl}
                    size={18}
                  />
                  <span className="font-medium">{p.teamName}</span>
                  {p.isMine && (
                    <span className="rounded-full bg-white/60 px-1.5 text-[10px] uppercase">
                      seu
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeSelected(p.teamId)}
                    className="text-gray-500 hover:text-rose-600"
                    aria-label={`Remover ${p.teamName}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Meus times
            </p>
            {teamsQ.loading && (
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Carregando…
              </p>
            )}
            {myTeams.length === 0 && !teamsQ.loading && (
              <p className="text-xs text-gray-500">
                Você ainda não tem times cadastrados.
              </p>
            )}
            {myTeams.length > 0 && (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {myTeams.map((team) => {
                  const checked = selectedIds.has(team.teamId);
                  return (
                    <li key={team.teamId}>
                      <button
                        type="button"
                        onClick={() =>
                          toggleTeam(
                            {
                              teamId: team.teamId,
                              name: team.name,
                              logoUrl: team.logoUrl,
                            },
                            true,
                          )
                        }
                        className={`flex items-center gap-2 w-full text-left rounded-lg border px-2.5 py-1.5 ${
                          checked
                            ? 'border-primary-300 bg-primary-50'
                            : 'border-gray-200 bg-white hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          readOnly
                          className="h-4 w-4 rounded border-gray-300 text-primary-600"
                        />
                        <TeamLogo
                          name={team.name}
                          logoUrl={team.logoUrl}
                          size={24}
                        />
                        <span className="text-sm text-gray-900 truncate flex-1">
                          {team.name}
                        </span>
                        <span className="text-[10px] rounded-full bg-primary-100 text-primary-700 px-1.5 py-0.5 uppercase">
                          seu
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="space-y-2 border-t border-gray-100 pt-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Outros times (busca)
            </p>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar times por nome…"
                className="w-full rounded-lg border border-gray-200 bg-white pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            {searching && (
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Buscando…
              </p>
            )}
            {!searching && debouncedQuery && searchResults.length === 0 && (
              <p className="text-xs text-gray-500">
                Nenhum time encontrado para "{debouncedQuery}".
              </p>
            )}
            {searchResults.length > 0 && (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {searchResults
                  .filter(
                    (t) => !myTeams.some((m) => m.teamId === t.teamId),
                  )
                  .map((team) => {
                    const checked = selectedIds.has(team.teamId);
                    return (
                      <li key={team.teamId}>
                        <button
                          type="button"
                          onClick={() =>
                            toggleTeam(
                              {
                                teamId: team.teamId,
                                name: team.name,
                                logoUrl: team.logoUrl,
                              },
                              false,
                            )
                          }
                          className={`flex items-center gap-2 w-full text-left rounded-lg border px-2.5 py-1.5 ${
                            checked
                              ? 'border-primary-300 bg-primary-50'
                              : 'border-gray-200 bg-white hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            readOnly
                            className="h-4 w-4 rounded border-gray-300 text-primary-600"
                          />
                          <TeamLogo
                            name={team.name}
                            logoUrl={team.logoUrl}
                            size={24}
                          />
                          <span className="text-sm text-gray-900 truncate flex-1">
                            {team.name}
                          </span>
                        </button>
                      </li>
                    );
                  })}
              </ul>
            )}
          </div>
        </section>

        {error && (
          <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
          <Link
            to="/campeonatos"
            className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Criar campeonato
          </button>
        </div>
      </form>
    </div>
  );
}
