import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/wallet - Get wallet details and recent transactions
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    let wallet = await prisma.wallet.findUnique({
      where: { userId }
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId,
          balance: 15000.0,
          points: 2450,
          cashback: 350.0
        }
      });
    }

    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 20
    });

    res.json({
      success: true,
      data: {
        wallet,
        transactions
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/wallet/topup - Deposit/add funds to wallet
router.post('/topup', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { amount, title = 'Wallet Top-up' } = req.body;

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    const updatedWallet = await prisma.wallet.upsert({
      where: { userId },
      update: { balance: { increment: numAmount } },
      create: { userId, balance: numAmount }
    });

    const tx = await prisma.transaction.create({
      data: {
        userId,
        title,
        amount: numAmount,
        isCredit: true,
        category: 'Deposit',
        status: 'Success'
      }
    });

    res.json({
      success: true,
      data: {
        wallet: updatedWallet,
        transaction: tx
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});


// POST /api/wallet/withdraw - Captain withdraws earnings to bank / UPI
router.post('/withdraw', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { amount, phone, captainId, paymentMethod = 'UPI', upiId, bankAccountNumber, ifscCode } = req.body;
    const numAmount = Number(amount);

    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Please enter a valid withdrawal amount greater than 0.' });
    }

    // Resolve captain user
    let user = null;
    const cleanPhone = phone ? String(phone).replace(/\D/g, '') : '';
    if (captainId) {
      user = await prisma.user.findUnique({ where: { id: captainId } });
    }
    if (!user && cleanPhone) {
      user = await prisma.user.findFirst({
        where: {
          phone: { contains: cleanPhone }
        }
      });
    }
    if (!user && req.userId) {
      user = await prisma.user.findUnique({ where: { id: req.userId } });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'Captain account not found for withdrawal.' });
    }

    // Get current wallet
    let wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
    if (!wallet || wallet.balance < numAmount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient wallet balance. Available: ₹${wallet ? wallet.balance : 0}, requested: ₹${numAmount}`
      });
    }

    // Deduct balance from wallet
    const updatedWallet = await prisma.wallet.update({
      where: { userId: user.id },
      data: {
        balance: wallet.balance - numAmount
      }
    });

    // Record withdrawal transaction
    const destinationDesc = paymentMethod === 'UPI' ? `UPI (${upiId || 'Linked UPI'})` : `Bank A/C (${bankAccountNumber ? bankAccountNumber.slice(-4) : 'Primary'})`;
    const tx = await prisma.transaction.create({
      data: {
        userId: user.id,
        title: `Withdrawal to ${destinationDesc}`,
        amount: numAmount,
        isCredit: false,
        category: 'Withdrawal',
        status: 'Success'
      }
    });

    res.json({
      success: true,
      message: `₹${numAmount} successfully withdrawn to ${destinationDesc}!`,
      data: {
        wallet: updatedWallet,
        transaction: tx
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/wallet/captain - Get dedicated captain wallet & transaction history
router.get('/captain', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const queryPhone = req.query.phone ? String(req.query.phone).replace(/\D/g, '') : '';
    const queryCaptainId = req.query.captainId ? String(req.query.captainId) : '';

    let user = null;
    if (queryCaptainId) {
      user = await prisma.user.findUnique({ where: { id: queryCaptainId } });
    }
    if (!user && queryPhone) {
      user = await prisma.user.findFirst({
        where: {
          phone: { contains: queryPhone }
        }
      });
    }
    if (!user && req.userId) {
      user = await prisma.user.findUnique({ where: { id: req.userId } });
    }

    if (!user) {
      return res.json({
        success: true,
        data: {
          wallet: { balance: 0, points: 0, cashback: 0 },
          transactions: []
        }
      });
    }

    let wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId: user.id,
          balance: 0,
          points: 0,
          cashback: 0
        }
      });
    }

    const transactions = await prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { date: 'desc' },
      take: 50
    });

    res.json({
      success: true,
      data: {
        wallet,
        transactions
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

