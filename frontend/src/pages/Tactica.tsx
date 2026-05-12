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
import { comparePlayers } from '../utils/constants';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToast } from '../components/Toast';
import { TacticalBoard } from '../components/tactical/TacticalBoard';
import PlayerMarker from '../components/tactical/PlayerMarker';
import PlayerListPanel from '../components/tactical/PlayerListPanel';
import FormationSelector from '../components/tactical/FormationSelector';
import FormationList from '../components/tactical/FormationList';
import FormationModal from '../components/tactical/FormationModal';
import ShareButton from '../components/tactical/ShareButton';
import ExportButton from '../components/tactical/ExportButton';

const FIELD_DROPPABLE_ID = 'tactical-field';
const DEFAULT_SCHEME: FormationScheme = '4-4-2';

type SidebarTab = 'players' | 'formations';

type PlacedPosition = FormationPlayerPosition;

const clamp = (value: number, min = 0, max = 100): number =>
  Math.min(max, Math.max(min, value));

const toPlacedFromPlayer = (
  player: Player,
  x: number,
  y: number,
): PlacedPosition => ({
  playerId: player.playerId,
  playerName: player.name,
  playerNumber: player.number,
  x: clamp(x),
  y: clamp(y),
});

const sortPlayersForDisplay = (players: Player[]): Player[] =>
  [...players].sort(comparePlayers);

const reflowToScheme = (
  current: PlacedPosition[],
  scheme: FormationScheme,
): PlacedPosition[] => {
  if (current.length === 0) return [];
  const slots = FORMATION_SLOTS[scheme];
  const usedSlots = new Set<number>();
  const out: PlacedPosition[] = [];
  for (const p of current) {
    let bestIdx = -1;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < slots.length; i++) {
      if (usedSlots.has(i)) continue;
      const dx = slots[i].x - p.x;
      const dy = slots[i].y - p.y;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    if (bestIdx === -1) {
      out.push(p);
    } else {
      usedSlots.add(bestIdx);
      out.push({ ...p, x: slots[bestIdx].x, y: slots[bestIdx].y });
    }
  }
  return out;
};

const fillEmptyFromScheme = (
  players: Player[],
  scheme: FormationScheme,
): PlacedPosition[] => {
  const slots = FORMATION_SLOTS[scheme];
  const sorted = sortPlayersForDisplay(players);
  return sorted.slice(0, slots.length).map((player, idx) =>
    toPlacedFromPlayer(player, slots[idx].x, slots[idx].y),
  );
};

export default function Tactica() {
  const { teamId = '' } = useParams<{ teamId: string }>();
  const { showSuccess, showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<{ name: string } | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [formations, setFormations] = useState<Formation[]>([]);

  const [scheme, setScheme] = useState<FormationScheme>(DEFAULT_SCHEME);
  const [placed, setPlaced] = useState<PlacedPosition[]>([]);
  const [currentFormation, setCurrentFormation] = useState<Formation | null>(
    null,
  );

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
          setPlaced(active.playerPositions);
        } else {
          setCurrentFormation(null);
          setScheme(DEFAULT_SCHEME);
          setPlaced([]);
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
    () => new Set(placed.map((p) => p.playerId)),
    [placed],
  );

  const availablePlayers = useMemo(
    () => sortPlayersForDisplay(players.filter((p) => !placedIds.has(p.playerId))),
    [players, placedIds],
  );

  const playerById = useMemo(() => {
    const map = new Map<string, Player>();
    for (const p of players) map.set(p.playerId, p);
    return map;
  }, [players]);

  const setSchemeAndReflow = (next: FormationScheme) => {
    setScheme(next);
    setPlaced((prev) => reflowToScheme(prev, next));
  };

  const placeFromList = (player: Player, x: number, y: number) => {
    setPlaced((prev) => [...prev, toPlacedFromPlayer(player, x, y)]);
  };

  const moveOnField = (playerId: string, dx: number, dy: number) => {
    setPlaced((prev) =>
      prev.map((p) =>
        p.playerId === playerId
          ? { ...p, x: clamp(p.x + dx), y: clamp(p.y + dy) }
          : p,
      ),
    );
  };

  const removeFromField = (playerId: string) => {
    setPlaced((prev) => prev.filter((p) => p.playerId !== playerId));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const data = event.active.data.current as
      | { type: 'panel' | 'marker'; playerId: string }
      | undefined;
    if (!data) return;
    const field = fieldRef.current;
    if (!field) return;
    const fieldRect = field.getBoundingClientRect();
    const droppedOnField = event.over?.id === FIELD_DROPPABLE_ID;

    if (data.type === 'panel') {
      if (!droppedOnField) return;
      const player = playerById.get(data.playerId);
      if (!player) return;
      const translated = event.active.rect.current.translated;
      if (!translated) return;
      const centerX = translated.left + translated.width / 2;
      const centerY = translated.top + translated.height / 2;
      const x = ((centerX - fieldRect.left) / fieldRect.width) * 100;
      const y = ((centerY - fieldRect.top) / fieldRect.height) * 100;
      if (placedIds.has(player.playerId)) return;
      placeFromList(player, x, y);
      return;
    }

    if (data.type === 'marker') {
      if (!droppedOnField) {
        removeFromField(data.playerId);
        return;
      }
      const dx = (event.delta.x / fieldRect.width) * 100;
      const dy = (event.delta.y / fieldRect.height) * 100;
      moveOnField(data.playerId, dx, dy);
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

  const saveFormation = async (values: { name: string; isActive: boolean }) => {
    setSaving(true);
    try {
      if (modalMode === 'create') {
        const payload = {
          name: values.name,
          scheme,
          isActive: values.isActive,
          playerPositions: placed.map((p) => ({
            playerId: p.playerId,
            x: p.x,
            y: p.y,
          })),
        };
        const created = await api.createFormation(teamId, payload);
        setCurrentFormation(created);
        showSuccess('Formação criada!');
      } else if (modalTarget) {
        const payload = {
          name: values.name,
          scheme: modalTarget.scheme,
          isActive: values.isActive,
          playerPositions: modalTarget.playerPositions.map((p) => ({
            playerId: p.playerId,
            x: p.x,
            y: p.y,
          })),
        };
        const updated = await api.updateFormation(
          teamId,
          modalTarget.formationId,
          payload,
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
      const payload = {
        name: currentFormation.name,
        scheme,
        isActive: currentFormation.isActive,
        playerPositions: placed.map((p) => ({
          playerId: p.playerId,
          x: p.x,
          y: p.y,
        })),
      };
      const updated = await api.updateFormation(
        teamId,
        currentFormation.formationId,
        payload,
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
    setPlaced(formation.playerPositions);
    setTab('players');
    showSuccess(`Formação "${formation.name}" carregada`);
  };

  const handleDeleteFormation = async (formation: Formation) => {
    if (
      !window.confirm(`Excluir a formação "${formation.name}"? Esta ação não pode ser desfeita.`)
    ) {
      return;
    }
    try {
      await api.deleteFormation(teamId, formation.formationId);
      if (currentFormation?.formationId === formation.formationId) {
        setCurrentFormation(null);
        setPlaced([]);
      }
      await refreshFormations();
      showSuccess('Formação excluída');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erro ao excluir');
    }
  };

  const handleFillFromScheme = () => {
    const filled = fillEmptyFromScheme(players, scheme);
    setPlaced(filled);
  };

  if (loading) {
    return <LoadingSpinner label="Carregando tática..." />;
  }

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
                onClick={handleFillFromScheme}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Preencher pelo esquema
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

            <TacticalBoard
              ref={fieldRef}
              droppableId={FIELD_DROPPABLE_ID}
              teamName={team?.name}
              formationName={currentFormation?.name}
              scheme={scheme}
            >
              {placed.map((p) => (
                <PlayerMarker
                  key={p.playerId}
                  position={p}
                  onRemove={removeFromField}
                />
              ))}
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
                <PlayerListPanel players={availablePlayers} />
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
            <p className="text-xs text-gray-500 leading-relaxed">
              Arraste jogadores da lista para o campo, ou os marcadores no campo
              para reposicionar. Arraste um jogador para fora do campo para
              removê-lo da formação.
            </p>
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
