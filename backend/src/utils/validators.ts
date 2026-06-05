import { z, ZodError } from 'zod';
import { HttpError } from './response';
import { CHAMPIONSHIP_FORMATS, FORMATION_SCHEMES } from '../models';

export const SignupSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
});

export const LoginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email('E-mail inválido'),
});

export const ResetPasswordSchema = z.object({
  email: z.string().email('E-mail inválido'),
  code: z
    .string()
    .min(1, 'Código é obrigatório')
    .max(20, 'Código inválido')
    .regex(/^[A-Za-z0-9-]+$/, 'Código inválido'),
  newPassword: z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
});

export const ModalitySchema = z.enum(['FUTEBOL', 'FUTSAL']);

export const CreateTeamSchema = z.object({
  name: z.string().min(1, 'Nome do time é obrigatório').max(100),
  description: z.string().max(500).optional(),
  modality: ModalitySchema.optional(),
});

export const UpdateTeamSchema = z
  .object({
    name: z.string().min(1, 'Nome do time é obrigatório').max(100).optional(),
    description: z.string().max(500).optional(),
    logoS3Key: z.string().min(1).max(500).optional(),
  })
  .refine(
    (val) =>
      val.name !== undefined ||
      val.description !== undefined ||
      val.logoS3Key !== undefined,
    { message: 'Nenhum campo para atualizar' },
  );

export const LogoUploadUrlSchema = z.object({
  contentType: z
    .string()
    .regex(/^image\//, 'Content-type deve ser image/*'),
  fileName: z.string().min(1).max(200),
});

export const PlayerPositionSchema = z.enum([
  'GOLEIRO',
  'ZAGUEIRO',
  'LATERAL',
  'VOLANTE',
  'MEIA',
  'ATACANTE',
  'FIXO',
  'ALA',
  'PIVO',
]);

export const CreatePlayerSchema = z.object({
  name: z.string().min(1, 'Nome do jogador é obrigatório').max(100),
  position: PlayerPositionSchema,
  number: z.number().int().min(1).max(99).optional(),
  characteristics: z.string().max(500).optional(),
});

export const GameStatusSchema = z.enum(['AGENDADO', 'REALIZADO']);

export const GameResultSchema = z.object({
  scoreFor: z.number().int().min(0).max(99),
  scoreAgainst: z.number().int().min(0).max(99),
});

export const GameGoalSchema = z.object({
  playerId: z.string().min(1, 'Jogador é obrigatório'),
  minute: z.number().int().min(0).max(200).optional(),
});

export const GameGuestSchema = z.object({
  guestId: z.string().min(1).optional(),
  name: z.string().min(1, 'Nome do convidado é obrigatório').max(100),
  position: PlayerPositionSchema.optional(),
  number: z.number().int().min(0).max(999).optional(),
});

export const CreateGameSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (YYYY-MM-DD)'),
    time: z.string().regex(/^\d{2}:\d{2}$/, 'Horário inválido (HH:MM)'),
    location: z.string().min(1, 'Local é obrigatório').max(200),
    opponent: z.string().min(1, 'Adversário é obrigatório').max(100),
    status: GameStatusSchema,
    result: GameResultSchema.optional(),
  })
  .refine(
    (val) => val.status !== 'REALIZADO' || val.result !== undefined,
    { message: 'Resultado é obrigatório para jogos realizados', path: ['result'] },
  );

export const GameLineupPositionSchema = z.object({
  playerId: z.string().min(1),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
});

export const GameLineupSchema = z.object({
  scheme: z.string().min(1).max(20),
  positions: z.array(GameLineupPositionSchema).max(30),
});

export const UpdateGameSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (YYYY-MM-DD)'),
    time: z.string().regex(/^\d{2}:\d{2}$/, 'Horário inválido (HH:MM)'),
    location: z.string().min(1, 'Local é obrigatório').max(200),
    opponent: z.string().min(1, 'Adversário é obrigatório').max(100),
    status: GameStatusSchema,
    result: GameResultSchema.optional(),
    goals: z.array(GameGoalSchema).max(99).optional(),
    confirmedPlayerIds: z.array(z.string().min(1)).max(100).optional(),
    guests: z.array(GameGuestSchema).max(50).optional(),
    lineup: GameLineupSchema.optional(),
  })
  .refine(
    (val) => val.status !== 'REALIZADO' || val.result !== undefined,
    { message: 'Resultado é obrigatório para jogos realizados', path: ['result'] },
  )
  .refine(
    (val) => val.status === 'REALIZADO' || !val.goals || val.goals.length === 0,
    { message: 'Gols só podem ser informados em jogos realizados', path: ['goals'] },
  )
  .refine(
    (val) =>
      !val.result ||
      !val.goals ||
      val.goals.length <= val.result.scoreFor,
    {
      message: 'Quantidade de gols não pode ser maior que o placar do time',
      path: ['goals'],
    },
  );

export const MediaTypeSchema = z.enum(['PHOTO', 'VIDEO']);

export const UploadUrlRequestSchema = z.object({
  contentType: z
    .string()
    .regex(/^(image|video)\//, 'Content-type deve ser image/* ou video/*'),
  fileName: z.string().min(1).max(200),
  type: MediaTypeSchema,
});

export const CreateMediaSchema = z.object({
  s3Key: z.string().min(1),
  contentType: z.string().min(1),
  type: MediaTypeSchema,
  gameId: z.string().min(1).optional(),
  caption: z.string().max(500).optional(),
});

export const CreateAdminRequestSchema = z.object({
  note: z.string().max(500).optional(),
});

export const DecideAdminRequestSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  note: z.string().max(500).optional(),
});

export const FormationSchemeSchema = z.enum(FORMATION_SCHEMES);

export const FormationPositionSchema = z.object({
  playerId: z.string().min(1),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
});

export const CreateFormationSchema = z.object({
  name: z.string().min(1, 'Nome da formação é obrigatório').max(100),
  scheme: FormationSchemeSchema,
  playerPositions: z
    .array(FormationPositionSchema)
    .max(30, 'Muitos jogadores na formação'),
  isActive: z.boolean().optional(),
});

export const UpdateFormationSchema = CreateFormationSchema;

export const ChampionshipFormatSchema = z.enum(CHAMPIONSHIP_FORMATS);

export const ChampionshipParticipantInputSchema = z.object({
  teamId: z.string().min(1),
  teamName: z.string().min(1).max(100),
  logoUrl: z.string().url().optional(),
  isMine: z.boolean().optional(),
});

export const CreateChampionshipSchema = z
  .object({
    name: z.string().min(1, 'Nome do campeonato é obrigatório').max(100),
    format: ChampionshipFormatSchema,
    doubleRoundRobin: z.boolean().optional(),
    participants: z
      .array(ChampionshipParticipantInputSchema)
      .min(2, 'Selecione ao menos 2 times')
      .max(16, 'Máximo de 16 times nesta versão'),
  })
  .superRefine((val, ctx) => {
    if (val.format === 'PONTOS_CORRIDOS' && val.participants.length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Pontos corridos exige ao menos 3 times',
        path: ['participants'],
      });
    }
    if (val.format === 'COPA' && val.participants.length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Copa exige ao menos 3 times',
        path: ['participants'],
      });
    }
    if (val.doubleRoundRobin && val.format === 'MATA_MATA') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Ida e volta não se aplica ao mata-mata',
        path: ['doubleRoundRobin'],
      });
    }
  });

export const UpdateChampionshipSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    status: z.enum(['EM_ANDAMENTO', 'FINALIZADO']).optional(),
  })
  .refine((val) => val.name !== undefined || val.status !== undefined, {
    message: 'Nenhum campo para atualizar',
  });

export const ChampionshipGameGoalSchema = z.object({
  teamSide: z.enum(['HOME', 'AWAY']),
  playerId: z.string().min(1),
  playerName: z.string().min(1).max(120),
  minute: z.number().int().min(0).max(200).optional(),
});

export const UpdateChampionshipGameSchema = z
  .object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato AAAA-MM-DD')
      .optional()
      .nullable(),
    time: z
      .string()
      .regex(/^\d{2}:\d{2}$/, 'Hora deve estar no formato HH:MM')
      .optional()
      .nullable(),
    location: z.string().min(1).max(200).optional().nullable(),
    homeScore: z.number().int().min(0).max(99).optional(),
    awayScore: z.number().int().min(0).max(99).optional(),
    winnerByPenalties: z.enum(['HOME', 'AWAY']).nullable().optional(),
    goals: z.array(ChampionshipGameGoalSchema).max(60).optional(),
    clear: z.boolean().optional(),
  })
  .refine(
    (val) => {
      // Allow updating only match metadata (date/time/location) without score.
      const hasScore =
        val.homeScore !== undefined && val.awayScore !== undefined;
      const hasMeta =
        val.date !== undefined ||
        val.time !== undefined ||
        val.location !== undefined ||
        val.goals !== undefined;
      return val.clear === true || hasScore || hasMeta;
    },
    {
      message:
        'Informe placar, dados do jogo (data/hora/local/gols) ou use clear=true',
    },
  );

export const parseBody = <T>(schema: z.ZodType<T>, body: string | null | undefined): T => {
  let parsed: unknown;
  try {
    parsed = body ? JSON.parse(body) : {};
  } catch {
    throw new HttpError('Corpo da requisição inválido (JSON malformado)', 400);
  }
  try {
    return schema.parse(parsed);
  } catch (err) {
    if (err instanceof ZodError) {
      const message = err.issues
        .map((i) => `${i.path.join('.') || 'body'}: ${i.message}`)
        .join('; ');
      throw new HttpError(message, 400);
    }
    throw err;
  }
};
