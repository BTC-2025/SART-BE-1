import { Router } from 'express';
import { TrainController } from './train.controller';

const router = Router();
const controller = new TrainController();

// 1. GET /api/trains/search?origin=MAS&destination=SBC&date=2026-11-14
router.get('/search', (req, res) => controller.searchTrains(req, res));

// 2. GET /api/trains/:trainNumber/schedule
router.get('/:trainNumber/schedule', (req, res) => controller.getTrainSchedule(req, res));

// 3. POST /api/trains/confirm-booking - Commits booking to SQLite DB, creates PNR
router.post('/confirm-booking', (req, res) => controller.confirmTrainBooking(req, res));

// 4. POST /api/trains/cancel-ticket - Cancels booking in DB, updates status to Cancelled & refunds
router.post('/cancel-ticket', (req, res) => controller.cancelTrainTicket(req, res));

// 5. GET /api/trains/live/:trainNumber - Live NTES GPS tracking
router.get('/live/:trainNumber', (req, res) => controller.getLiveStatus(req, res));

export default router;
