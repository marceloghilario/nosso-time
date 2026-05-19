import { useMemo, useRef, useState } from 'react';
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { Hash, User } from 'lucide-react';
import { FORMATION_SCHEMES } from '../../types';
import type { FormationScheme } from '../../types';
import { FORMATION_SLOTS } from '../../utils/formationSchemes';
import { TacticalBoard } from './TacticalBoard';
import PlayerMarker from './PlayerMarker';
import EmptySlot from './EmptySlot';

export interface LineupCandidate {
  playerId: string;
  playerName: string;
  playerNumber?: number;
  label?: string;
}

export interface LineupValue {
  scheme: FormationScheme;
  positions: { playerId: string; x: number; y: number }[];
}

interface Props {
  pool: LineupCandidate[];
  value: LineupValue;
  onChange: (value: LineupValue) => void;
}

interface FieldSlot {
  slotIndex: number;
  role: string;
  x: number;
  y: number;
  playerId?: string;
}

const FIELD_DROPPABLE_ID = 'lineup-field';

const clamp = (value: number, min = 0, max = 100): number =>
  Math.min(max, Math.max(min, value));

const buildEmptySlots = (scheme: FormationScheme): FieldSlot[] =>
  FORMATION_SLOTS[scheme].map((s, idx) => ({
    slotIndex: idx,
    role: s.role,
    x: s.x,
    y: s.y,
  }));

const findClosestEmptySlot = (
  slots: FieldSlot[],
  x: number,
  y: number,
): number => {
  let bestIdx = -1;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < slots.length; i++) {
    if (slots[i].playerId) continue;
    const dx = slots[i].x - x;
    const dy = slots[i].y - y;
    const d = dx * dx + dy * dy;
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return bestIdx;
};

const slotsFromValue = (
  scheme: FormationScheme,
  positions: { playerId: string; x: number; y: number }[],
): FieldSlot[] => {
  const fresh = buildEmptySlots(scheme);
  for (const pp of positions) {
    const idx = findClosestEmptySlot(fresh, pp.x, pp.y);
    if (idx === -1) continue;
    fresh[idx] = { ...fresh[idx], x: pp.x, y: pp.y, playerId: pp.playerId };
  }
  return fresh;
};

const slotsToPositions = (slots: FieldSlot[]) =>
  slots
    .filter((s) => s.playerId)
    .map((s) => ({ playerId: s.playerId!, x: s.x, y: s.y }));

export default function LineupEditor({ pool, value, onChange }: Props) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(
    null,
  );
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 120, tolerance: 5 },
    }),
  );

  const slots = useMemo(
    () => slotsFromValue(value.scheme, value.positions),
    [value.scheme, value.positions],
  );

  const candidateById = useMemo(() => {
    const map = new Map<string, LineupCandidate>();
    for (const c of pool) map.set(c.playerId, c);
    return map;
  }, [pool]);

  const placedIds = useMemo(
    () =>
      new Set(slots.filter((s) => s.playerId).map((s) => s.playerId as string)),
    [slots],
  );

  const availablePlayers = useMemo(
    () => pool.filter((p) => !placedIds.has(p.playerId)),
    [pool, placedIds],
  );

  const commitSlots = (next: FieldSlot[]) => {
    onChange({ scheme: value.scheme, positions: slotsToPositions(next) });
  };

  const assignPlayerToSlot = (slotIndex: number, playerId: string) => {
    const next = slots.map((s) => {
      if (s.playerId === playerId) return { ...s, playerId: undefined };
      if (s.slotIndex === slotIndex) return { ...s, playerId };
      return s;
    });
    commitSlots(next);
  };

  const removeFromSlot = (slotIndex: number) => {
    const next = slots.map((s) =>
      s.slotIndex === slotIndex ? { ...s, playerId: undefined } : s,
    );
    commitSlots(next);
  };

  const removePlayerById = (playerId: string) => {
    const next = slots.map((s) =>
      s.playerId === playerId ? { ...s, playerId: undefined } : s,
    );
    commitSlots(next);
  };

  const moveSlot = (slotIndex: number, dx: number, dy: number) => {
    const next = slots.map((s) =>
      s.slotIndex === slotIndex
        ? { ...s, x: clamp(s.x + dx), y: clamp(s.y + dy) }
        : s,
    );
    commitSlots(next);
  };

  const setScheme = (scheme: FormationScheme) => {
    const fresh = buildEmptySlots(scheme);
    const assigned = slots.filter((s) => s.playerId);
    for (const old of assigned) {
      const idx = findClosestEmptySlot(fresh, old.x, old.y);
      if (idx === -1) continue;
      fresh[idx] = { ...fresh[idx], playerId: old.playerId };
    }
    onChange({ scheme, positions: slotsToPositions(fresh) });
    setSelectedSlotIndex(null);
  };

  const clearField = () => {
    onChange({ scheme: value.scheme, positions: [] });
    setSelectedSlotIndex(null);
    setSelectedPlayerId(null);
  };

  const handleSlotClick = (slotIndex: number) => {
    if (selectedPlayerId) {
      assignPlayerToSlot(slotIndex, selectedPlayerId);
      setSelectedPlayerId(null);
      setSelectedSlotIndex(null);
      return;
    }
    setSelectedSlotIndex((prev) => (prev === slotIndex ? null : slotIndex));
  };

  const handlePlayerSelect = (playerId: string) => {
    if (selectedSlotIndex !== null) {
      assignPlayerToSlot(selectedSlotIndex, playerId);
      setSelectedSlotIndex(null);
      setSelectedPlayerId(null);
      return;
    }
    setSelectedPlayerId((prev) => (prev === playerId ? null : playerId));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const data = event.active.data.current as
      | { type: 'panel' | 'marker'; playerId?: string }
      | undefined;
    if (!data) return;
    const field = fieldRef.current;
    if (!field) return;
    const fieldRect = field.getBoundingClientRect();
    const overId = event.over?.id;
    const overData = event.over?.data.current as
      | { type?: 'slot'; slotIndex?: number }
      | undefined;
    const droppedOnField = overId === FIELD_DROPPABLE_ID || !!overData;

    if (data.type === 'panel' && data.playerId) {
      const playerId = data.playerId;
      if (placedIds.has(playerId)) return;
      if (!droppedOnField) return;
      let targetSlotIndex = -1;
      if (overData?.type === 'slot' && typeof overData.slotIndex === 'number') {
        const target = slots.find((s) => s.slotIndex === overData.slotIndex);
        if (target && !target.playerId) targetSlotIndex = overData.slotIndex;
      }
      if (targetSlotIndex === -1) {
        const translated = event.active.rect.current.translated;
        if (!translated) return;
        const centerX = translated.left + translated.width / 2;
        const centerY = translated.top + translated.height / 2;
        const x = ((centerX - fieldRect.left) / fieldRect.width) * 100;
        const y = ((centerY - fieldRect.top) / fieldRect.height) * 100;
        targetSlotIndex = findClosestEmptySlot(slots, x, y);
      }
      if (targetSlotIndex === -1) return;
      assignPlayerToSlot(targetSlotIndex, playerId);
      return;
    }

    if (data.type === 'marker' && data.playerId) {
      const playerId = data.playerId;
      if (!droppedOnField) {
        removePlayerById(playerId);
        return;
      }
      const slot = slots.find((s) => s.playerId === playerId);
      if (!slot) return;
      const { x: dx, y: dy } = event.delta;
      const dxPercent = (dx / fieldRect.width) * 100;
      const dyPercent = (dy / fieldRect.height) * 100;
      moveSlot(slot.slotIndex, dxPercent, dyPercent);
    }
  };

  const placed = slots.length;
  const placedCount = slots.filter((s) => s.playerId).length;

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="grid gap-3 md:grid-cols-[1fr_220px]">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-1.5 text-sm">
              <span className="font-medium text-gray-700">Esquema</span>
              <select
                value={value.scheme}
                onChange={(e) => setScheme(e.target.value as FormationScheme)}
                className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {FORMATION_SCHEMES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <span className="text-xs text-gray-500">
              {placedCount}/{placed} posicionados
            </span>
            {placedCount > 0 && (
              <button
                type="button"
                onClick={clearField}
                className="ml-auto text-xs text-gray-600 underline hover:text-gray-900"
              >
                Limpar campo
              </button>
            )}
          </div>
          <TacticalBoard ref={fieldRef} droppableId={FIELD_DROPPABLE_ID}>
            {slots.map((slot) => {
              if (!slot.playerId) {
                return (
                  <EmptySlot
                    key={`slot-${slot.slotIndex}`}
                    slotIndex={slot.slotIndex}
                    role={slot.role}
                    x={slot.x}
                    y={slot.y}
                    selected={selectedSlotIndex === slot.slotIndex}
                    onClick={handleSlotClick}
                  />
                );
              }
              const c = candidateById.get(slot.playerId);
              return (
                <PlayerMarker
                  key={`marker-${slot.playerId}`}
                  position={{
                    playerId: slot.playerId,
                    playerName: c?.playerName ?? '???',
                    playerNumber: c?.playerNumber,
                    x: slot.x,
                    y: slot.y,
                  }}
                  onRemove={() => removeFromSlot(slot.slotIndex)}
                />
              );
            })}
          </TacticalBoard>
        </div>

        <aside className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-900">
            Disponíveis ({availablePlayers.length})
          </h4>
          {pool.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-center text-xs text-gray-500">
              Marque jogadores confirmados ou adicione convidados para escalar.
            </p>
          ) : availablePlayers.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-center text-xs text-gray-500">
              Todos no campo.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {availablePlayers.map((p) => (
                <DraggableCandidate
                  key={p.playerId}
                  candidate={p}
                  selected={selectedPlayerId === p.playerId}
                  onSelect={handlePlayerSelect}
                />
              ))}
            </ul>
          )}
        </aside>
      </div>
    </DndContext>
  );
}

function DraggableCandidate({
  candidate,
  selected,
  onSelect,
}: {
  candidate: LineupCandidate;
  selected: boolean;
  onSelect: (playerId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `panel:${candidate.playerId}`,
      data: { type: 'panel', playerId: candidate.playerId },
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
      onClick={() => onSelect(candidate.playerId)}
      className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 shadow-sm cursor-pointer active:cursor-grabbing touch-none ${baseClass}`}
    >
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-semibold">
        {candidate.playerNumber !== undefined ? (
          <>
            <Hash className="mr-0.5 h-3 w-3" />
            {candidate.playerNumber}
          </>
        ) : (
          <User className="h-4 w-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">
          {candidate.playerName}
        </p>
        {candidate.label && (
          <p className="truncate text-[11px] text-gray-500">{candidate.label}</p>
        )}
      </div>
    </li>
  );
}
