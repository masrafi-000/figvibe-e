import { Router } from 'express';
import { HealthController } from './health.controller';

export class HealthRouter {
  public readonly router: Router;

  constructor(private readonly controller: HealthController) {
    this.router = Router();

    this.initializeRouter();
  }

  private initializeRouter(): void {
    this.router.get('/', this.controller.health);
  }
}
