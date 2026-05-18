import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ListChecks,
  Plus,
  Save,
  Users,
} from 'lucide-react';
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { api, ApiError } from '../services/api';
import type {
  Formation,
  FormationPlayerPosition,
  FormationScheme,
  Player,
} from '../types';
import { FORMATION_SLOTS } from '../utils/formationSchemes';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToast } from '../components/Toast';
import { TacticalBoard } from '../components/tactical/TacticalBoard';
import PlayerMarker from '../components/tactical/PlayerMarker';
import PlayerListPanel from '../components/tactical/PlayerListPanel';
import EmptySlot from '../components/tactical/EmptySlot';
import FormationSelector from '../components/tactical/FormationSelector';
import FormationList from '../components/tactical/FormationList';
import FormationModal from '../components/tactical/FormationModal';
import ShareButton from '../components/tactical/ShareButton';
import ExportButton from '../components/tactical/ExportButton';

const FIELD_DROPPABLE_ID = 'tactical-field';
const DEFAULT_SCHEME: FormationScheme = '4-4-2';

type SidebarTab = 'players' | 'formations';

interface SlotAssignment {
  playerId: string;
  playerName: string;
  playerNumber?: number;
}

interface FieldSlot {
  slotIndex: number;
  role: string;
  x: number;
  y: number;
  player?: SlotAssignment;
}

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
    if (slots[i].player) continue;
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

const slotsFromFormation = (
  scheme: FormationScheme,
  positions: FormationPlayerPosition[],
): FieldSlot[] => {
  const fresh = buildEmptySlots(scheme);
  for (const pp of positions) {
    const idx = findClosestEmptySlot(fresh, pp.x, pp.y);
    if (idx === -1) continue;
    fresh[idx] = {
      ...fresh[idx],
      x: pp.x,
      y: pp.y,
      player: {
        playerId: pp.playerId,
        playerName: pp.playerName,
        playerNumber: pp.playerNumber,
      },
    };
  }
  return fresh;
};

const reflowSlotsToScheme = (
  current: FieldSlot[],
  next: FormationScheme,
): FieldSlot[] => {
  const fresh = buildEmptySlots(next);
  const assigned = current.filter((s) => s.player);
  for (const old of assigned) {
    if (!old.player) continue;
    const idx = findClosestEmptySlot(fresh, old.x, old.y);
    if (idx === -1) continue;
    fresh[idx] = {
      ...fresh[idx],
      player: old.player,
    };
  }
  return fresh;
};

const toAssignment = (p: Player): SlotAssignment => ({
  playerId: p.playerId,
  playerName: p.name,
  playerNumber: p.number,
});

export default function Tactica() {
  const { teamId = '' } = useParams<{ teamId: string }>();
  const { showSuccess, showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<{ name: string } | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [formations, setFormations] = useState<Formation[]>([]);

  const [scheme, setScheme] = useState<FormationScheme>(DEFAULT_SCHEME);
  const [slots, setSlots] = useState<FieldSlot[]>(() =>
    buildEmptySlots(DEFAULT_SCHEME),
  );
  const [currentFormation, setCurrentFormation] = useState<Formation | null>(
    null,
  );
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(
    null,
  );
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const [tab, setTab] = useState<SidebarTab>('players');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'rename'>('create');
  const [modalTarget, setModalTarget] = useState<Formation | null>(null);
  const [saving, setSaving] = useState(false);

  const fieldRef = useRef<HTMLDivElement | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 120, tolerance: 5 },
    }),
  );

  useEffect(() => {
    if (!teamId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [teamData, playersData, formationsData] = await Promise.all([
          api.getTeam(teamId),
          api.listPlayers(teamId),
          api.listFormations(teamId),
        ]);
        if (cancelled) return;
        setTeam({ name: teamData.name });
        setPlayers(playersData);
        setFormations(formationsData);
        const active = formationsData.find((f) => f.isActive) ?? null;
        if (active) {
          setCurrentFormation(active);
          setScheme(active.scheme);
          setSlots(slotsFromFormation(active.scheme, active.playerPositions));
        } else {
          setCurrentFormation(null);
          setScheme(DEFAULT_SCHEME);
          setSlots(buildEmptySlots(DEFAULT_SCHEME));
        }
      } catch (err) {
        if (cancelled) return;
        showError(err instanceof Error ? err.message : 'Erro ao carregar tática');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [teamId, showError]);

  const placedIds = useMemo(
    () => new Set(slots.filter((s) => s.player).map((s) => s.player!.playerId)),
    [slots],
  );

  const availablePlayers = useMemo(
    () => players.filter((p) => !placedIds.has(p.playerId)),
    [players, placedIds],
  );

  const playerById = useMemo(() => {
    const map = new Map<string, Player>();
    for (const p of players) map.set(p.playerId, p);
    return map;
  }, [players]);

  const assignPlayerToSlot = (slotIndex: number, player: Player) => {
    setSlots((prev) =>
      prev.map((s) => {
        if (s.player?.playerId === player.playerId) {
          return { ...s, player: undefined };
        }
        if (s.slotIndex === slotIndex) {
          return { ...s, player: toAssignment(player) };
        }
        return s;
      }),
    );
  };

  const removeFromSlot = (slotIndex: number) => {
    setSlots((prev) =>
      prev.map((s) =>
        s.slotIndex === slotIndex ? { ...s, player: undefined } : s,
      ),
    );
  };

  const removePlayerById = (playerId: string) => {
    setSlots((prev) =>
      prev.map((s) =>
        s.player?.playerId === playerId ? { ...s, player: undefined } : s,
      ),
    );
  };

  const moveSlot = (slotIndex: number, dx: number, dy: number) => {
    setSlots((prev) =>
      prev.map((s) =>
        s.slotIndex === slotIndex
          ? { ...s, x: clamp(s.x + dx), y: clamp(s.y + dy) }
          : s,
      ),
    );
  };

  const setSchemeAndReflow = (next: FormationScheme) => {
    setScheme(next);
    setSlots((prev) => reflowSlotsToScheme(prev, next));
    setSelectedSlotIndex(null);
  };

  const handleSlotClick = (slotIndex: number) => {
    if (selectedPlayerId) {
      const player = playerById.get(selectedPlayerId);
      if (player) {
        assignPlayerToSlot(slotIndex, player);
        setSelectedPlayerId(null);
        setSelectedSlotIndex(null);
        return;
      }
    }
    setSelectedSlotIndex((prev) => (prev === slotIndex ? null : slotIndex));
  };

  const handlePlayerSelect = (playerId: string) => {
    if (selectedSlotIndex !== null) {
      const player = playerById.get(playerId);
      if (player) {
        assignPlayerToSlot(selectedSlotIndex, player);
        setSelectedSlotIndex(null);
        setSelectedPlayerId(null);
        return;
      }
    }
    setSelectedPlayerId((prev) => (prev === playerId ? null : playerId));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const data = event.active.data.current as
      | { type: 'panel' | 'marker'; playerId?: string; slotIndex?: number }
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
      const player = playerById.get(data.playerId);
      if (!player) return;
      if (placedIds.has(player.playerId)) return;
      if (!droppedOnField) return;
      let targetSlotIndex = -1;
      if (overData?.type === 'slot' && typeof overData.slotIndex === 'number') {
        const target = slots.find((s) => s.slotIndex === overData.slotIndex);
        if (target && !target.player) {
          targetSlotIndex = overData.slotIndex;
        }
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
      assignPlayerToSlot(targetSlotIndex, player);
      return;
    }

    if (data.type === 'marker' && data.playerId) {
      if (!droppedOnField) {
        removePlayerById(data.playerId);
        return;
      }
      const slot = slots.find((s) => s.player?.playerId === data.playerId);
      if (!slot) return;
      const dx = (event.delta.x / fieldRect.width) * 100;
      const dy = (event.delta.y / fieldRect.height) * 100;
      moveSlot(slot.slotIndex, dx, dy);
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setModalTarget(null);
    setModalOpen(true);
  };

  const openRenameModal = (formation: Formation) => {
    setModalMode('rename');
    setModalTarget(formation);
    setModalOpen(true);
  };

  const refreshFormations = async (): Promise<Formation[]> => {
    const updated = await api.listFormations(teamId);
    setFormations(updated);
    return updated;
  };

  const placedPositions = (): { playerId: string; x: number; y: number }[] =>
    slots
      .filter((s) => s.player)
      .map((s) => ({
        playerId: s.player!.playerId,
        x: s.x,
        y: s.y,
      }));

  const saveFormation = async (values: { name: string; isActive: boolean }) => {
    setSaving(true);
    try {
      if (modalMode === 'create') {
        const created = await api.createFormation(teamId, {
          name: values.name,
          scheme,
          isActive: values.isActive,
          playerPositions: placedPositions(),
        });
        setCurrentFormation(created);
        showSuccess('Formação criada!');
      } else if (modalTarget) {
        const updated = await api.updateFormation(
          teamId,
          modalTarget.formationId,
          {
            name: values.name,
            scheme: modalTarget.scheme,
            isActive: values.isActive,
            playerPositions: modalTarget.playerPositions.map((p) => ({
              playerId: p.playerId,
              x: p.x,
              y: p.y,
            })),
          },
        );
        if (currentFormation?.formationId === updated.formationId) {
          setCurrentFormation(updated);
        }
        showSuccess('Formação atualizada!');
      }
      await refreshFormations();
      setModalOpen(false);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erro ao salvar formação');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickSave = async () => {
    if (!currentFormation) {
      openCreateModal();
      return;
    }
    setSaving(true);
    try {
      const updated = await api.updateFormation(
        teamId,
        currentFormation.formationId,
        {
          name: currentFormation.name,
          scheme,
          isActive: currentFormation.isActive,
          playerPositions: placedPositions(),
        },
      );
      setCurrentFormation(updated);
      await refreshFormations();
      showSuccess('Formação salva!');
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        showError('Formação não existe mais. Crie uma nova.');
        setCurrentFormation(null);
      } else {
        showError(err instanceof Error ? err.message : 'Erro ao salvar');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLoadFormation = (formation: Formation) => {
    setCurrentFormation(formation);
    setScheme(formation.scheme);
    setSlots(slotsFromFormation(formation.scheme, formation.playerPositions));
    setSelectedSlotIndex(null);
    setSelectedPlayerId(null);
    setTab('players');
    showSuccess(`Formação "${formation.name}" carregada`);
  };

  const handleDeleteFormation = async (formation: Formation) => {
    if (
      !window.confirm(
        `Excluir a formação "${formation.name}"? Esta ação não pode ser desfeita.`,
      )
    ) {
      return;
    }
    try {
      await api.deleteFormation(teamId, formation.formationId);
      if (currentFormation?.formationId === formation.formationId) {
        setCurrentFormation(null);
        setSlots(buildEmptySlots(scheme));
      }
      await refreshFormations();
      showSuccess('Formação excluída');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erro ao excluir');
    }
  };

  const handleClearAll = () => {
    setSlots(buildEmptySlots(scheme));
    setSelectedSlotIndex(null);
    setSelectedPlayerId(null);
  };

  if (loading) {
    return <LoadingSpinner label="Carregando tática..." />;
  }

  const placedCount = slots.filter((s) => s.player).length;
  const totalSlots = slots.length;

  return (
    <div className="space-y-4">
      <Link
        to={`/teams/${teamId}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para o time
      </Link>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-3 shadow-sm border border-gray-100">
              <FormationSelector value={scheme} onChange={setSchemeAndReflow} />
              <button
                type="button"
                onClick={handleClearAll}
                disabled={placedCount === 0}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Limpar campo
              </button>
              <button
                type="button"
                onClick={openCreateModal}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
              >
                <Plus className="h-4 w-4" />
                Nova formação
              </button>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed px-1">
              Clique numa posição vazia e depois num jogador da lista (ou na
              ordem inversa) para escalá-lo. Você também pode arrastar um
              jogador da lista direto pra posição, ou arrastar um jogador já
              escalado para reposicionar/remover.{' '}
              <span className="font-medium text-gray-700">
                ({placedCount}/{totalSlots} escalados)
              </span>
            </p>

            <TacticalBoard
              ref={fieldRef}
              droppableId={FIELD_DROPPABLE_ID}
              teamName={team?.name}
              formationName={currentFormation?.name}
              scheme={scheme}
            >
              {slots.map((slot) =>
                slot.player ? (
                  <PlayerMarker
                    key={`m-${slot.slotIndex}`}
                    position={{
                      playerId: slot.player.playerId,
                      playerName: slot.player.playerName,
                      playerNumber: slot.player.playerNumber,
                      x: slot.x,
                      y: slot.y,
                    }}
                    onRemove={() => removeFromSlot(slot.slotIndex)}
                  />
                ) : (
                  <EmptySlot
                    key={`s-${slot.slotIndex}`}
                    slotIndex={slot.slotIndex}
                    role={slot.role}
                    x={slot.x}
                    y={slot.y}
                    selected={selectedSlotIndex === slot.slotIndex}
                    onClick={handleSlotClick}
                  />
                ),
              )}
            </TacticalBoard>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleQuickSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {currentFormation ? 'Salvar' : 'Salvar formação'}
              </button>
              <ExportButton
                targetRef={fieldRef}
                fileName={`${team?.name ?? 'formacao'}-${currentFormation?.name ?? 'tatica'}.png`}
                onError={showError}
              />
              <ShareButton
                shareToken={currentFormation?.shareToken ?? null}
                onError={showError}
              />
            </div>
          </div>

          <aside className="space-y-3">
            <div className="rounded-xl bg-white p-3 shadow-sm border border-gray-100">
              <div className="mb-2 flex gap-1 rounded-lg bg-gray-100 p-1 text-sm">
                <TabBtn
                  active={tab === 'players'}
                  onClick={() => setTab('players')}
                  icon={<Users className="h-4 w-4" />}
                  label={`Jogadores (${availablePlayers.length})`}
                />
                <TabBtn
                  active={tab === 'formations'}
                  onClick={() => setTab('formations')}
                  icon={<ListChecks className="h-4 w-4" />}
                  label="Formações"
                />
              </div>
              {tab === 'players' && (
                <PlayerListPanel
                  players={availablePlayers}
                  selectedPlayerId={selectedPlayerId}
                  onSelect={handlePlayerSelect}
                />
              )}
              {tab === 'formations' && (
                <FormationList
                  formations={formations}
                  currentId={currentFormation?.formationId ?? null}
                  onLoad={handleLoadFormation}
                  onRename={openRenameModal}
                  onDelete={handleDeleteFormation}
                />
              )}
            </div>
          </aside>
        </div>
      </DndContext>

      <FormationModal
        open={modalOpen}
        title={
          modalMode === 'rename'
            ? 'Renomear formação'
            : currentFormation
              ? 'Salvar como nova formação'
              : 'Nova formação'
        }
        initialName={modalMode === 'rename' ? modalTarget?.name ?? '' : ''}
        initialActive={
          modalMode === 'rename' ? modalTarget?.isActive ?? false : false
        }
        submitting={saving}
        onClose={() => setModalOpen(false)}
        onSubmit={saveFormation}
      />
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-white text-gray-900 shadow-sm'
          : 'text-gray-500 hover:text-gray-800'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
