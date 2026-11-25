import { Request, Response } from 'express';
import { HealthMonitorService } from './health.service';

const monitor = new HealthMonitorService();

export class HealthController {
  /**
   * GET /api/health/monitor
   * Complete API Health Monitor endpoint
   */
  public async getStatus(req: Request, res: Response) {
    try {
      const report = await monitor.getHealthReport();
      const statusCode = report.overallStatus === 'HEALTHY' ? 200 : 503;
      return res.status(statusCode).json(report);
    } catch (err: any) {
      return res.status(500).json({
        timestamp: new Date().toISOString(),
        overallStatus: 'CRITICAL',
        error: err.message
      });
    }
  }
}

