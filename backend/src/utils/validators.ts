import { z, ZodError } from 'zod';
import { HttpError } from './response';
import { FORMATION_SCHEMES } from '../models';

export const SignupSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
});

export const LoginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

export const CreateTeamSchema = z.object({
  name: z.string().min(1, 'Nome do time é obrigatório').max(100),
  description: z.string().max(500).optional(),
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

export const UpdateGameSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (YYYY-MM-DD)'),
    time: z.string().regex(/^\d{2}:\d{2}$/, 'Horário inválido (HH:MM)'),
    location: z.string().min(1, 'Local é obrigatório').max(200),
    opponent: z.string().min(1, 'Adversário é obrigatório').max(100),
    status: GameStatusSchema,
    result: GameResultSchema.optional(),
    goals: z.array(GameGoalSchema).max(99).optional(),
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
