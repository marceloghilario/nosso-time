import { Link } from 'react-router-dom';
import { Hash, Pencil, User } from 'lucide-react';
import type { Player } from '../types';
import { PLAYER_POSITION_LABELS, comparePlayers } from '../utils/constants';

interface Props {
  players: Player[];
  teamId?: string;
  canManage?: boolean;
}

export default function PlayerList({ players, teamId, canManage = false }: Props) {
  if (players.length === 0) {
    return (
      <div className="bg-slate-50 rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-8 text-center">
        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <User className="w-6 h-6 text-slate-400" />
        </div>
        <p className="text-slate-600">Cadastre seu elenco.</p>
      </div>
    );
  }

  const sorted = [...players].sort(comparePlayers);

  return (
    <div className="bg-slate-50 rounded-2xl shadow-sm ring-1 ring-slate-200/70 overflow-hidden">
      <ul className="divide-y divide-slate-100">
        {sorted.map((player) => (
          <li
            key={player.playerId}
            className="px-4 py-3 flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-primary-50 text-primary-700 font-semibold flex items-center justify-center shrink-0 ring-1 ring-primary-100">
              {player.number !== undefined ? (
                <>
                  <Hash className="w-3 h-3 mr-0.5" />
                  <span className="tabular-nums">{player.number}</span>
                </>
              ) : (
                <User className="w-4 h-4" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 truncate">{player.name}</p>
              <p className="text-xs text-slate-500">
                {PLAYER_POSITION_LABELS[player.position]}
                {player.characteristics ? ` · ${player.characteristics}` : ''}
              </p>
            </div>
            {canManage && teamId && (
              <Link
                to={`/teams/${teamId}/jogadores/${player.playerId}/editar`}
                aria-label={`Editar ${player.name}`}
                title="Editar jogador"
                className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full text-slate-500 hover:text-primary-700 hover:bg-primary-50 transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
