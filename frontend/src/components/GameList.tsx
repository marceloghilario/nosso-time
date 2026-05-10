import { Calendar, MapPin } from 'lucide-react';
import type { Game } from '../types';
import { GAME_STATUS_LABELS } from '../utils/constants';

interface Props {
  games: Game[];
}

const formatDate = (date: string, time: string): string => {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year} às ${time}`;
};

export default function GameList({ games }: Props) {
  if (games.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Calendar className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-gray-600">Nenhum jogo cadastrado ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {games.map((game) => (
        <div
          key={game.gameId}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate">vs {game.opponent}</p>
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(game.date, game.time)}
              </p>
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5" />
                {game.location}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span
                className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                  game.status === 'REALIZADO'
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {GAME_STATUS_LABELS[game.status]}
              </span>
              {game.status === 'REALIZADO' && game.result && (
                <p className="mt-2 font-bold text-gray-900">
                  {game.result.scoreFor} <span className="text-gray-400">x</span>{' '}
                  {game.result.scoreAgainst}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
