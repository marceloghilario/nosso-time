import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';

export default function CreateTeam() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
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
