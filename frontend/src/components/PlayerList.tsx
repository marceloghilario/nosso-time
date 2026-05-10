import { Hash, User } from 'lucide-react';
import type { Player } from '../types';
import { PLAYER_POSITION_LABELS } from '../utils/constants';

interface Props {
  players: Player[];
}

export default function PlayerList({ players }: Props) {
  if (players.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <User className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-gray-600">Nenhum jogador cadastrado ainda.</p>
      </div>
    );
  }

  const sorted = [...players].sort((a, b) => {
    if (a.number === undefined && b.number === undefined) {
      return a.name.localeCompare(b.name);
    }
    if (a.number === undefined) return 1;
    if (b.number === undefined) return -1;
    return a.number - b.number;
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <ul className="divide-y divide-gray-100">
        {sorted.map((player) => (
          <li
            key={player.playerId}
            className="px-4 py-3 flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 font-semibold flex items-center justify-center shrink-0">
              {player.number !== undefined ? (
                <>
                  <Hash className="w-3 h-3 mr-0.5" />
                  <span>{player.number}</span>
                </>
              ) : (
                <User className="w-4 h-4" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{player.name}</p>
              <p className="text-xs text-gray-500">
                {PLAYER_POSITION_LABELS[player.position]}
                {player.characteristics ? ` · ${player.characteristics}` : ''}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
