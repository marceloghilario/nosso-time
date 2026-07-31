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

      <div className="bg-slate-50 rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-gray-900">Novo time</h2>
        <p className="text-sm text-gray-500 mt-1">
          Cadastre um time para começar a registrar jogadores, jogos e fotos.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <fieldset>
            <legend className="text-sm font-medium text-gray-700 mb-2">Modalidade</legend>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setModality('FUTEBOL')}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  modality === 'FUTEBOL'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <svg viewBox="0 0 40 60" className="w-8 h-12">
                  <rect x="2" y="2" width="36" height="56" fill="#22c55e" stroke="#166534" strokeWidth="2" rx="1" />
                  <line x1="2" y1="30" x2="38" y2="30" stroke="white" strokeWidth="1" />
                  <circle cx="20" cy="30" r="6" fill="none" stroke="white" strokeWidth="1" />
                  <rect x="10" y="2" width="20" height="10" fill="none" stroke="white" strokeWidth="1" />
                  <rect x="10" y="48" width="20" height="10" fill="none" stroke="white" strokeWidth="1" />
                </svg>
                <span className="text-sm font-medium text-gray-800">Futebol de campo</span>
                <span className="text-xs text-gray-500">11 jogadores</span>
              </button>
              <button
                type="button"
                onClick={() => setModality('FUTSAL')}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  modality === 'FUTSAL'
                    ? 'border-sky-500 bg-sky-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <svg viewBox="0 0 50 80" className="w-8 h-12">
                  <rect x="2" y="2" width="46" height="76" fill="#0ea5e9" stroke="#0369a1" strokeWidth="2" rx="3" />
                  <line x1="2" y1="40" x2="48" y2="40" stroke="white" strokeWidth="1" />
                  <circle cx="25" cy="40" r="6" fill="none" stroke="white" strokeWidth="1" />
                  <path d="M 15 2 A 10 10 0 0 1 35 2" fill="none" stroke="white" strokeWidth="1" />
                  <path d="M 15 78 A 10 10 0 0 0 35 78" fill="none" stroke="white" strokeWidth="1" />
                </svg>
                <span className="text-sm font-medium text-gray-800">Futsal</span>
                <span className="text-xs text-gray-500">5 jogadores</span>
              </button>
            </div>
          </fieldset>
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
