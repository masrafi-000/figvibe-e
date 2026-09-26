import type { NextFunction, Request, Response } from 'express';
import type { AuditService } from './audit.service';
import { ZCIAuditLogQuery } from './audit.schema';
import { AppError } from '../../common/utils/AppError';

export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  getAllLogs = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const query = ZCIAuditLogQuery.parse(req.query);
      const result = await this.auditService.getAuditLogs(query);

      res.status(200).json({
        success: true,
        meta: result.meta,
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  };

  getLogById = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) throw new AppError('Audit log ID is required', 400);

      const log = await this.auditService.getAuditLogById(id);

      res.status(200).json({
        success: true,
        data: { log },
      });
    } catch (error) {
      next(error);
    }
  };
}
