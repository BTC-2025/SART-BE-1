import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/cart - Get active user's cart
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const items = await prisma.cartItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    res.json({
      success: true,
      data: {
        items,
        subtotal,
        count: items.length
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/cart - Add item to cart
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { productId, title, price, quantity = 1, image, category } = req.body;

    if (!productId || !title || price === undefined) {
      return res.status(400).json({ success: false, message: 'Missing item fields' });
    }

    const existing = await prisma.cartItem.findFirst({
      where: { userId, productId }
    });

    let item;
    if (existing) {
      item = await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + Number(quantity) }
      });
    } else {
      item = await prisma.cartItem.create({
        data: {
          userId,
          productId,
          title,
          price: Number(price),
          quantity: Number(quantity),
          image,
          category
        }
      });
    }

    res.json({ success: true, data: item });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/cart/:id - Remove item from cart
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.cartItem.deleteMany({
      where: { id, userId: req.userId! }
    });

    res.json({ success: true, message: 'Item removed from cart' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/cart/checkout - Checkout cart
router.post('/checkout', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const cartItems = await prisma.cartItem.findMany({ where: { userId } });

    if (cartItems.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet || wallet.balance < total) {
      return res.status(400).json({ success: false, message: 'Insufficient wallet balance for checkout' });
    }

    // Deduct wallet balance
    await prisma.wallet.update({
      where: { userId },
      data: { balance: { decrement: total } }
    });

    // Create Transaction
    await prisma.transaction.create({
      data: {
        userId,
        title: `Store Order (${cartItems.length} items)`,
        amount: total,
        isCredit: false,
        category: 'Store',
        status: 'Success'
      }
    });

    // Create booking record for Store Order
    const booking = await prisma.booking.create({
      data: {
        userId,
        title: `Store Order - ${cartItems[0].title}${cartItems.length > 1 ? ` +${cartItems.length - 1} more` : ''}`,
        type: 'store',
        cost: total,
        status: 'Active',
        details: `${cartItems.length} items ordered via SART Store`,
        extraData: JSON.stringify(cartItems)
      }
    });

    // Clear cart
    await prisma.cartItem.deleteMany({ where: { userId } });

    res.json({
      success: true,
      message: 'Checkout successful',
      data: { booking, total }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
