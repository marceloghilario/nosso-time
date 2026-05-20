import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  ShieldCheck,
  Users,
  XCircle,
} from 'lucide-react';
import { api, ApiError } from '../services/api';
import type { AdminRequest, AdminRequestStatus } from '../types';

interface AdminRequestsPanelProps {
  teamId: string;
}

/**
 * Owner-only panel listing every admin request filed for the team. Pending
 * requests can be approved/rejected; decided requests are shown in a
 * collapsed history list so the owner has visibility into past decisions.
 */
export default function AdminRequestsPanel({ teamId }: AdminRequestsPanelProps) {
  const [requests, setRequests] = useState<AdminRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await api.listAdminRequestsForTeam(teamId);
      setRequests(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Não foi possível carregar as solicitações',
      );
    }
  }, [teamId]);

  useEffect(() => {
    let cancelled = false;
    api
      .listAdminRequestsForTeam(teamId)
      .then((data) => {
        if (cancelled) return;
        setRequests(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : 'Não foi possível carregar as solicitações',
        );
      });
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  const decide = async (
    requestId: string,
    action: 'APPROVE' | 'REJECT',
  ) => {
    setBusyId(requestId);
    setError(null);
    try {
      await api.decideAdminRequest(teamId, requestId, action);
      await refresh();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Não foi possível registrar a decisão',
      );
    } finally {
      setBusyId(null);
    }
  };

  if (!requests) {
    return null;
  }

  const pending = requests.filter((r) => r.status === 'PENDING');
  const decided = requests.filter((r) => r.status !== 'PENDING');

  if (pending.length === 0 && decided.length === 0) {
    return null;
  }

  return (
    <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-4 sm:p-5 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-slate-500" />
        <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-500">
          Solicitações de administração
        </h3>
        {pending.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 ring-1 ring-amber-200 px-2 py-0.5 text-[11px] font-semibold">
            <Clock className="w-3 h-3" />
            {pending.length} pendente{pending.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </div>
      )}

      {pending.length === 0 ? (
        <p className="text-sm text-slate-500">
          Nenhuma solicitação pendente.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {pending.map((req) => (
            <li
              key={req.requestId}
              className="py-3 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-slate-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    Usuário <span className="font-mono">{req.userId.slice(0, 8)}</span>
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    Solicitou em {formatDate(req.createdAt)}
                  </p>
                  {req.note && (
                    <p className="mt-1 text-sm text-slate-700 italic line-clamp-2">
                      “{req.note}”
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => decide(req.requestId, 'APPROVE')}
                  disabled={busyId !== null}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 transition"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Aprovar
                </button>
                <button
                  type="button"
                  onClick={() => decide(req.requestId, 'REJECT')}
                  disabled={busyId !== null}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white text-rose-700 ring-1 ring-rose-200 text-xs font-semibold hover:bg-rose-50 disabled:opacity-50 transition"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Recusar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {decided.length > 0 && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="text-xs font-semibold text-slate-500 hover:text-slate-900"
          >
            {showHistory
              ? 'Ocultar histórico'
              : `Mostrar histórico (${decided.length})`}
          </button>
          {showHistory && (
            <ul className="mt-2 divide-y divide-slate-100">
              {decided.map((req) => (
                <li
                  key={req.requestId}
                  className="py-2 flex items-center gap-2 text-xs text-slate-600"
                >
                  <StatusChip status={req.status} />
                  <span className="font-mono text-[11px]">
                    {req.userId.slice(0, 8)}
                  </span>
                  <span className="text-slate-400">
                    · {formatDate(req.decidedAt ?? req.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function StatusChip({ status }: { status: AdminRequestStatus }) {
  const config = {
    APPROVED: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
    REJECTED: 'bg-rose-100 text-rose-800 ring-rose-200',
    PENDING: 'bg-amber-100 text-amber-800 ring-amber-200',
  }[status];
  const label = { APPROVED: 'Aprovada', REJECTED: 'Recusada', PENDING: 'Pendente' }[status];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ${config}`}
    >
      {label}
    </span>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}
