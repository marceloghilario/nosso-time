import { useDraggable } from '@dnd-kit/core';
import { X } from 'lucide-react';
import type { FormationPlayerPosition } from '../../types';

interface Props {
  position: FormationPlayerPosition;
  interactive?: boolean;
  onRemove?: (playerId: string) => void;
}

export default function PlayerMarker({
  position,
  interactive = true,
  onRemove,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `marker:${position.playerId}`,
      data: { type: 'marker', playerId: position.playerId },
      disabled: !interactive,
    });

  const style: React.CSSProperties = {
    left: `${position.x}%`,
    top: `${position.y}%`,
    transform: `translate(-50%, -50%)${
      transform ? ` translate3d(${transform.x}px, ${transform.y}px, 0)` : ''
    }`,
    zIndex: isDragging ? 30 : 10,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`absolute flex flex-col items-center ${
        interactive ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
      {...listeners}
      {...attributes}
    >
      <div className="relative">
        <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border-2 border-white bg-emerald-900 text-white font-bold text-xs sm:text-sm shadow-md">
          {position.playerNumber ?? '–'}
        </div>
        {interactive && onRemove && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onRemove(position.playerId);
            }}
            className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-white shadow hover:bg-rose-700"
            aria-label="Remover do campo"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        )}
      </div>
      <span className="mt-0.5 max-w-[80px] truncate rounded bg-black/60 px-1 py-0.5 text-[10px] font-medium text-white">
        {position.playerName}
      </span>
    </div>
  );
}
