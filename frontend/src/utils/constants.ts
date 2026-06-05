import type { GameStatus, Modality, PlayerPosition } from '../types';

export const API_URL: string = import.meta.env.VITE_API_URL ?? '';

export const AUTH_STORAGE_KEY = 'nosso-time:auth';

export const PLAYER_POSITION_LABELS: Record<PlayerPosition, string> = {
  GOLEIRO: 'Goleiro',
  ZAGUEIRO: 'Zagueiro',
  LATERAL: 'Lateral',
  VOLANTE: 'Volante',
  MEIA: 'Meia',
  ATACANTE: 'Atacante',
  FIXO: 'Fixo',
  ALA: 'Ala',
  PIVO: 'Pivô',
};

export const GAME_STATUS_LABELS: Record<GameStatus, string> = {
  AGENDADO: 'Agendado',
  REALIZADO: 'Realizado',
};

export const MODALITY_LABELS: Record<Modality, string> = {
  FUTEBOL: 'Futebol de campo',
  FUTSAL: 'Futsal',
};
