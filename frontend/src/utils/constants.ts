import type { GameStatus, PlayerPosition } from '../types';

export const API_URL: string = import.meta.env.VITE_API_URL ?? '';

export const AUTH_STORAGE_KEY = 'nosso-time:auth';

export const PLAYER_POSITION_LABELS: Record<PlayerPosition, string> = {
  GOLEIRO: 'Goleiro',
  ZAGUEIRO: 'Zagueiro',
  LATERAL: 'Lateral',
  VOLANTE: 'Volante',
  MEIA: 'Meia',
  ATACANTE: 'Atacante',
};

const PLAYER_POSITION_ORDER: Record<PlayerPosition, number> = {
  GOLEIRO: 0,
  LATERAL: 1,
  ZAGUEIRO: 2,
  VOLANTE: 3,
  MEIA: 4,
  ATACANTE: 5,
};

export function comparePlayers(
  a: { position: PlayerPosition; number?: number; name: string },
  b: { position: PlayerPosition; number?: number; name: string }
): number {
  const positionDiff =
    PLAYER_POSITION_ORDER[a.position] - PLAYER_POSITION_ORDER[b.position];
  if (positionDiff !== 0) return positionDiff;
  if (a.number === undefined && b.number === undefined) {
    return a.name.localeCompare(b.name);
  }
  if (a.number === undefined) return 1;
  if (b.number === undefined) return -1;
  return a.number - b.number;
}

export const GAME_STATUS_LABELS: Record<GameStatus, string> = {
  AGENDADO: 'Agendado',
  REALIZADO: 'Realizado',
};
