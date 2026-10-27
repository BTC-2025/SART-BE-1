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

export default router;
