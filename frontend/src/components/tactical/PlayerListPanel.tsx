import { useDraggable } from '@dnd-kit/core';
import { Hash, User } from 'lucide-react';
import type { Player } from '../../types';
import { PLAYER_POSITION_LABELS, comparePlayers } from '../../utils/constants';

interface Props {
  players: Player[];
}

export default function PlayerListPanel({ players }: Props) {
  if (players.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
        Todos os jogadores cadastrados já estão no campo.
      </p>
    );
  }
  const sorted = [...players].sort(comparePlayers);
  return (
    <ul className="space-y-1.5">
      {sorted.map((p) => (
        <DraggablePlayer key={p.playerId} player={p} />
      ))}
    </ul>
  );
}

function DraggablePlayer({ player }: { player: Player }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `panel:${player.playerId}`,
      data: { type: 'panel', playerId: player.playerId },
    });

  const style: React.CSSProperties = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    zIndex: isDragging ? 30 : undefined,
    position: isDragging ? 'relative' : undefined,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-2 shadow-sm cursor-grab active:cursor-grabbing hover:border-emerald-300 touch-none"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-semibold">
        {player.number !== undefined ? (
          <>
            <Hash className="mr-0.5 h-3 w-3" />
            {player.number}
          </>
        ) : (
          <User className="h-4 w-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">
          {player.name}
        </p>
        <p className="text-[11px] text-gray-500">
          {PLAYER_POSITION_LABELS[player.position]}
        </p>
      </div>
    </li>
  );
}
