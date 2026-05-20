import { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  ShieldCheck,
  UserMinus,
  UserPlus,
} from 'lucide-react';
import { api, ApiError } from '../services/api';
import type { PendingAdminRequestSummary, TeamRole } from '../types';

interface TeamFollowActionsProps {
  teamId: string;
  myRole: TeamRole | null;
  pendingAdminRequest: PendingAdminRequestSummary | null;
  onChanged: () => void;
}

/**
 * Action bar displayed on the public team page so the viewer can follow,
 * unfollow or request an ADMIN role. Hidden when the caller already manages
 * the team (in that case PublicTeamDetail redirects to /teams/:id).
 */
export default function TeamFollowActions({
  teamId,
  myRole,
  pendingAdminRequest,
  onChanged,
}: TeamFollowActionsProps) {
  const [busy, setBusy] = useState<'follow' | 'unfollow' | 'request' | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState(false);

  const showError = (err: unknown) => {
    setError(
      err instanceof ApiError
        ? err.message
        : 'Não foi possível processar a ação',
    );
  };

  const handle = async (
    op: 'follow' | 'unfollow' | 'request',
    fn: () => Promise<unknown>,
  ) => {
    setError(null);
    setBusy(op);
    try {
      await fn();
      onChanged();
    } catch (err) {
      showError(err);
    } finally {
      setBusy(null);
    }
  };

  if (myRole === 'OWNER' || myRole === 'ADMIN') {
    // Should be handled by redirect in the parent; render nothing as a safety net.
    return null;
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-sm text-slate-600">
          {myRole === 'FOLLOWER' ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Você segue este time
            </span>
          ) : (
            <>Acompanhe novidades deste time ou solicite acesso de admin.</>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {myRole !== 'FOLLOWER' && (
            <button
              type="button"
              onClick={() =>
                handle('follow', () => api.followTeam(teamId))
              }
              disabled={busy !== null}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 transition"
            >
              <UserPlus className="w-4 h-4" />
              Seguir time
            </button>
          )}
          {myRole === 'FOLLOWER' && !pendingAdminRequest && (
            <>
              <button
                type="button"
                onClick={() => setConfirmDialog(true)}
                disabled={busy !== null}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 disabled:opacity-50 transition"
              >
                <ShieldCheck className="w-4 h-4" />
                Solicitar administração
              </button>
              <button
                type="button"
                onClick={() =>
                  handle('unfollow', () => api.unfollowTeam(teamId))
                }
                disabled={busy !== null}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white text-slate-700 ring-1 ring-slate-200 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 transition"
              >
                <UserMinus className="w-4 h-4" />
                Deixar de seguir
              </button>
            </>
          )}
          {pendingAdminRequest && (
            <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-50 text-amber-800 ring-1 ring-amber-200 text-sm font-semibold">
              <Clock className="w-4 h-4" />
              Solicitação pendente
            </span>
          )}
        </div>
      </div>
      {error && (
        <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </div>
      )}
      {confirmDialog && (
        <AdminRequestDialog
          submitting={busy === 'request'}
          onCancel={() => setConfirmDialog(false)}
          onSubmit={async (note) => {
            await handle('request', () =>
              api.createAdminRequest(teamId, note || undefined),
            );
            setConfirmDialog(false);
          }}
        />
      )}
    </div>
  );
}

function AdminRequestDialog({
  submitting,
  onCancel,
  onSubmit,
}: {
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (note: string) => void | Promise<void>;
}) {
  const [note, setNote] = useState('');
  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl ring-1 ring-slate-200 w-full max-w-md p-5">
        <h3 className="text-lg font-bold text-slate-900">
          Solicitar administração
        </h3>
        <p className="text-sm text-slate-600 mt-1">
          O dono do time receberá sua solicitação e poderá aprovar ou recusar.
          Como admin você poderá editar elenco, jogos, fotos e formações — mas
          não poderá excluir o time.
        </p>
        <label className="block mt-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Mensagem (opcional)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          rows={3}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Conte por que você quer ajudar a gerenciar esse time..."
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onSubmit(note.trim())}
            disabled={submitting}
            className="px-3 py-2 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 disabled:opacity-50 transition"
          >
            {submitting ? 'Enviando...' : 'Enviar solicitação'}
          </button>
        </div>
      </div>
    </div>
  );
}
