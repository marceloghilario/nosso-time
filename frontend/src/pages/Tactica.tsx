import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api } from '../services/api';
import { useApi } from '../hooks/useApi';
import LoadingSpinner from '../components/LoadingSpinner';
import TacticalBoard from '../components/tactical/TacticalBoard';
import FormationSelector from '../components/tactical/FormationSelector';
import type { FormationScheme, Modality } from '../types';
import { DEFAULT_SCHEME_BY_MODALITY } from '../utils/formationSchemes';

export default function Tactica() {
  const { teamId = '' } = useParams<{ teamId: string }>();
  const teamReq = useApi(() => api.getTeam(teamId), [teamId]);
  const team = teamReq.data;

  const modality: Modality = team?.modality ?? 'FUTEBOL';
  const defaultScheme = DEFAULT_SCHEME_BY_MODALITY[modality] as FormationScheme;
  const [scheme, setScheme] = useState<FormationScheme | null>(null);

  const activeScheme = scheme ?? defaultScheme;

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <Link
        to={`/teams/${teamId}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </Link>

      {teamReq.loading && <LoadingSpinner label="Carregando..." />}
      {teamReq.error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {teamReq.error}
        </div>
      )}

      {team && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Tática — {team.name}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {modality === 'FUTSAL' ? 'Quadra de futsal' : 'Campo de futebol'} • Esquema {activeScheme}
            </p>
          </div>

          <FormationSelector modality={modality} value={activeScheme} onChange={setScheme} />

          <TacticalBoard modality={modality} scheme={activeScheme} />
        </div>
      )}
    </div>
  );
}
