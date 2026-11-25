import { Router } from 'express';
import { BusController } from './bus.controller';

const router = Router();
const controller = new BusController();

// 1. Master Data & Station Endpoints
// GET /api/buses/cities - Retrieves master list of all available origin cities or stations
router.get('/cities', (req, res) => controller.getCities(req, res));

// GET /api/buses/destinations?source=Chennai - Available destination stations for selected origin station
router.get('/destinations', (req, res) => controller.getDestinationStations(req, res));

// GET /api/buses/operators - Operator fleet info
router.get('/operators', (req, res) => controller.getOperators(req, res));

// 2. Search & Availability Endpoints
// GET /api/buses/search?origin=Chennai&destination=Vijayawada&date=2026-11-14
router.get('/search', (req, res) => controller.searchBuses(req, res));

// 3. Seat Mapping & Layout Endpoints
// GET /api/buses/:id/layout?date=2026-11-14 - Physical bus layout, upper/lower decks, pricing, gender restrictions
router.get('/:id/layout', (req, res) => controller.getSeatLayout(req, res));

// 4. Boarding & Dropping Point Endpoints
// GET /api/buses/:id/boarding-points - Pickup locations, landmarks, reporting times
router.get('/:id/boarding-points', (req, res) => controller.getBoardingPoints(req, res));

// GET /api/buses/:id/dropping-points - Drop-off locations and estimated arrival times
router.get('/:id/dropping-points', (req, res) => controller.getDroppingPoints(req, res));

// 5. Ticketing & Transaction Endpoints
// POST /api/buses/block-seat - Temporarily hold selected seats (10-15 min) while user enters details/pays
router.post('/block-seat', (req, res) => controller.blockSeat(req, res));

// POST /api/buses/confirm-booking - Commit transaction to SQLite DB, save passengers & issue PNR
router.post('/confirm-booking', (req, res) => controller.confirmSeatBooking(req, res));

// 6. Post-Booking & Cancellation Endpoints
// GET /api/buses/cancellation-policy - Returns penalty tiers and refund rules
router.get('/cancellation-policy', (req, res) => controller.getCancellationPolicy(req, res));

// POST /api/buses/cancel-ticket - Cancels ticket in DB, updates status to Cancelled & calculates refund
router.post('/cancel-ticket', (req, res) => controller.cancelTicket(req, res));

// Specific bus details
// GET /api/buses/:id
router.get('/:id', (req, res) => controller.getBusDetails(req, res));

export default router;
