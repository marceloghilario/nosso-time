import { Link } from 'react-router-dom';
import { Calendar, ChevronRight, Goal, MapPin } from 'lucide-react';
import type { Game } from '../types';
import { GAME_STATUS_LABELS } from '../utils/constants';

interface Props {
  teamId: string;
  games: Game[];
  readOnly?: boolean;
}

const formatDate = (date: string, time: string): string => {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year} às ${time}`;
};

export default function GameList({ teamId, games, readOnly }: Props) {
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
      {games.map((game) => {
        const body = (
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-900 truncate">vs {game.opponent}</p>
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(game.date, game.time)}
              </p>
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5" />
                {game.location}
              </p>
              {game.goals && game.goals.length > 0 && (
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1.5">
                  <Goal className="w-3.5 h-3.5" />
                  {game.goals.length} {game.goals.length === 1 ? 'gol' : 'gols'} registrados
                </p>
              )}
            </div>
            <div className="text-right shrink-0 flex flex-col items-end gap-1">
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
                <p className="mt-1 font-bold text-gray-900">
                  {game.result.scoreFor} <span className="text-gray-400">x</span>{' '}
                  {game.result.scoreAgainst}
                </p>
              )}
              {!readOnly && <ChevronRight className="w-4 h-4 text-gray-400" />}
            </div>
          </div>
        );
        if (readOnly) {
          return (
            <div
              key={game.gameId}
              className="block bg-white rounded-xl shadow-sm border border-gray-100 p-4"
            >
              {body}
            </div>
          );
        }
        return (
          <Link
            key={game.gameId}
            to={`/teams/${teamId}/jogos/${game.gameId}`}
            className="block bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:border-primary-300 hover:shadow transition"
          >
            {body}
          </Link>
        );
      })}
    </div>
  );
}
