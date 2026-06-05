import type { FormationScheme, PlayerPosition } from '../types';

export interface FormationSlot {
  x: number;
  y: number;
  label: PlayerPosition;
}

/**
 * Positions are expressed as percentages (0–100) of the field/court dimensions.
 * x = horizontal (left-right), y = vertical (bottom=0 → top=100, attacking direction).
 */
export const FORMATION_SLOTS: Record<FormationScheme, FormationSlot[]> = {
  // --- FUTEBOL (11 players) ---
  '4-4-2': [
    { x: 50, y: 5, label: 'GOLEIRO' },
    { x: 15, y: 25, label: 'LATERAL' },
    { x: 38, y: 22, label: 'ZAGUEIRO' },
    { x: 62, y: 22, label: 'ZAGUEIRO' },
    { x: 85, y: 25, label: 'LATERAL' },
    { x: 15, y: 50, label: 'MEIA' },
    { x: 38, y: 48, label: 'VOLANTE' },
    { x: 62, y: 48, label: 'VOLANTE' },
    { x: 85, y: 50, label: 'MEIA' },
    { x: 35, y: 75, label: 'ATACANTE' },
    { x: 65, y: 75, label: 'ATACANTE' },
  ],
  '4-3-3': [
    { x: 50, y: 5, label: 'GOLEIRO' },
    { x: 15, y: 25, label: 'LATERAL' },
    { x: 38, y: 22, label: 'ZAGUEIRO' },
    { x: 62, y: 22, label: 'ZAGUEIRO' },
    { x: 85, y: 25, label: 'LATERAL' },
    { x: 30, y: 48, label: 'VOLANTE' },
    { x: 50, y: 50, label: 'MEIA' },
    { x: 70, y: 48, label: 'VOLANTE' },
    { x: 20, y: 75, label: 'ATACANTE' },
    { x: 50, y: 78, label: 'ATACANTE' },
    { x: 80, y: 75, label: 'ATACANTE' },
  ],
  '3-5-2': [
    { x: 50, y: 5, label: 'GOLEIRO' },
    { x: 25, y: 22, label: 'ZAGUEIRO' },
    { x: 50, y: 20, label: 'ZAGUEIRO' },
    { x: 75, y: 22, label: 'ZAGUEIRO' },
    { x: 10, y: 45, label: 'LATERAL' },
    { x: 30, y: 48, label: 'VOLANTE' },
    { x: 50, y: 50, label: 'MEIA' },
    { x: 70, y: 48, label: 'VOLANTE' },
    { x: 90, y: 45, label: 'LATERAL' },
    { x: 35, y: 75, label: 'ATACANTE' },
    { x: 65, y: 75, label: 'ATACANTE' },
  ],
  '4-2-3-1': [
    { x: 50, y: 5, label: 'GOLEIRO' },
    { x: 15, y: 25, label: 'LATERAL' },
    { x: 38, y: 22, label: 'ZAGUEIRO' },
    { x: 62, y: 22, label: 'ZAGUEIRO' },
    { x: 85, y: 25, label: 'LATERAL' },
    { x: 35, y: 42, label: 'VOLANTE' },
    { x: 65, y: 42, label: 'VOLANTE' },
    { x: 20, y: 62, label: 'MEIA' },
    { x: 50, y: 64, label: 'MEIA' },
    { x: 80, y: 62, label: 'MEIA' },
    { x: 50, y: 82, label: 'ATACANTE' },
  ],
  '5-3-2': [
    { x: 50, y: 5, label: 'GOLEIRO' },
    { x: 10, y: 25, label: 'LATERAL' },
    { x: 30, y: 22, label: 'ZAGUEIRO' },
    { x: 50, y: 20, label: 'ZAGUEIRO' },
    { x: 70, y: 22, label: 'ZAGUEIRO' },
    { x: 90, y: 25, label: 'LATERAL' },
    { x: 25, y: 50, label: 'VOLANTE' },
    { x: 50, y: 52, label: 'MEIA' },
    { x: 75, y: 50, label: 'VOLANTE' },
    { x: 35, y: 75, label: 'ATACANTE' },
    { x: 65, y: 75, label: 'ATACANTE' },
  ],
  '3-4-3': [
    { x: 50, y: 5, label: 'GOLEIRO' },
    { x: 25, y: 22, label: 'ZAGUEIRO' },
    { x: 50, y: 20, label: 'ZAGUEIRO' },
    { x: 75, y: 22, label: 'ZAGUEIRO' },
    { x: 15, y: 45, label: 'LATERAL' },
    { x: 38, y: 48, label: 'VOLANTE' },
    { x: 62, y: 48, label: 'VOLANTE' },
    { x: 85, y: 45, label: 'LATERAL' },
    { x: 20, y: 75, label: 'ATACANTE' },
    { x: 50, y: 78, label: 'ATACANTE' },
    { x: 80, y: 75, label: 'ATACANTE' },
  ],
  '4-1-4-1': [
    { x: 50, y: 5, label: 'GOLEIRO' },
    { x: 15, y: 25, label: 'LATERAL' },
    { x: 38, y: 22, label: 'ZAGUEIRO' },
    { x: 62, y: 22, label: 'ZAGUEIRO' },
    { x: 85, y: 25, label: 'LATERAL' },
    { x: 50, y: 38, label: 'VOLANTE' },
    { x: 15, y: 58, label: 'MEIA' },
    { x: 38, y: 55, label: 'MEIA' },
    { x: 62, y: 55, label: 'MEIA' },
    { x: 85, y: 58, label: 'MEIA' },
    { x: 50, y: 80, label: 'ATACANTE' },
  ],

  // --- FUTSAL (5 players) ---
  '1-2-1': [
    { x: 50, y: 8, label: 'GOLEIRO' },
    { x: 50, y: 30, label: 'FIXO' },
    { x: 25, y: 55, label: 'ALA' },
    { x: 75, y: 55, label: 'ALA' },
    { x: 50, y: 80, label: 'PIVO' },
  ],
  '2-2': [
    { x: 50, y: 8, label: 'GOLEIRO' },
    { x: 30, y: 35, label: 'FIXO' },
    { x: 70, y: 35, label: 'ALA' },
    { x: 30, y: 65, label: 'ALA' },
    { x: 70, y: 65, label: 'PIVO' },
  ],
  '3-1': [
    { x: 50, y: 8, label: 'GOLEIRO' },
    { x: 20, y: 38, label: 'ALA' },
    { x: 50, y: 35, label: 'FIXO' },
    { x: 80, y: 38, label: 'ALA' },
    { x: 50, y: 72, label: 'PIVO' },
  ],
  '4-0': [
    { x: 50, y: 8, label: 'GOLEIRO' },
    { x: 20, y: 45, label: 'ALA' },
    { x: 45, y: 55, label: 'FIXO' },
    { x: 55, y: 55, label: 'ALA' },
    { x: 80, y: 45, label: 'PIVO' },
  ],
};

export const DEFAULT_SCHEME_BY_MODALITY: Record<string, FormationScheme> = {
  FUTEBOL: '4-4-2',
  FUTSAL: '1-2-1',
};
