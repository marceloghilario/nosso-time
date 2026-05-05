import { API_URL, AUTH_STORAGE_KEY } from '../utils/constants';
import type {
  AuthSession,
  Game,
  GameResult,
  GameStatus,
  Media,
  MediaType,
  Player,
  PlayerPosition,
  Team,
} from '../types';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const getStoredToken = (): string | null => {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthSession;
    return parsed.idToken ?? null;
  } catch {
    return null;
  }
};

const handle401 = (): void => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  signal?: AbortSignal;
}

interface ApiSuccessBody<T> {
  success: true;
  data: T;
}

interface ApiErrorBody {
  success: false;
  error: string;
}

const isErrorBody = (value: unknown): value is ApiErrorBody =>
  typeof value === 'object' &&
  value !== null &&
  'success' in value &&
  (value as { success: unknown }).success === false;

const isSuccessBody = <T>(value: unknown): value is ApiSuccessBody<T> =>
  typeof value === 'object' &&
  value !== null &&
  'success' in value &&
  (value as { success: unknown }).success === true;

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!API_URL) {
    throw new ApiError(
      'API URL não configurada. Defina VITE_API_URL no .env.',
      500,
    );
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (options.auth !== false) {
    const token = getStoredToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  let payload: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (response.status === 401 && options.auth !== false) {
    handle401();
    const message = isErrorBody(payload)
      ? payload.error
      : 'Sessão expirada. Faça login novamente.';
    throw new ApiError(message, 401);
  }

  if (!response.ok) {
    const message = isErrorBody(payload)
      ? payload.error
      : `Erro na requisição (${response.status})`;
    throw new ApiError(message, response.status);
  }

  if (isSuccessBody<T>(payload)) {
    return payload.data;
  }
  throw new ApiError('Resposta inesperada da API', 500);
}

export interface SignupInput {
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface CreateTeamInput {
  name: string;
  description?: string;
}

export interface CreatePlayerInput {
  name: string;
  position: PlayerPosition;
  number: number;
  characteristics?: string;
}

export interface CreateGameInput {
  date: string;
  time: string;
  location: string;
  opponent: string;
  status: GameStatus;
  result?: GameResult;
}

export interface UploadUrlInput {
  contentType: string;
  fileName: string;
  type: MediaType;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  s3Key: string;
}

export interface CreateMediaInput {
  s3Key: string;
  contentType: string;
  type: MediaType;
  gameId?: string;
  caption?: string;
}

export const api = {
  signup: (input: SignupInput) =>
    request<{ email: string }>('/auth/signup', {
      method: 'POST',
      body: input,
      auth: false,
    }),
  login: (input: LoginInput) =>
    request<AuthSession>('/auth/login', {
      method: 'POST',
      body: input,
      auth: false,
    }),

  listTeams: () => request<Team[]>('/teams'),
  createTeam: (input: CreateTeamInput) =>
    request<Team>('/teams', { method: 'POST', body: input }),
  getTeam: (teamId: string) => request<Team>(`/teams/${teamId}`),

  listPlayers: (teamId: string) =>
    request<Player[]>(`/teams/${teamId}/players`),
  createPlayer: (teamId: string, input: CreatePlayerInput) =>
    request<Player>(`/teams/${teamId}/players`, {
      method: 'POST',
      body: input,
    }),

  listGames: (teamId: string) => request<Game[]>(`/teams/${teamId}/games`),
  createGame: (teamId: string, input: CreateGameInput) =>
    request<Game>(`/teams/${teamId}/games`, {
      method: 'POST',
      body: input,
    }),

  getMediaUploadUrl: (teamId: string, input: UploadUrlInput) =>
    request<UploadUrlResponse>(`/teams/${teamId}/media/upload-url`, {
      method: 'POST',
      body: input,
    }),
  createMedia: (teamId: string, input: CreateMediaInput) =>
    request<Media>(`/teams/${teamId}/media`, {
      method: 'POST',
      body: input,
    }),
  listMediaByTeam: (teamId: string) =>
    request<Media[]>(`/teams/${teamId}/media`),
  listMediaByGame: (teamId: string, gameId: string) =>
    request<Media[]>(`/teams/${teamId}/games/${gameId}/media`),

  uploadToS3: async (
    uploadUrl: string,
    file: File,
    contentType: string,
  ): Promise<void> => {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': contentType },
    });
    if (!response.ok) {
      throw new ApiError('Falha ao enviar o arquivo para o S3', response.status);
    }
  },
};
