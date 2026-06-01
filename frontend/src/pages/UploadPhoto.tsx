import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Upload } from 'lucide-react';
import { api } from '../services/api';
import { useApi } from '../hooks/useApi';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';

export default function UploadPhoto() {
  const { teamId = '' } = useParams<{ teamId: string }>();
  const [file, setFile] = useState<File | null>(null);
  const [gameId, setGameId] = useState<string>('');
  const [caption, setCaption] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const gamesReq = useApi(() => api.listGames(teamId), [teamId]);

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const next = e.target.files?.[0] ?? null;
    setFile(next);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      showError('Selecione uma imagem para enviar');
      return;
    }
    setSubmitting(true);
    try {
      const { uploadUrl, s3Key } = await api.getMediaUploadUrl(teamId, {
        contentType: file.type || 'image/jpeg',
        fileName: file.name,
        type: 'PHOTO',
      });
      await api.uploadToS3(uploadUrl, file, file.type || 'image/jpeg');
      await api.createMedia(teamId, {
        s3Key,
        contentType: file.type || 'image/jpeg',
        type: 'PHOTO',
        gameId: gameId || undefined,
        caption: caption.trim() || undefined,
      });
      showSuccess('Foto enviada com sucesso!');
      navigate(`/teams/${teamId}`);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erro ao enviar foto');
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
        <h2 className="text-xl font-bold text-gray-900">Enviar foto</h2>
        <p className="text-sm text-gray-500 mt-1">
          A foto fica vinculada ao time e, opcionalmente, a um jogo específico.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Arquivo *</span>
            <input
              type="file"
              accept="image/*"
              required
              onChange={handleFile}
              className="mt-1 block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Vincular a jogo (opcional)</span>
            <select
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={gamesReq.loading}
            >
              <option value="">Nenhum jogo</option>
              {gamesReq.data?.map((g) => (
                <option key={g.gameId} value={g.gameId}>
                  {g.date} — vs {g.opponent}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Legenda</span>
            <input
              type="text"
              maxLength={500}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </label>

          <button
            type="submit"
            disabled={submitting || !file}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <LoadingSpinner className="text-white" />
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Enviar
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
