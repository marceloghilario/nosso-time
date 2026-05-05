export type Plan = 'FREE' | 'PRO';

export interface Team {
  teamId: string;
  ownerId: string;
  name: string;
  description?: string;
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
  | 'ATACANTE';

export const PLAYER_POSITIONS: PlayerPosition[] = [
  'GOLEIRO',
  'ZAGUEIRO',
  'LATERAL',
  'VOLANTE',
  'MEIA',
  'ATACANTE',
];

export interface Player {
  playerId: string;
  teamId: string;
  name: string;
  position: PlayerPosition;
  number: number;
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
