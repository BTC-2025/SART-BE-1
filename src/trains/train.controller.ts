import { Request, Response } from 'express';
import { TrainService } from './train.service';
import { prisma } from '../prisma';

const trainService = new TrainService();

export class TrainController {
  /**
   * 1. GET /api/trains/search?origin=MAS&destination=SBC&date=2026-11-14
   */
  public async searchTrains(req: Request, res: Response) {
    try {
      const origin = (req.query.origin as string) || (req.query.source as string) || 'Chennai';
      const destination = (req.query.destination as string) || (req.query.dest as string) || 'Bengaluru';
      const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

      const trains = trainService.searchTrains(origin, destination, date);

      return res.json({
        success: true,
        source: 'IRCTC_INDIAN_RAILWAYS_GATEWAY',
        query: { origin, destination, date },
        count: trains.length,
        data: trains
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * 2. GET /api/trains/:trainNumber/schedule
   */
  public async getTrainSchedule(req: Request, res: Response) {
    try {
      const trainNumber = String(req.params.trainNumber);
      const train = trainService.getTrainByNumber(trainNumber);

      if (!train) {
        return res.status(404).json({ success: false, message: 'Train schedule not found' });
      }

      return res.json({
        success: true,
        trainNumber: train.number,
        trainName: train.name,
        runningDays: train.runningDays,
        stops: train.stops,
        data: train
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * 3. POST /api/trains/confirm-booking
   * Commit train ticket booking into SQLite DB, generate PNR, update passenger records
   */
  public async confirmTrainBooking(req: Request, res: Response) {
    try {
      const userId = (req as any).userId || req.headers['x-user-id'] || 'usr_default';
      const {
        trainNumber,
        trainName,
        classCode,
        fare,
        source,
        destination,
        dateOfJourney,
        departureTime,
        passengerName,
        passengerAge,
        gender,
        berthPreference,
        passengers,
        email,
        phone,
        irctcId,
        boardingStation,
        paymentDetails,
        freeCancel
      } = req.body;

      if (!trainNumber || !classCode) {
        return res.status(400).json({ success: false, message: 'trainNumber and classCode are required' });
      }

      // Generate unique 10-digit IRCTC style PNR (always strictly 10 digits)
      const pnr = `${Math.floor(1000000000 + Math.random() * 9000000000)}`;
      const bookingId = `TRN${Math.floor(100000 + Math.random() * 900000)}`;
      // Generate unique 15-digit numeric Transaction ID
      const generatedTxnId = `${Date.now()}${Math.floor(10 + Math.random() * 90)}`;
      const coach = classCode === '1A' ? 'H1' : classCode === '2A' ? 'A1' : classCode === '3A' ? 'B2' : classCode === 'CC' ? 'C1' : 'D8';
      const berthNo = Math.floor(1 + Math.random() * 72);
      const totalAmount = Number(fare || 450) + (freeCancel ? 50 : 0);

      // Ensure user exists
      let user = await prisma.user.findUnique({ where: { id: String(userId) } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            id: String(userId),
            name: passengerName || (passengers && passengers[0]?.name) || 'Passenger',
            phone: phone || '+91 9876543210',
            email: email || 'passenger@example.com'
          }
        });
      }

      const passengerList = Array.isArray(passengers) && passengers.length > 0 ? passengers : [
        {
          name: passengerName || 'Passenger',
          age: passengerAge || 25,
          gender: gender || 'Male',
          berthPreference: berthPreference || 'No Preference'
        }
      ];

      const resolvedPaymentDetails = {
        method: paymentDetails?.method || 'UPI',
        provider: paymentDetails?.provider || 'PhonePe',
        status: 'SUCCESS',
        amount: totalAmount,
        txnId: (paymentDetails?.txnId && /^\d{15}$/.test(paymentDetails.txnId)) ? paymentDetails.txnId : generatedTxnId
      };

      const extraDataObj = {
        pnr,
        bookingId,
        txnId: resolvedPaymentDetails.txnId,
        trainNumber,
        trainName: trainName || 'Express Train',
        classCode,
        coach,
        berthNo,
        passengerName: passengerList[0].name,
        passengers: passengerList,
        email: email || '',
        phone: phone || '',
        irctcId: irctcId || '',
        boardingStation: boardingStation || source || 'Chennai',
        source: source || 'Chennai',
        destination: destination || 'Bengaluru',
        dateOfJourney: dateOfJourney || new Date().toLocaleDateString('en-GB'),
        departureTime: departureTime || '06:00 AM',
        seatStatus: `Confirmed (${classCode} - Coach ${coach}, Berth ${berthNo})`,
        statusBadge: 'CNF',
        statusText: 'Ticket Confirmed',
        freeCancel: Boolean(freeCancel),
        paymentDetails: resolvedPaymentDetails,
        type: 'Train'
      };

      const newBooking = await prisma.booking.create({
        data: {
          userId: user.id,
          title: `${trainName || 'Train Booking'} (${trainNumber})`,
          type: 'train',
          subType: classCode,
          dateTime: new Date(),
          details: `PNR: ${pnr} | Coach: ${coach}, Berth: ${berthNo} (${classCode}) | Boarding: ${boardingStation || source}`,
          cost: totalAmount,
          pickupLoc: boardingStation || source || 'Chennai',
          dropLoc: destination || 'Bengaluru',
          extraData: JSON.stringify(extraDataObj),
          status: 'Active'
        }
      });

      // Record in-memory seat booking adjustment so future /search calls return updated AVL or WL
      const bookedPaxCount = passengerList.length || 1;
      TrainService.recordBooking(String(trainNumber), String(classCode), bookedPaxCount, Boolean(req.body.isTatkal));

      return res.status(201).json({
        success: true,
        message: 'Train ticket booked and confirmed in SQLite database successfully!',
        data: {
          id: newBooking.id,
          pnr,
          bookingId,
          txnId: resolvedPaymentDetails.txnId,
          trainNumber,
          trainName,
          classCode,
          coach,
          berthNo,
          totalAmount: newBooking.cost,
          status: 'Confirmed',
          booking: newBooking
        }
      });
    } catch (err: any) {
      console.error('Error booking train:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * 4. POST /api/trains/cancel-ticket
   */
  public async cancelTrainTicket(req: Request, res: Response) {
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
        booking = await prisma.booking.findFirst({
          where: {
            type: 'train',
            details: { contains: pnr }
          }
        });
      }

      if (!booking) {
        return res.status(404).json({ success: false, message: 'No active train booking found for this PNR/ID' });
      }

      const refundAmount = Math.round(booking.cost * 0.9);
      let parsedExtra: any = {};
      try {
        if (booking.extraData) parsedExtra = JSON.parse(booking.extraData);
      } catch (e) {}

      parsedExtra.statusBadge = 'CAN';
      parsedExtra.statusText = 'Cancelled';
      parsedExtra.cancellationReason = reason || 'User requested train cancellation';
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
        message: 'Train ticket cancelled successfully',
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
   * 5. GET /api/trains/live/:trainNumber
   */
  public async getLiveStatus(req: Request, res: Response) {
    try {
      const { trainNumber } = req.params;
      return res.json({
        success: true,
        source: 'IRCTC_NTES_LIVE_GPS',
        trainNumber,
        status: 'Running on time',
        delayMinutes: 0,
        lastUpdatedStation: 'Next upcoming Junction'
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}
