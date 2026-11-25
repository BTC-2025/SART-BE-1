import { Router } from 'express';
import { HealthController } from './health.controller';

const router = Router();
const controller = new HealthController();

// GET /api/health/monitor
router.get('/monitor', (req, res) => controller.getStatus(req, res));

export default router;

