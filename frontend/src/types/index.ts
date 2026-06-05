export type Plan = 'FREE' | 'PRO';

export type Modality = 'FUTEBOL' | 'FUTSAL';

export interface Team {
  teamId: string;
  ownerId: string;
  name: string;
  description?: string;
  modality?: Modality;
  plan: Plan;
  photoCount: number;
  createdAt: string;
  updatedAt: string;
}

export type PlayerPosition =
  | 'GOLEIRO'
  | 'ZAGUEIRO'
  | 'LATERAL'
  | 'VOLANTE'
  | 'MEIA'
  | 'ATACANTE'
  | 'FIXO'
  | 'ALA'
  | 'PIVO';

export const PLAYER_POSITIONS: PlayerPosition[] = [
  'GOLEIRO',
  'ZAGUEIRO',
  'LATERAL',
  'VOLANTE',
  'MEIA',
  'ATACANTE',
  'FIXO',
  'ALA',
  'PIVO',
];

export const POSITIONS_BY_MODALITY: Record<Modality, PlayerPosition[]> = {
  FUTEBOL: ['GOLEIRO', 'ZAGUEIRO', 'LATERAL', 'VOLANTE', 'MEIA', 'ATACANTE'],
  FUTSAL: ['GOLEIRO', 'FIXO', 'ALA', 'PIVO'],
};

export type FormationScheme =
  | '4-4-2'
  | '4-3-3'
  | '3-5-2'
  | '4-2-3-1'
  | '5-3-2'
  | '3-4-3'
  | '4-1-4-1'
  | '1-2-1'
  | '2-2'
  | '3-1'
  | '4-0';

export const SCHEMES_BY_MODALITY: Record<Modality, FormationScheme[]> = {
  FUTEBOL: ['4-4-2', '4-3-3', '3-5-2', '4-2-3-1', '5-3-2', '3-4-3', '4-1-4-1'],
  FUTSAL: ['1-2-1', '2-2', '3-1', '4-0'],
};

export interface Player {
  playerId: string;
  teamId: string;
  name: string;
  position: PlayerPosition;
  number?: number;
  characteristics?: string;
  createdAt: string;
  updatedAt: string;
}

export type GameStatus = 'AGENDADO' | 'REALIZADO';

export interface GameResult {
  scoreFor: number;
  scoreAgainst: number;
}

export interface Game {
  gameId: string;
  teamId: string;
  date: string;
  time: string;
  location: string;
  opponent: string;
  status: GameStatus;
  result?: GameResult;
  createdAt: string;
  updatedAt: string;
}

export type MediaType = 'PHOTO' | 'VIDEO';

export interface Media {
  mediaId: string;
  teamId: string;
  gameId?: string;
  ownerId: string;
  type: MediaType;
  s3Key: string;
  contentType: string;
  caption?: string;
  createdAt: string;
  url?: string;
}

export interface AuthUser {
  email: string;
}

export interface AuthSession {
  idToken: string;
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  email: string;
}

export type ApiSuccess<T> = { success: true; data: T };
export type ApiFailure = { success: false; error: string };
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
