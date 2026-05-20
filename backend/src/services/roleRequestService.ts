import {
  PutCommand,
  QueryCommand,
  GetCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuid } from 'uuid';
import { docClient, TABLES } from '../utils/dynamo';
import { HttpError } from '../utils/response';
import { membershipService } from './membershipService';
import { teamService } from './teamService';
import type {
  TeamRoleRequest,
  TeamRoleRequestStatus,
} from '../models';

/**
 * Service for the "ser admin do time" approval flow.
 *
 * The flow has 3 states (PENDING | APPROVED | REJECTED). Approving a request
 * promotes the requester to an ADMIN membership. Rejecting it keeps the
 * requester as a FOLLOWER and lets them try again later.
 */
export const roleRequestService = {
  async getById(requestId: string): Promise<TeamRoleRequest | null> {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLES.TEAM_ROLE_REQUESTS,
        Key: { requestId },
      }),
    );
    return (result.Item as TeamRoleRequest | undefined) ?? null;
  },

  async listPendingForTeam(teamId: string): Promise<TeamRoleRequest[]> {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLES.TEAM_ROLE_REQUESTS,
        IndexName: 'teamId-status-index',
        KeyConditionExpression: 'teamId = :teamId AND #status = :pending',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':teamId': teamId,
          ':pending': 'PENDING',
        },
      }),
    );
    return (result.Items ?? []) as TeamRoleRequest[];
  },

  async listForTeam(teamId: string): Promise<TeamRoleRequest[]> {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLES.TEAM_ROLE_REQUESTS,
        IndexName: 'teamId-status-index',
        KeyConditionExpression: 'teamId = :teamId',
        ExpressionAttributeValues: { ':teamId': teamId },
      }),
    );
    return (result.Items ?? []) as TeamRoleRequest[];
  },

  async listForUser(userId: string): Promise<TeamRoleRequest[]> {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLES.TEAM_ROLE_REQUESTS,
        IndexName: 'userId-status-index',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: { ':userId': userId },
      }),
    );
    return (result.Items ?? []) as TeamRoleRequest[];
  },

  async findPending(
    teamId: string,
    userId: string,
  ): Promise<TeamRoleRequest | null> {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLES.TEAM_ROLE_REQUESTS,
        IndexName: 'userId-status-index',
        KeyConditionExpression: 'userId = :userId AND #status = :pending',
        FilterExpression: 'teamId = :teamId',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':userId': userId,
          ':pending': 'PENDING',
          ':teamId': teamId,
        },
      }),
    );
    const items = (result.Items ?? []) as TeamRoleRequest[];
    return items[0] ?? null;
  },

  /**
   * Creates a PENDING admin request for `userId` on `teamId`. Also makes the
   * user follow the team if they aren't already related, so "solicitar admin"
   * implies "seguir" by design.
   */
  async createAdminRequest(
    teamId: string,
    userId: string,
    note?: string,
  ): Promise<TeamRoleRequest> {
    const team = await teamService.getById(teamId);
    if (!team) {
      throw new HttpError('Recurso não encontrado', 404);
    }
    if (team.ownerId === userId) {
      throw new HttpError('Você já é o dono deste time', 400);
    }
    const currentRole = await membershipService.getOrBackfillRole(
      teamId,
      userId,
    );
    if (currentRole === 'ADMIN') {
      throw new HttpError('Você já é administrador deste time', 400);
    }
    const existing = await this.findPending(teamId, userId);
    if (existing) {
      throw new HttpError('Já existe uma solicitação pendente para este time', 409);
    }
    // Auto-follow on request
    await membershipService.follow(teamId, userId);

    const request: TeamRoleRequest = {
      requestId: uuid(),
      teamId,
      userId,
      requestedRole: 'ADMIN',
      status: 'PENDING',
      note,
      createdAt: new Date().toISOString(),
    };
    await docClient.send(
      new PutCommand({
        TableName: TABLES.TEAM_ROLE_REQUESTS,
        Item: request,
      }),
    );
    return request;
  },

  /**
   * Decide (approve/reject) an existing request. Approving promotes the user
   * to ADMIN; rejecting leaves them as FOLLOWER. Either way the request status
   * is finalised and cannot be re-decided.
   */
  async decide(
    requestId: string,
    decidedBy: string,
    action: 'APPROVE' | 'REJECT',
    note?: string,
  ): Promise<TeamRoleRequest> {
    const existing = await this.getById(requestId);
    if (!existing) {
      throw new HttpError('Solicitação não encontrada', 404);
    }
    if (existing.status !== 'PENDING') {
      throw new HttpError('Esta solicitação já foi decidida', 409);
    }
    const nextStatus: TeamRoleRequestStatus =
      action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    if (action === 'APPROVE') {
      await membershipService.setRole(
        existing.teamId,
        existing.userId,
        'ADMIN',
        decidedBy,
      );
    }

    const result = await docClient.send(
      new UpdateCommand({
        TableName: TABLES.TEAM_ROLE_REQUESTS,
        Key: { requestId },
        UpdateExpression:
          'SET #status = :status, decidedAt = :now, decidedBy = :by'
          + (note !== undefined ? ', #note = :note' : ''),
        ExpressionAttributeNames: {
          '#status': 'status',
          ...(note !== undefined ? { '#note': 'note' } : {}),
        },
        ExpressionAttributeValues: {
          ':status': nextStatus,
          ':now': new Date().toISOString(),
          ':by': decidedBy,
          ':pendingGuard': 'PENDING',
          ...(note !== undefined ? { ':note': note } : {}),
        },
        ConditionExpression: '#status = :pendingGuard',
        ReturnValues: 'ALL_NEW',
      }),
    );
    return (result.Attributes as TeamRoleRequest) ?? {
      ...existing,
      status: nextStatus,
      decidedAt: new Date().toISOString(),
      decidedBy,
      note: note ?? existing.note,
    };
  },
};
