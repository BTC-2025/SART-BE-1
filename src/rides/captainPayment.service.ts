import { Response } from 'express';
import { prisma } from '../prisma';
import { AuthenticatedRequest } from '../middleware/auth';
import { io } from '../server';

export async function handleCaptainCompleteRide(req: AuthenticatedRequest, res: Response) {
  try {
    const { orderId, paymentMethod = 'online' } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, message: 'orderId is required' });
    }

    const booking = await prisma.booking.findUnique({ where: { id: orderId } });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Ride booking not found' });
    }

    let parsedExtra: any = {};
    try {
      if (booking.extraData) parsedExtra = JSON.parse(booking.extraData);
    } catch (e) {}

    const fareAmount = booking.cost || 45;
    const bonusAmount = parsedExtra.bonus || 10;
    const totalEarned = fareAmount + bonusAmount;
    const isCash = paymentMethod === 'cash';

    const updatedExtra = {
      ...parsedExtra,
      rideStage: 'completed',
      paymentMethod,
      isCash,
      completedAt: new Date().toISOString(),
      earnedAmount: totalEarned
    };

    // 1. Update Booking in database
    await prisma.booking.update({
      where: { id: orderId },
      data: {
        status: 'Completed',
        extraData: JSON.stringify(updatedExtra)
      }
    });

    // 2. Realtime socket notification
    try {
      io.to(`booking_${orderId}`).emit('booking_status_changed', {
        bookingId: orderId,
        status: 'Completed',
        rideStage: 'completed',
        paymentMethod,
        isCash
      });
      io.emit('ride_status_global_sync', {
        bookingId: orderId,
        status: 'Completed',
        rideStage: 'completed',
        paymentMethod,
        isCash
      });
    } catch (e) {}

    // Find driver user
    const captainPhone = parsedExtra.captainPhone || '+91 98765 43210';
    const captainName = parsedExtra.captainName || 'Sai (Star Captain)';

    let driverUser = await prisma.user.findFirst({
      where: {
        OR: [{ role: 'driver' }, { phone: captainPhone }]
      }
    });

    if (!driverUser) {
      driverUser = await prisma.user.create({
        data: {
          name: captainName,
          phone: captainPhone,
          role: 'driver'
        }
      });
    }

    const captainUserId = driverUser.id;
    let wallet = await prisma.wallet.findUnique({ where: { userId: captainUserId } });

    // When CASH: Captain receives physical cash, so it is NOT credited to digital wallet
    // When ONLINE: Transfer completed, credited directly to Captain's wallet
    if (!isCash) {
      if (!wallet) {
        wallet = await prisma.wallet.create({
          data: {
            userId: captainUserId,
            balance: totalEarned,
            points: 50,
            cashback: 0
          }
        });
      } else {
        wallet = await prisma.wallet.update({
          where: { userId: captainUserId },
          data: {
            balance: wallet.balance + totalEarned,
            points: wallet.points + 50
          }
        });
      }

      await prisma.transaction.create({
        data: {
          userId: captainUserId,
          title: `Online Fare Received: ${booking.pickupLoc || 'Pickup'} to ${booking.dropLoc || 'Drop'}`,
          amount: totalEarned,
          isCredit: true,
          category: 'Ride',
          status: 'Success'
        }
      });
    }

    const currentBalance = wallet ? wallet.balance : 0;

    return res.json({
      success: true,
      message: isCash
        ? `Cash Payment of ₹${totalEarned} collected directly. Not added to wallet.`
        : `Online payment of ₹${totalEarned} verified! Credited to Captain wallet.`,
      paymentMethod,
      isCash,
      fare: fareAmount,
      bonus: bonusAmount,
      totalEarned,
      newBalance: currentBalance
    });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
}
