# Nosso Time

MVP de um sistema web para gerenciamento de **times de futebol amador**: cadastro de times, jogadores, jogos e galeria de fotos por time/jogo. Cada usuário gerencia seus próprios times com plano FREE (até 10 fotos) ou PRO (até 200 fotos).

## Stack

**Backend** — AWS Serverless

- Node.js 20 + TypeScript
- AWS Lambda + API Gateway (HTTP API)
- DynamoDB (tabelas com GSIs)
- S3 (presigned URLs PUT/GET)
- Cognito User Pool (auth via JWT)
- Validação com [zod](https://zod.dev/)
- Framework [Serverless](https://www.serverless.com/) v3 + `serverless-plugin-typescript` + `serverless-offline`

**Frontend** — SPA

- React 19 + TypeScript
- [Vite](https://vitejs.dev/) 8
- [Tailwind CSS](https://tailwindcss.com/) v4 via `@tailwindcss/vite`
- React Router v7 (`react-router-dom`)
- Ícones [lucide-react](https://lucide.dev/)

## Estrutura do projeto

```
nosso-time/
├── backend/                # Serverless / AWS Lambda
│   ├── src/
│   │   ├── functions/      # Handlers HTTP (thin) por recurso
│   │   ├── services/       # Lógica de negócio (DynamoDB/S3/Cognito)
│   │   ├── models/         # Tipos compartilhados
│   │   └── utils/          # response, auth, validators, dynamo
│   ├── serverless.yml
│   └── package.json
├── frontend/               # Vite + React 19
│   ├── src/
│   │   ├── pages/          # Páginas (Login, Teams, TeamDetail, ...)
│   │   ├── components/     # Layout, ProtectedRoute, Toast, listas, galeria
│   │   ├── contexts/       # AuthContext
│   │   ├── hooks/          # useApi, useAuth
│   │   ├── services/       # api.ts (fetch wrapper com Bearer token)
│   │   ├── types/          # Modelos e enums
│   │   └── utils/          # constants
│   └── package.json
└── README.md
```

## Como rodar localmente

Pré-requisitos: **Node.js 20+** e **npm 10+**.

### Backend (Serverless Offline)

```bash
cd backend
npm install
npm run offline
```

A API local sobe em `http://localhost:3000` com mock para o autorizador JWT. Endpoints disponíveis estão listados em [API](#api).

> Observação: handlers de auth (signup/login) requerem um **Cognito User Pool real**. Para teste local de fluxos completos é mais simples usar um stack já implantado (`npm run deploy` — ver abaixo) e apontar o frontend para a URL gerada.

### Frontend (Vite dev)

```bash
cd frontend
npm install
cp .env.example .env   # edite VITE_API_URL com a URL da sua API
npm run dev
```

Aplicação em `http://localhost:5173`.

### Lint & build

```bash
# Backend
cd backend
npm run lint
npm run build   # tsc --noEmit (sem mocks; valida tipos)

# Frontend
cd frontend
npm run lint
npm run build   # tsc -b && vite build
```

## Como fazer deploy na AWS

Pré-requisitos:

- Conta AWS com credenciais configuradas (`aws configure` ou variáveis `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`).
- Permissões para criar Lambda, API Gateway, DynamoDB, S3, Cognito, IAM, CloudFormation.

### Backend

```bash
cd backend
npm install
npx serverless deploy --stage dev --region us-east-1
```

A saída do deploy traz, entre outros, os Outputs do CloudFormation:

- `HttpApiUrl` — base URL da API (use no `VITE_API_URL` do frontend)
- `UserPoolId`
- `UserPoolClientId`
- `PhotosBucketName`

Para um stage diferente, basta trocar `--stage`. Para remover toda a stack:

```bash
npx serverless remove --stage dev
```

### Frontend

O frontend é uma SPA estática (Vite). Ajuste `VITE_API_URL` para a URL da API publicada e gere o bundle:

```bash
cd frontend
echo "VITE_API_URL=https://abc123.execute-api.us-east-1.amazonaws.com" > .env.production
npm run build
```

O conteúdo final fica em `frontend/dist/` e pode ser servido por qualquer hospedagem estática (S3 + CloudFront, Vercel, Netlify, Cloudflare Pages, etc.).

## Variáveis de ambiente

### Backend (configuradas via `serverless.yml`)

| Nome | Descrição |
|------|-----------|
| `TEAMS_TABLE` | Nome da tabela DynamoDB de times |
| `PLAYERS_TABLE` | Nome da tabela de jogadores |
| `GAMES_TABLE` | Nome da tabela de jogos |
| `MEDIA_TABLE` | Nome da tabela de mídias |
| `PHOTOS_BUCKET` | Nome do bucket S3 de fotos |
| `COGNITO_USER_POOL_ID` | ID do User Pool (referenciado dinamicamente) |
| `COGNITO_CLIENT_ID` | Client ID público (referenciado dinamicamente) |

### Frontend

| Nome | Descrição |
|------|-----------|
| `VITE_API_URL` | URL base da API (ex.: output `HttpApiUrl` do CloudFormation) |

## API

Todos os endpoints retornam o envelope `{ "success": true, "data": ... }` em sucesso e `{ "success": false, "error": "<mensagem>" }` em erro. Endpoints autenticados exigem header `Authorization: Bearer <idToken>` (token JWT do Cognito).

### Auth (público)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/auth/signup` | `{ email, password }` — cria usuário no Cognito |
| POST | `/auth/login` | `{ email, password }` — retorna `idToken`, `accessToken`, `refreshToken` |

### Times

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/teams` | Cria time `{ name, description? }` |
| GET | `/teams` | Lista times do usuário autenticado |
| GET | `/teams/:teamId` | Detalha um time (valida ownership) |

### Jogadores

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/teams/:teamId/players` | Cria jogador `{ name, position, number, characteristics? }` |
| GET | `/teams/:teamId/players` | Lista jogadores do time |

### Jogos

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/teams/:teamId/games` | Cria jogo `{ date, time, location, opponent, status, result? }` |
| GET | `/teams/:teamId/games` | Lista jogos do time (mais recentes primeiro) |

### Mídias

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/teams/:teamId/media/upload-url` | Retorna `{ uploadUrl, s3Key }` (PUT presigned, 5 min) |
| POST | `/teams/:teamId/media` | Salva metadata após upload `{ s3Key, contentType, type, gameId?, caption? }` |
| GET | `/teams/:teamId/media` | Lista mídias do time, com URL presigned para visualização |
| GET | `/teams/:teamId/games/:gameId/media` | Lista mídias de um jogo específico |

### Erros

| Cenário | Status | Mensagem |
|---------|--------|----------|
| Input inválido | 400 | Detalhes do zod |
| Token ausente/expirado | 401 | "Token inválido ou expirado" |
| Acesso a time de outro usuário | 403 | "Você não tem permissão para acessar este recurso" |
| Limite de fotos atingido | 403 | "Limite de fotos atingido. Faça upgrade para o plano Pro." |
| Recurso não encontrado | 404 | "Recurso não encontrado" |
| Camisa duplicada | 409 | "Número de camisa já em uso neste time" |
| Erro interno | 500 | "Erro interno do servidor" |

## Modelo de dados

- **TeamsTable**: PK `teamId`, GSI `ownerId-index` (PK `ownerId`)
- **PlayersTable**: PK `playerId`, GSI `teamId-index` (PK `teamId`)
- **GamesTable**: PK `gameId`, GSI `teamId-date-index` (PK `teamId`, SK `date`)
- **MediaTable**: PK `mediaId`, GSIs `teamId-createdAt-index` e `gameId-createdAt-index`

## Limites por plano

| Plano | Fotos por time |
|-------|----------------|
| FREE | 10 |
| PRO | 200 |

Atualizar o plano de um time é manual em fase MVP (alterar o atributo `plan` no DynamoDB).

## Notas

- Sem dados mockados: handlers chamam `@aws-sdk/*` v3 diretamente.
- Strings de UI em pt-BR; código (variáveis, funções) em inglês.
- O bucket S3 mantém **acesso público bloqueado** — fotos são servidas via URLs presigned GET (expiração 1 hora) geradas em `listByTeam` e `listByGame`.
- Confirmação de cadastro é automática (`AdminConfirmSignUpCommand`) para simplicidade do MVP — em produção, prefira fluxo padrão com código por e-mail.
