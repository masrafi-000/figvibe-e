import { Router } from 'express';
import type { AuditController } from './audit.controller';
import { timeStamp } from 'node:console';
import {
  authenticate,
  requirePermission,
} from '../../middleware/auth.middleware';

export class AuditRouter {
  public readonly router: Router;

  constructor(private readonly controller: AuditController) {
    this.router = Router();
    this.initializedRoutes();
  }

  private initializedRoutes(): void {
    this.router.use(authenticate);

    this.router.get(
      '/',
      requirePermission('audit', 'read'),
      this.controller.getAllLogs,
    );

    this.router.get(
      '/:id',
      requirePermission('audit', 'read'),
      this.controller.getLogById,
    );
  }
}
