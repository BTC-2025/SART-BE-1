import { Router } from 'express';
import { FlightController } from './flight.controller';

const router = Router();
const controller = new FlightController();

// GET /api/flights/search?origin=BLR&destination=DEL&date=2026-11-13
router.get('/search', (req, res) => controller.searchFlights(req, res));

// GET /api/flights/status/:flightNumber
router.get('/status/:flightNumber', (req, res) => controller.getFlightStatus(req, res));

export default router;

