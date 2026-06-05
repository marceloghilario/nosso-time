import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import type { Modality } from '../types';

export default function CreateTeam() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [modality, setModality] = useState<Modality>('FUTEBOL');
  const [submitting, setSubmitting] = useState(false);
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const team = await api.createTeam({
        name: name.trim(),
        description: description.trim() || undefined,
        modality,
      });
      showSuccess('Time criado com sucesso!');
      navigate(`/teams/${team.teamId}`, { replace: true });
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erro ao criar time');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <Link
        to="/teams"
        className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </Link>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-bold text-gray-900">Novo time</h2>
        <p className="text-sm text-gray-500 mt-1">
          Cadastre um time para começar a registrar jogadores, jogos e fotos.
        </p>

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

          {/* Modality selector */}
          <fieldset>
            <legend className="text-sm font-medium text-gray-700 mb-2">Modalidade</legend>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setModality('FUTEBOL')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-colors ${
                  modality === 'FUTEBOL'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <svg viewBox="0 0 24 24" className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="4" width="20" height="16" rx="1" />
                  <line x1="12" y1="4" x2="12" y2="20" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <span className="text-sm font-medium text-gray-800">Futebol de campo</span>
                <span className="text-xs text-gray-500">11 jogadores</span>
              </button>
              <button
                type="button"
                onClick={() => setModality('FUTSAL')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-colors ${
                  modality === 'FUTSAL'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <svg viewBox="0 0 24 24" className="w-7 h-7 text-sky-600" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="3" width="20" height="18" rx="2" />
                  <line x1="12" y1="3" x2="12" y2="21" />
                  <circle cx="12" cy="12" r="2.5" />
                  <path d="M2 8 A6 6 0 0 0 8 3" />
                  <path d="M22 8 A6 6 0 0 1 16 3" />
                </svg>
                <span className="text-sm font-medium text-gray-800">Futsal</span>
                <span className="text-xs text-gray-500">5 jogadores</span>
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              A modalidade define as posições e esquemas táticos disponíveis.
            </p>
          </fieldset>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Descrição</span>
            <textarea
              rows={3}
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
                Criar time
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
