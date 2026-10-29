import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { AuthenticatedRequest } from '../middleware/auth';
import { io } from '../server';

const router = Router();

// GET /api/bookings - Get all bookings for the active user
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { type, status } = req.query;

    const whereClause: any = { userId };
    if (type) whereClause.type = String(type);
    if (status) whereClause.status = String(status);

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      orderBy: { dateTime: 'desc' }
    });

    res.json({ success: true, count: bookings.length, data: bookings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/bookings/:id - Get a specific booking
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const booking = await prisma.booking.findUnique({
      where: { id }
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.json({ success: true, data: booking });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/bookings - Create a booking (Ride, Rental, Driver, Parking, Carrier, etc.)
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const {
      title,
      type,
      subType,
      dateTime,
      details,
      cost,
      pickupLoc,
      dropLoc,
      extraData,
      deductWallet = false
    } = req.body;

    if (!title || !type || cost === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: title, type, cost'
      });
    }

    const numCost = Number(cost);

    // If payment via wallet is chosen, verify and deduct balance
    if (deductWallet) {
      const wallet = await prisma.wallet.findUnique({ where: { userId } });
      if (!wallet || wallet.balance < numCost) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient wallet balance for this booking'
        });
      }

      await prisma.wallet.update({
        where: { userId },
        data: { balance: { decrement: numCost } }
      });

      await prisma.transaction.create({
        data: {
          userId,
          title: `Booking: ${title}`,
          amount: numCost,
          isCredit: false,
          category: type.charAt(0).toUpperCase() + type.slice(1),
          status: 'Success'
        }
      });
    }

    const booking = await prisma.booking.create({
      data: {
        userId,
        title,
        type,
        subType,
        dateTime: dateTime ? new Date(dateTime) : new Date(),
        details,
        cost: numCost,
        pickupLoc,
        dropLoc,
        extraData: typeof extraData === 'object' ? JSON.stringify(extraData) : extraData,
        status: 'Active'
      }
    });

    // Broadcast new ride booking via Socket.io to business captains portal
    try {
      let parsedExtra: any = {};
      try {
        if (booking.extraData) parsedExtra = JSON.parse(booking.extraData);
      } catch (e) { }

      const cat = (booking.subType || parsedExtra.vehicleType || 'Bike');
      const formattedCat = cat.charAt(0).toUpperCase() + cat.slice(1);

      io.emit('new_incoming_ride', {
        id: booking.id,
        category: formattedCat,
        fare: booking.cost,
        bonus: parsedExtra.bonus || 10,
        pickupDist: parsedExtra.pickupDist || '0.8 km',
        pickupTime: parsedExtra.pickupTime || '3 mins',
        pickupLoc: booking.pickupLoc || 'Current User GPS Location',
        pickupAddress: parsedExtra.pickupAddress || booking.pickupLoc || 'Pickup Location',
        dropDist: parsedExtra.distanceKm ? `${parsedExtra.distanceKm} km` : '3.8 km',
        dropLoc: booking.dropLoc || 'Selected Destination',
        dropAddress: parsedExtra.dropAddress || booking.dropLoc || 'Destination Location',
        extraBadge: parsedExtra.extraBadge || 'Live: User Booking',
        customerName: 'Alex Carter',
        customerPhone: '+91 98765 43210',
        paymentMode: parsedExtra.paymentMode || 'Online / UPI',
        userLat: parsedExtra.userLat || 13.0827,
        userLng: parsedExtra.userLng || 80.2755,
        dropLat: parsedExtra.dropLat || 13.0600,
        dropLng: parsedExtra.dropLng || 80.2200,
        otp: parsedExtra.otp || '2746',
        rideStage: 'pickup',
        status: booking.status,
        isLiveDbBooking: true
      });
    } catch (sockErr) {
      console.warn('[Socket.io] New booking broadcast warning:', sockErr);
    }

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: booking
    });

  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/bookings/:id/status - Update booking status
router.patch('/:id/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;

    if (!['Active', 'Completed', 'Cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { status }
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
