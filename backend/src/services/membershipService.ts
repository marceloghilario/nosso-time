import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { docClient, TABLES } from '../utils/dynamo';
import { HttpError } from '../utils/response';
import { teamService } from './teamService';
import type { TeamMembership, TeamRole } from '../models';

/**
 * Service responsible for `team ↔ user` membership records.
 *
 * Each team has exactly one OWNER membership (mirrors the team.ownerId field),
 * 0..n ADMIN memberships and 0..n FOLLOWER memberships. The OWNER membership
 * is backfilled lazily by `getOrBackfillRole` so existing teams keep working
 * without a one-off migration.
 */
export const membershipService = {
  async putMembership(item: TeamMembership): Promise<void> {
    await docClient.send(
      new PutCommand({
        TableName: TABLES.TEAM_MEMBERSHIPS,
        Item: item,
      }),
    );
  },

  async getMembership(
    teamId: string,
    userId: string,
  ): Promise<TeamMembership | null> {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLES.TEAM_MEMBERSHIPS,
        Key: { teamId, userId },
      }),
    );
    return (result.Item as TeamMembership | undefined) ?? null;
  },

  async listMembersOfTeam(teamId: string): Promise<TeamMembership[]> {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLES.TEAM_MEMBERSHIPS,
        KeyConditionExpression: 'teamId = :teamId',
        ExpressionAttributeValues: { ':teamId': teamId },
      }),
    );
    return (result.Items ?? []) as TeamMembership[];
  },

  async listTeamsOfUser(userId: string): Promise<TeamMembership[]> {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLES.TEAM_MEMBERSHIPS,
        IndexName: 'userId-role-index',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: { ':userId': userId },
      }),
    );
    return (result.Items ?? []) as TeamMembership[];
  },

  /**
   * Returns the user's role on a team, or `null` if the user is not linked.
   * If the team.ownerId matches but no membership row exists yet (legacy team),
   * backfill an OWNER membership and return 'OWNER'.
   */
  async getOrBackfillRole(
    teamId: string,
    userId: string,
  ): Promise<TeamRole | null> {
    const membership = await this.getMembership(teamId, userId);
    if (membership) return membership.role;

    const team = await teamService.getById(teamId);
    if (!team) return null;
    if (team.ownerId === userId) {
      await this.putMembership({
        teamId,
        userId,
        role: 'OWNER',
        createdAt: team.createdAt,
      });
      return 'OWNER';
    }
    return null;
  },

  /**
   * Promote a user. Refuses to overwrite an existing OWNER.
   */
  async setRole(
    teamId: string,
    userId: string,
    role: TeamRole,
    addedBy?: string,
  ): Promise<void> {
    const existing = await this.getMembership(teamId, userId);
    if (existing?.role === 'OWNER') {
      throw new HttpError('Não é possível alterar o papel do dono do time', 400);
    }
    const item: TeamMembership = {
      teamId,
      userId,
      role,
      addedBy,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    await docClient.send(
      new PutCommand({
        TableName: TABLES.TEAM_MEMBERSHIPS,
        Item: item,
      }),
    );
  },

  /**
   * Idempotent follow. If the user is already OWNER or ADMIN we leave them
   * alone (their higher role implicitly includes following). Otherwise we
   * write a FOLLOWER membership.
   */
  async follow(teamId: string, userId: string): Promise<TeamRole> {
    const role = await this.getOrBackfillRole(teamId, userId);
    if (role === 'OWNER' || role === 'ADMIN') {
      return role;
    }
    await this.putMembership({
      teamId,
      userId,
      role: 'FOLLOWER',
      createdAt: new Date().toISOString(),
    });
    return 'FOLLOWER';
  },

  /**
   * Idempotent unfollow. Only removes FOLLOWER memberships. OWNER and ADMIN
   * memberships are preserved (admins must be revoked explicitly by the owner).
   */
  async unfollow(teamId: string, userId: string): Promise<void> {
    try {
      await docClient.send(
        new DeleteCommand({
          TableName: TABLES.TEAM_MEMBERSHIPS,
          Key: { teamId, userId },
          ConditionExpression: '#role = :follower',
          ExpressionAttributeNames: { '#role': 'role' },
          ExpressionAttributeValues: { ':follower': 'FOLLOWER' },
        }),
      );
    } catch (err) {
      if (err instanceof ConditionalCheckFailedException) {
        return;
      }
      throw err;
    }
  },

  /**
   * Owner-driven demotion: ADMIN → FOLLOWER. Refuses to touch the OWNER row.
   */
  async demoteAdmin(teamId: string, userId: string): Promise<void> {
    const existing = await this.getMembership(teamId, userId);
    if (!existing) {
      throw new HttpError('Usuário não é membro deste time', 404);
    }
    if (existing.role === 'OWNER') {
      throw new HttpError('Não é possível rebaixar o dono do time', 400);
    }
    if (existing.role === 'FOLLOWER') {
      // already not an admin → idempotent no-op
      return;
    }
    await this.putMembership({
      ...existing,
      role: 'FOLLOWER',
    });
  },

  /**
   * Resolve the role for `userId` on `teamId` and throw 403/404 if not allowed.
   * Returns the actual role so handlers can branch on OWNER vs ADMIN.
   */
  async requireRole(
    teamId: string,
    userId: string,
    allowed: ReadonlyArray<TeamRole>,
  ): Promise<TeamRole> {
    const role = await this.getOrBackfillRole(teamId, userId);
    if (role === null) {
      const team = await teamService.getById(teamId);
      if (!team) {
        throw new HttpError('Recurso não encontrado', 404);
      }
      throw new HttpError(
        'Você não tem permissão para acessar este recurso',
        403,
      );
    }
    if (!allowed.includes(role)) {
      throw new HttpError(
        'Você não tem permissão para esta ação',
        403,
      );
    }
    return role;
  },
};

export const TEAM_MANAGEMENT_ROLES: ReadonlyArray<TeamRole> = ['OWNER', 'ADMIN'];
