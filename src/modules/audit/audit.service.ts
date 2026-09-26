import type { Request } from 'express';
import type { Database } from '../../db/prisma';
import { logger } from '../../config/logger';
import type { ZCTAssignRolePermissions } from '../user/user.schema';
import type { ZCTAuditLogQuery } from './audit.schema';
import type { Validations } from 'express-rate-limit';
import type { Prisma } from '../../generated/prisma/client';
import { AppError } from '../../common/utils/AppError';

export interface CreateAuditLogParams {
  action:
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'LOGIN'
    | 'LOGOUT'
    | 'PASSWORD_CHANGE'
    | 'ROLE_CHANGE'
    | 'STATUS_CHANGE'
    | 'EXPORT'
    | 'IMPERSONATE'
    | 'BULK_UPDATE'
    | 'BULK_DELETE';
  resource: string;
  resourceId?: string | null;
  description?: string;
  oldValues?: any;
  newValues?: any;
  metadata?: any;
  status?: 'SUCCESS' | 'FAILED';
  errorMessage?: string;
  actorType?: 'USER' | 'SYSTEM' | 'WEBHOOK' | 'API_KEY' | 'ANONYMOUS';
  actorId?: string | null;
  actorEmail?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  req?: Request;
}

export class AuditService {
  constructor(private readonly database: Database) {}

  async log(params: CreateAuditLogParams): Promise<void> {
    try {
      const { req } = params;

      const actorId = params.actorId ?? req?.user?.id ?? null;
      const actorEmail = params.actorEmail ?? req?.user?.email ?? null;

      const ipAddress =
        params.ipAddress ??
        (req?.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
        req?.ip ??
        null;

      const userAgent =
        params.userAgent ?? (req?.headers['user-agent'] as string) ?? null;

      const requestId =
        params.requestId ?? (req?.headers['x-request-id'] as string) ?? null;

      await this.database.client.auditLog.create({
        data: {
          action: params.action,
          status: params.status ?? 'SUCCESS',
          resource: params.resource,
          resourceId: params.resourceId,
          description: params.description,
          oldValues: params.oldValues ?? undefined,
          newValues: params.newValues ?? undefined,
          metadata: params.metadata ?? undefined,
          errorMessage: params.errorMessage,
          actorType: params.actorType ?? (actorId ? 'USER' : 'SYSTEM'),
          actorId,
          actorEmail,
          ipAddress,
          userAgent,
          requestId,
        },
      });
    } catch (error) {
      logger.error({ err: error }, 'Failed to record audit log');
    }
  }

  async getAuditLogs(query: ZCTAuditLogQuery) {
    const {
      page,
      limit,
      resource,
      resourceId,
      action,
      status,
      actorId,
      actorType,
      startDate,
      endDate,
      search,
    } = query;

    const skip = (page - 1) * limit;
    const where: Prisma.AuditLogWhereInput = {};

    if (resource) where.resource = { equals: resource, mode: 'insensitive' };
    if (resourceId) where.resourceId = resourceId;
    if (action) where.action = action;
    if (status) where.status = status;
    if (actorId) where.actorId = actorId;
    if (actorType) where.actorType = actorType;

    if (startDate || endDate) {
      where.createdAt = {};

      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { actorEmail: { contains: search, mode: 'insensitive' } },
        { resource: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await Promise.all([
      this.database.client.auditLog.count({ where }),
      this.database.client.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
      }),
    ]);

    return {
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      data,
    };
  }

  async getAuditLogById(id: string) {
    const log = await this.database.client.auditLog.findUnique({
      where: { id },
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!log) {
      throw new AppError('Audit log entry not found', 404);
    }

    return log;
  }
}
