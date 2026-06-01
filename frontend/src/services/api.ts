import { API_URL, AUTH_STORAGE_KEY } from '../utils/constants';
import type {
  AdminRequest,
  AuthSession,
  Championship,
  ChampionshipFormat,
  ChampionshipGameGoal,
  ChampionshipGameTeamView,
  FollowedTeam,
  Formation,
  FormationScheme,
  Game,
  GameResult,
  GameStatus,
  Media,
  MediaType,
  Player,
  PlayerPosition,
  PublicFormationView,
  PublicTeamDetail,
  PublicTeamSummary,
  Team,
  TeamMembership,
  TeamRole,
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

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  email: string;
  code: string;
  newPassword: string;
}

export interface CreateTeamInput {
  name: string;
  description?: string;
}

export interface UpdateTeamInput {
  name?: string;
  description?: string;
  logoS3Key?: string;
}

export interface LogoUploadUrlInput {
  contentType: string;
  fileName: string;
}

export interface CreatePlayerInput {
  name: string;
  position: PlayerPosition;
  number?: number;
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

export interface GameGoalInput {
  playerId: string;
  minute?: number;
}

export interface GameGuestInput {
  guestId?: string;
  name: string;
  position?: PlayerPosition;
  number?: number;
}

export interface GameLineupInput {
  scheme: string;
  positions: { playerId: string; x: number; y: number }[];
}

export interface UpdateGameInput {
  date: string;
  time: string;
  location: string;
  opponent: string;
  status: GameStatus;
  result?: GameResult;
  goals?: GameGoalInput[];
  confirmedPlayerIds?: string[];
  guests?: GameGuestInput[];
  lineup?: GameLineupInput;
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

export interface FormationPositionInput {
  playerId: string;
  x: number;
  y: number;
}

export interface SaveFormationInput {
  name: string;
  scheme: FormationScheme;
  playerPositions: FormationPositionInput[];
  isActive: boolean;
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
  forgotPassword: (input: ForgotPasswordInput) =>
    request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: input,
      auth: false,
    }),
  resetPassword: (input: ResetPasswordInput) =>
    request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: input,
      auth: false,
    }),

  listTeams: () => request<Team[]>('/teams'),
  createTeam: (input: CreateTeamInput) =>
    request<Team>('/teams', { method: 'POST', body: input }),
  getTeam: (teamId: string) => request<Team>(`/teams/${teamId}`),
  updateTeam: (teamId: string, input: UpdateTeamInput) =>
    request<Team>(`/teams/${teamId}`, { method: 'PUT', body: input }),
  getTeamLogoUploadUrl: (teamId: string, input: LogoUploadUrlInput) =>
    request<UploadUrlResponse>(`/teams/${teamId}/logo/upload-url`, {
      method: 'POST',
      body: input,
    }),

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
  getGame: (teamId: string, gameId: string) =>
    request<Game>(`/teams/${teamId}/games/${gameId}`),
  updateGame: (teamId: string, gameId: string, input: UpdateGameInput) =>
    request<Game>(`/teams/${teamId}/games/${gameId}`, {
      method: 'PUT',
      body: input,
    }),
  deleteGame: (teamId: string, gameId: string) =>
    request<{ message: string }>(`/teams/${teamId}/games/${gameId}`, {
      method: 'DELETE',
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

  followTeam: (teamId: string) =>
    request<{ teamId: string; role: TeamRole }>(`/teams/${teamId}/follow`, {
      method: 'POST',
    }),
  unfollowTeam: (teamId: string) =>
    request<{ teamId: string }>(`/teams/${teamId}/follow`, {
      method: 'DELETE',
    }),
  listFollowedTeams: () => request<FollowedTeam[]>('/me/followed-teams'),
  listTeamMembers: (teamId: string) =>
    request<TeamMembership[]>(`/teams/${teamId}/members`),
  removeTeamMember: (teamId: string, userId: string) =>
    request<{ teamId: string; userId: string; role: TeamRole }>(
      `/teams/${teamId}/members/${userId}`,
      { method: 'DELETE' },
    ),

  createAdminRequest: (teamId: string, note?: string) =>
    request<AdminRequest>(`/teams/${teamId}/admin-requests`, {
      method: 'POST',
      body: note !== undefined ? { note } : {},
    }),
  listAdminRequestsForTeam: (teamId: string) =>
    request<AdminRequest[]>(`/teams/${teamId}/admin-requests`),
  decideAdminRequest: (
    teamId: string,
    requestId: string,
    action: 'APPROVE' | 'REJECT',
    note?: string,
  ) =>
    request<AdminRequest>(
      `/teams/${teamId}/admin-requests/${requestId}`,
      { method: 'PUT', body: note !== undefined ? { action, note } : { action } },
    ),
  listMyAdminRequests: () => request<AdminRequest[]>('/me/admin-requests'),

  searchPublicTeams: (query: string) => {
    const qs = query ? `?q=${encodeURIComponent(query)}` : '';
    return request<PublicTeamSummary[]>(`/explore/teams${qs}`);
  },
  getPublicTeam: (teamId: string) =>
    request<PublicTeamDetail>(`/explore/teams/${teamId}`),

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

  listFormations: (teamId: string) =>
    request<Formation[]>(`/teams/${teamId}/formations`),
  getActiveFormation: (teamId: string) =>
    request<Formation>(`/teams/${teamId}/formations/active`),
  createFormation: (teamId: string, input: SaveFormationInput) =>
    request<Formation>(`/teams/${teamId}/formations`, {
      method: 'POST',
      body: input,
    }),
  updateFormation: (
    teamId: string,
    formationId: string,
    input: SaveFormationInput,
  ) =>
    request<Formation>(`/teams/${teamId}/formations/${formationId}`, {
      method: 'PUT',
      body: input,
    }),
  deleteFormation: (teamId: string, formationId: string) =>
    request<{ message: string }>(`/teams/${teamId}/formations/${formationId}`, {
      method: 'DELETE',
    }),
  getPublicFormation: (shareToken: string) =>
    request<PublicFormationView>(`/formacoes/${shareToken}`, {
      auth: false,
    }),

  listChampionships: () => request<Championship[]>('/championships'),
  getChampionship: (championshipId: string) =>
    request<Championship>(`/championships/${championshipId}`),
  createChampionship: (input: CreateChampionshipInput) =>
    request<Championship>('/championships', { method: 'POST', body: input }),
  updateChampionship: (
    championshipId: string,
    input: UpdateChampionshipInput,
  ) =>
    request<Championship>(`/championships/${championshipId}`, {
      method: 'PUT',
      body: input,
    }),
  deleteChampionship: (championshipId: string) =>
    request<{ message: string }>(`/championships/${championshipId}`, {
      method: 'DELETE',
    }),
  updateChampionshipGame: (
    championshipId: string,
    gameId: string,
    input: UpdateChampionshipGameInput,
  ) =>
    request<Championship>(
      `/championships/${championshipId}/games/${gameId}`,
      { method: 'PUT', body: input },
    ),
  linkChampionshipGame: (
    championshipId: string,
    gameId: string,
    input: { teamId: string },
  ) =>
    request<{ teamId: string; gameId: string }>(
      `/championships/${championshipId}/games/${gameId}/link`,
      { method: 'POST', body: input },
    ),
  getChampionshipGameTeamView: (
    championshipId: string,
    gameId: string,
    teamId: string,
  ) =>
    request<ChampionshipGameTeamView>(
      `/championships/${championshipId}/games/${gameId}/team-view/${teamId}`,
    ),
};

export interface ChampionshipParticipantInput {
  teamId: string;
  teamName: string;
  logoUrl?: string;
  isMine?: boolean;
}

export interface CreateChampionshipInput {
  name: string;
  format: ChampionshipFormat;
  doubleRoundRobin?: boolean;
  participants: ChampionshipParticipantInput[];
}

export interface UpdateChampionshipInput {
  name?: string;
  status?: 'EM_ANDAMENTO' | 'FINALIZADO';
}

export interface UpdateChampionshipGameInput {
  date?: string | null;
  time?: string | null;
  location?: string | null;
  homeScore?: number;
  awayScore?: number;
  winnerByPenalties?: 'HOME' | 'AWAY' | null;
  goals?: ChampionshipGameGoal[];
  clear?: boolean;
}
