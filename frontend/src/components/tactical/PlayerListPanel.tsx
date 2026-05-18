import { useDraggable } from '@dnd-kit/core';
import { Hash, User } from 'lucide-react';
import type { Player } from '../../types';
import { PLAYER_POSITION_LABELS, comparePlayers } from '../../utils/constants';

interface Props {
  players: Player[];
  selectedPlayerId?: string | null;
  onSelect?: (playerId: string) => void;
}

export default function PlayerListPanel({
  players,
  selectedPlayerId,
  onSelect,
}: Props) {
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
        <DraggablePlayer
          key={p.playerId}
          player={p}
          selected={selectedPlayerId === p.playerId}
          onSelect={onSelect}
        />
      ))}
    </ul>
  );
}

function DraggablePlayer({
  player,
  selected,
  onSelect,
}: {
  player: Player;
  selected: boolean;
  onSelect?: (playerId: string) => void;
}) {
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

  const baseClass = selected
    ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-200'
    : 'border-gray-200 bg-white hover:border-emerald-300';

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onSelect?.(player.playerId)}
      className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 shadow-sm cursor-pointer active:cursor-grabbing touch-none ${baseClass}`}
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
