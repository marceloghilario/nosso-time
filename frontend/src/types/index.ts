export type Plan = 'FREE' | 'PRO';

export type Modality = 'FUTEBOL' | 'FUTSAL';

export type TeamRole = 'OWNER' | 'ADMIN' | 'FOLLOWER';

export interface Team {
  teamId: string;
  ownerId: string;
  name: string;
  description?: string;
  modality?: Modality;
  logoS3Key?: string;
  logoUrl?: string;
  plan: Plan;
  photoCount: number;
  /** Number of players in the team — populated by GET /teams/:teamId only. */
  playerCount?: number;
  /** Number of games registered for the team — populated by GET /teams/:teamId only. */
  gameCount?: number;
  /** Number of championships this team participates in — populated by GET /teams/:teamId only. */
  championshipCount?: number;
  /** Caller's role on this team — populated by GET /teams and GET /teams/:teamId. */
  myRole?: TeamRole;
  createdAt: string;
  updatedAt: string;
}

export interface FollowedTeam {
  teamId: string;
  name: string;
  description?: string;
  logoUrl?: string;
  photoCount: number;
  myRole: 'FOLLOWER';
}

export interface TeamMembership {
  teamId: string;
  userId: string;
  role: TeamRole;
  addedBy?: string;
  createdAt: string;
}

export type AdminRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AdminRequest {
  requestId: string;
  teamId: string;
  userId: string;
  requestedRole: 'ADMIN';
  status: AdminRequestStatus;
  note?: string;
  createdAt: string;
  decidedAt?: string;
  decidedBy?: string;
}

export interface PendingAdminRequestSummary {
  requestId: string;
  createdAt: string;
  note?: string;
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

export interface GameGoal {
  playerId: string;
  playerName: string;
  minute?: number;
}

export interface GameGuest {
  guestId: string;
  name: string;
  position?: PlayerPosition;
  number?: number;
}

export interface GameLineupPosition {
  playerId: string;
  x: number;
  y: number;
}

export interface GameLineup {
  scheme: string;
  positions: GameLineupPosition[];
}

export interface GameChampionshipRef {
  championshipId: string;
  championshipGameId: string;
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
  goals?: GameGoal[];
  confirmedPlayerIds?: string[];
  guests?: GameGuest[];
  lineup?: GameLineup;
  championshipRef?: GameChampionshipRef;
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

export const FORMATION_SCHEMES = [
  '4-4-2',
  '4-3-3',
  '3-5-2',
  '4-2-3-1',
  '5-3-2',
  '3-4-3',
  '4-1-4-1',
  '1-2-1',
  '2-2',
  '3-1',
  '4-0',
] as const;

export type FormationScheme = (typeof FORMATION_SCHEMES)[number];

export const SCHEMES_BY_MODALITY: Record<Modality, FormationScheme[]> = {
  FUTEBOL: ['4-4-2', '4-3-3', '3-5-2', '4-2-3-1', '5-3-2', '3-4-3', '4-1-4-1'],
  FUTSAL: ['1-2-1', '2-2', '3-1', '4-0'],
};

export interface FormationPlayerPosition {
  playerId: string;
  playerName: string;
  playerNumber?: number;
  x: number;
  y: number;
}

export interface Formation {
  formationId: string;
  teamId: string;
  teamName: string;
  name: string;
  scheme: FormationScheme;
  isActive: boolean;
  playerPositions: FormationPlayerPosition[];
  shareToken: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublicFormationView {
  teamName: string;
  name: string;
  scheme: FormationScheme;
  playerPositions: FormationPlayerPosition[];
}

export type ApiSuccess<T> = { success: true; data: T };
export type ApiFailure = { success: false; error: string };
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface PublicTeamSummary {
  teamId: string;
  name: string;
  description?: string;
  photoCount: number;
  logoUrl?: string;
  createdAt: string;
}

export interface PublicTeam {
  teamId: string;
  name: string;
  description?: string;
  photoCount: number;
  logoUrl?: string;
  createdAt: string;
  playerCount?: number;
  gameCount?: number;
  championshipCount?: number;
}

export interface PublicPlayer {
  playerId: string;
  name: string;
  position: PlayerPosition;
  number?: number;
  characteristics?: string;
}

export interface PublicGame {
  gameId: string;
  date: string;
  time: string;
  location: string;
  opponent: string;
  status: GameStatus;
  result?: GameResult;
}

export interface PublicMedia {
  mediaId: string;
  gameId?: string;
  type: MediaType;
  s3Key: string;
  caption?: string;
  createdAt: string;
  url?: string;
}

export interface PublicTeamDetail {
  team: PublicTeam;
  players: PublicPlayer[];
  games: PublicGame[];
  media: PublicMedia[];
  /** null when the caller has no relation with the team. */
  myRole?: TeamRole | null;
  pendingAdminRequest?: PendingAdminRequestSummary | null;
}

export const CHAMPIONSHIP_FORMATS = [
  'PONTOS_CORRIDOS',
  'MATA_MATA',
  'COPA',
] as const;

export type ChampionshipFormat = (typeof CHAMPIONSHIP_FORMATS)[number];

export type ChampionshipStatus = 'EM_ANDAMENTO' | 'FINALIZADO';

export type ChampionshipPhase =
  | 'RR'
  | 'GROUP'
  | 'R16'
  | 'QF'
  | 'SF'
  | 'F'
  | '3RD';

export interface ChampionshipParticipant {
  teamId: string;
  teamName: string;
  logoUrl?: string;
  isMine: boolean;
}

export interface ChampionshipGameLink {
  teamId: string;
  gameId: string;
}

export interface ChampionshipGameGoal {
  teamSide: 'HOME' | 'AWAY';
  playerId: string;
  playerName: string;
  minute?: number;
}

export interface ChampionshipGame {
  gameId: string;
  phase: ChampionshipPhase;
  group?: string;
  round: number;
  bracketIndex?: number;
  homeTeamId?: string;
  homeTeamName?: string;
  awayTeamId?: string;
  awayTeamName?: string;
  homeScore?: number;
  awayScore?: number;
  winnerByPenalties?: 'HOME' | 'AWAY';
  status: 'AGENDADO' | 'REALIZADO';
  date?: string;
  time?: string;
  location?: string;
  goals?: ChampionshipGameGoal[];
  links?: ChampionshipGameLink[];
  /** @deprecated use links[] */
  linkedGameId?: string;
  /** @deprecated use links[] */
  linkedTeamId?: string;
}

export interface ChampionshipGroup {
  name: string;
  teamIds: string[];
}

export interface Championship {
  championshipId: string;
  ownerId: string;
  name: string;
  format: ChampionshipFormat;
  status: ChampionshipStatus;
  doubleRoundRobin?: boolean;
  participants: ChampionshipParticipant[];
  groups?: ChampionshipGroup[];
  games: ChampionshipGame[];
  createdAt: string;
  updatedAt: string;
  /** True if the requesting user is the championship creator. */
  viewerIsCreator?: boolean;
}

export interface ChampionshipGameTeamView {
  linkedGameId: string | null;
  confirmedPlayerIds: string[];
  guests: GameGuest[];
  lineup: GameLineup | null;
  players: Player[];
}
