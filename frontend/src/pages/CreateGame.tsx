import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import type { GameStatus } from '../types';
import { GAME_STATUS_LABELS } from '../utils/constants';

const GAME_STATUSES: GameStatus[] = ['AGENDADO', 'REALIZADO'];

export default function CreateGame() {
  const { teamId = '' } = useParams<{ teamId: string }>();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [opponent, setOpponent] = useState('');
  const [status, setStatus] = useState<GameStatus>('AGENDADO');
  const [scoreFor, setScoreFor] = useState('0');
  const [scoreAgainst, setScoreAgainst] = useState('0');
  const [submitting, setSubmitting] = useState(false);
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createGame(teamId, {
        date,
        time,
        location: location.trim(),
        opponent: opponent.trim(),
        status,
        result:
          status === 'REALIZADO'
            ? {
                scoreFor: Number.parseInt(scoreFor, 10) || 0,
                scoreAgainst: Number.parseInt(scoreAgainst, 10) || 0,
              }
            : undefined,
      });
      showSuccess('Jogo cadastrado!');
      navigate(`/teams/${teamId}`);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erro ao salvar jogo');
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
        <h2 className="text-xl font-bold text-gray-900">Novo jogo</h2>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Data *</span>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Horário *</span>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Local *</span>
            <input
              type="text"
              required
              maxLength={200}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Adversário *</span>
            <input
              type="text"
              required
              maxLength={100}
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Status *</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as GameStatus)}
              className="mt-1 w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {GAME_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {GAME_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          {status === 'REALIZADO' && (
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Gols pró *</span>
                <input
                  type="number"
                  required
                  min={0}
                  max={99}
                  value={scoreFor}
                  onChange={(e) => setScoreFor(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Gols contra *</span>
                <input
                  type="number"
                  required
                  min={0}
                  max={99}
                  value={scoreAgainst}
                  onChange={(e) => setScoreAgainst(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </label>
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <LoadingSpinner className="text-white" />
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Salvar jogo
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
