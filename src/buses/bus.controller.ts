import { Request, Response } from 'express';
import { BusService } from './bus.service';
import { prisma } from '../prisma';

const busService = new BusService();

export class BusController {
  /**
   * 1. GET /api/buses/cities
   * Retrieves master list of all available origin cities or stations.
   */
  public async getCities(req: Request, res: Response) {
    try {
      const { POPULAR_BUS_CITIES } = await import('./bus.data.js');
      return res.json({
        success: true,
        count: POPULAR_BUS_CITIES.length,
        data: POPULAR_BUS_CITIES
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * 2. GET /api/buses/destinations?source=Chennai
   * Fetches the available destination cities based on the selected origin station.
   */
  public async getDestinationStations(req: Request, res: Response) {
    try {
      const source = (req.query.source as string) || (req.query.origin as string) || 'Chennai';
      const destinations = busService.getDestinationStations(source);
      return res.json({
        success: true,
        source,
        count: destinations.length,
        data: destinations
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * 3. GET /api/buses/search?origin=Pune&destination=Mumbai&date=2026-11-13
   * Available Buses / Trip Search: Returns JSON array of all available buses, operators, times, fares.
   */
  public async searchBuses(req: Request, res: Response) {
    try {
      const origin = (req.query.origin as string) || (req.query.source as string) || 'Chennai';
      const destination = (req.query.destination as string) || (req.query.dest as string) || 'Vijayawada';
      const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

      const buses = busService.searchBuses(origin, destination, date);

      return res.json({
        success: true,
        source: 'REDBUS_ABHIBUS_LIVE_GATEWAY',
        query: { origin, destination, date },
        count: buses.length,
        data: buses
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * 4. GET /api/buses/:id
   * Specific bus details
   */
  public async getBusDetails(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const origin = req.query.origin as string | undefined;
      const destination = req.query.destination as string | undefined;
      const date = req.query.date as string | undefined;
      const bus = busService.getBusById(id, origin, destination, date);

      if (!bus) {
        return res.status(404).json({ success: false, message: 'Bus not found' });
      }

      return res.json({
        success: true,
        data: bus
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * 5. GET /api/buses/:id/layout
   * Seat Layout / TotalSeatList: Physical layout of lower/upper deck, seat types, pricing, and gender restrictions.
   */
  public async getSeatLayout(req: Request, res: Response) {
    try {
      const busId = String(req.params.id);
      const date = req.query.date as string | undefined;
      const layout = busService.getSeatLayout(busId, date);

      if (!layout) {
        return res.status(404).json({ success: false, message: 'Bus layout not found' });
      }

      return res.json({
        success: true,
        data: layout
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * 6. GET /api/buses/:id/boarding-points
   * Retrieves list of pickup locations, landmarks, reporting times for selected bus.
   */
  public async getBoardingPoints(req: Request, res: Response) {
    try {
      const busId = String(req.params.id);
      const bus = busService.getBusById(busId);
      if (!bus) return res.status(404).json({ success: false, message: 'Bus not found' });

      return res.json({
        success: true,
        busId,
        operator: bus.operator,
        data: bus.boardingPoints
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * 7. GET /api/buses/:id/dropping-points
   * Retrieves list of drop-off locations and estimated arrival times for the destination.
   */
  public async getDroppingPoints(req: Request, res: Response) {
    try {
      const busId = String(req.params.id);
      const bus = busService.getBusById(busId);
      if (!bus) return res.status(404).json({ success: false, message: 'Bus not found' });

      return res.json({
        success: true,
        busId,
        operator: bus.operator,
        data: bus.droppingPoints
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * 8. POST /api/buses/block-seat
   * Block Seat: Temporarily holds selected seats for 10-15 minutes with passenger details.
   */
  public async blockSeat(req: Request, res: Response) {
    try {
      const { busId, travelDate, seats, passengers } = req.body;
      if (!busId || !seats || !Array.isArray(seats) || seats.length === 0) {
        return res.status(400).json({ success: false, message: 'busId and seats array are required' });
      }

      const result = busService.blockSeats({
        busId,
        travelDate: travelDate || new Date().toISOString().split('T')[0],
        seats,
        passengers: passengers || []
      });

      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * 9. POST /api/buses/confirm-booking
   * Confirm Seat Booking: Commits the transaction to Prisma SQLite DB, stores user and passenger details, and returns confirmed PNR.
   */
  public async confirmSeatBooking(req: Request, res: Response) {
    try {
      const userId = (req as any).userId || req.headers['x-user-id'] || 'usr_default';
      const {
        busId,
        operator,
        busType,
        source,
        destination,
        dateOfJourney,
        sourceTime,
        destinationTime,
        selectedSeats,
        passengers,
        contactDetails,
        totalAmount,
        boardingPoint,
        droppingPoint
      } = req.body;

      if (!selectedSeats || !Array.isArray(selectedSeats) || selectedSeats.length === 0) {
        return res.status(400).json({ success: false, message: 'selectedSeats array is required' });
      }

      const pnr = `BUS${Math.floor(10000000 + Math.random() * 90000000)}`;
      const bookingId = `BK-${Math.floor(100000 + Math.random() * 900000)}`;
      const otp = Math.floor(1000 + Math.random() * 9000).toString();

      // Ensure user exists in Prisma DB so relation does not fail
      let user = await prisma.user.findUnique({ where: { id: String(userId) } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            id: String(userId),
            name: (passengers && passengers[0]?.name) || 'Customer',
            phone: contactDetails?.phone || '+91 9876543210',
            email: contactDetails?.email || 'customer@example.com'
          }
        });
      }

      const extraDataObj = {
        pnr,
        bookingId,
        busId,
        operator: operator || 'Express Bus Service',
        passengerName: (passengers && passengers[0]?.name) || user.name || 'Passenger',
        passengers: passengers || [],
        contactDetails: contactDetails || {},
        source: source || 'Chennai',
        sourceCode: (source || 'Chennai').substring(0, 3).toUpperCase(),
        destination: destination || 'Vijayawada',
        destinationCode: (destination || 'Vijayawada').substring(0, 3).toUpperCase(),
        sourceTime: sourceTime || '22:00',
        sourceDate: dateOfJourney || new Date().toLocaleDateString('en-GB'),
        destinationTime: destinationTime || '06:00',
        destinationDate: dateOfJourney || new Date().toLocaleDateString('en-GB'),
        selectedSeats,
        seatStatus: `Confirmed Seats: ${selectedSeats.join(', ')}`,
        statusBadge: 'CNF',
        statusText: 'Ticket Confirmed',
        boardingPoint: boardingPoint || { name: `${source} Central Hub`, time: sourceTime || '22:00' },
        droppingPoint: droppingPoint || { name: `${destination} Terminus`, time: destinationTime || '06:00' },
        stops: [
          { name: source, time: sourceTime || '22:00', status: 'past' },
          { name: destination, time: destinationTime || '06:00', status: 'future' }
        ],
        otp,
        rideStage: 'confirmed'
      };

      const newBooking = await prisma.booking.create({
        data: {
          userId: user.id,
          title: `${operator || 'Bus Booking'} (${busType || 'Express'})`,
          type: 'bus',
          subType: busType || 'AC Sleeper (2+1)',
          dateTime: new Date(),
          details: `Seats: ${selectedSeats.join(', ')} | PNR: ${pnr}`,
          cost: Number(totalAmount) || 899,
          pickupLoc: typeof boardingPoint === 'object' ? boardingPoint.name : (boardingPoint || source),
          dropLoc: typeof droppingPoint === 'object' ? droppingPoint.name : (droppingPoint || destination),
          extraData: JSON.stringify(extraDataObj),
          status: 'Active'
        }
      });

      return res.status(201).json({
        success: true,
        message: 'Ticket confirmed and stored in SQLite database successfully!',
        data: {
          id: newBooking.id,
          pnr,
          bookingId,
          operator: operator || 'Express Bus Service',
          selectedSeats,
          totalAmount: newBooking.cost,
          status: 'Confirmed',
          booking: newBooking
        }
      });
    } catch (err: any) {
      console.error('Error confirming bus booking:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * 10. GET /api/buses/cancellation-policy
   * Returns specific operator penalty tiers
   */
  public async getCancellationPolicy(req: Request, res: Response) {
    try {
      const busId = req.query.busId as string | undefined;
      const policy = busService.getCancellationPolicy(busId);
      return res.json({
        success: true,
        data: policy
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * 11. POST /api/buses/cancel-ticket
   * Processes cancellation request using PNR or booking ID, updating booking in SQLite DB and calculating refund
   */
  public async cancelTicket(req: Request, res: Response) {
    try {
      const { pnr, bookingId, reason } = req.body;
      if (!pnr && !bookingId) {
        return res.status(400).json({ success: false, message: 'pnr or bookingId is required' });
      }

      let booking = null;
      if (bookingId) {
        booking = await prisma.booking.findUnique({ where: { id: String(bookingId) } });
      }
      if (!booking && pnr) {
        // Search in details or extraData
        booking = await prisma.booking.findFirst({
          where: {
            type: 'bus',
            details: { contains: pnr }
          }
        });
      }

      if (!booking) {
        return res.status(404).json({ success: false, message: 'No active bus booking found for this PNR/ID' });
      }

      // Calculate 100% or 90% refund
      const refundAmount = Math.round(booking.cost * 0.9);

      let parsedExtra: any = {};
      try {
        if (booking.extraData) parsedExtra = JSON.parse(booking.extraData);
      } catch (e) { }

      parsedExtra.statusBadge = 'CAN';
      parsedExtra.statusText = 'Cancelled';
      parsedExtra.cancellationReason = reason || 'Customer requested cancellation';
      parsedExtra.refundAmount = refundAmount;

      const updated = await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: 'Cancelled',
          extraData: JSON.stringify(parsedExtra)
        }
      });

      return res.json({
        success: true,
        message: 'Ticket successfully cancelled',
        data: {
          bookingId: updated.id,
          pnr: parsedExtra.pnr || pnr,
          refundAmount,
          status: 'Cancelled',
          updatedBooking: updated
        }
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * 12. GET /api/buses/operators
   */
  public async getOperators(req: Request, res: Response) {
    try {
      const { REDBUS_ABHIBUS_OPERATORS } = await import('./bus.data.js');
      return res.json({
        success: true,
        count: REDBUS_ABHIBUS_OPERATORS.length,
        data: REDBUS_ABHIBUS_OPERATORS
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}
