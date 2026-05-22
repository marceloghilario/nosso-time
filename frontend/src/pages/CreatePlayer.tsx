import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import { PLAYER_POSITIONS } from '../types';
import type { PlayerPosition } from '../types';
import { PLAYER_POSITION_LABELS } from '../utils/constants';

export default function CreatePlayer() {
  const { teamId = '' } = useParams<{ teamId: string }>();
  const [name, setName] = useState('');
  const [position, setPosition] = useState<PlayerPosition>('ATACANTE');
  const [number, setNumber] = useState('');
  const [characteristics, setCharacteristics] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = number.trim();
    let numberValue: number | undefined;
    if (trimmed.length > 0) {
      const parsed = Number.parseInt(trimmed, 10);
      if (Number.isNaN(parsed) || parsed < 1 || parsed > 99) {
        showError('Número de camisa deve ser entre 1 e 99');
        return;
      }
      numberValue = parsed;
    }
    setSubmitting(true);
    try {
      await api.createPlayer(teamId, {
        name: name.trim(),
        position,
        number: numberValue,
        characteristics: characteristics.trim() || undefined,
      });
      showSuccess('Jogador adicionado!');
      navigate(`/teams/${teamId}`);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erro ao salvar jogador');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <Link
        to={`/teams/${teamId}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </Link>

      <div className="bg-slate-50 rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-gray-900">Novo jogador</h2>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Nome *</span>
            <input
              type="text"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Posição *</span>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value as PlayerPosition)}
                className="mt-1 w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {PLAYER_POSITIONS.map((p) => (
                  <option key={p} value={p}>
                    {PLAYER_POSITION_LABELS[p]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Número</span>
              <input
                type="number"
                min={1}
                max={99}
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="Opcional"
                className="mt-1 w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Características</span>
            <textarea
              rows={3}
              maxLength={500}
              value={characteristics}
              onChange={(e) => setCharacteristics(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </label>
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <LoadingSpinner className="text-white" />
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Adicionar
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
