import { useDroppable } from '@dnd-kit/core';

interface Props {
  slotIndex: number;
  role: string;
  x: number;
  y: number;
  selected: boolean;
  onClick: (slotIndex: number) => void;
}

export default function EmptySlot({
  slotIndex,
  role,
  x,
  y,
  selected,
  onClick,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot:${slotIndex}`,
    data: { type: 'slot', slotIndex },
  });

  const ringClass = selected
    ? 'border-amber-300 bg-amber-400/30 text-white shadow-[0_0_0_3px_rgba(251,191,36,0.45)]'
    : isOver
      ? 'border-white bg-white/30 text-white'
      : 'border-white/70 bg-white/10 text-white hover:bg-white/20 hover:border-white';

  return (
    <button
      type="button"
      ref={setNodeRef}
      onClick={() => onClick(slotIndex)}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -50%)',
      }}
      className={`absolute flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border-2 border-dashed text-[10px] sm:text-xs font-bold transition-colors ${ringClass}`}
      aria-label={`Posição ${role}`}
    >
      {role}
    </button>
  );
}
