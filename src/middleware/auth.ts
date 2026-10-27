import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';

export const JWT_SECRET = process.env.JWT_SECRET || 'sart_captain_jwt_secret_key_2026_super_secure';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: string;
  captainUser?: any;
}

// 1. Generate JWT Token for Captain/Driver User
export const signCaptainToken = (user: { id: string; role: string; phone?: string | null; name?: string | null }) => {
  return jwt.sign(
    {
      id: user.id,
      role: user.role || 'driver',
      phone: user.phone,
      name: user.name
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// 2. Authentication Middleware — Verify JWT token (with fallback for local captain demo)
export const verifyJwtToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.userId = decoded.id;
      req.userRole = decoded.role || 'driver';
      req.captainUser = decoded;
      return next();
    } catch (err: any) {
      // If token expired or invalid, fallback to demo driver for seamless testing
      console.warn('JWT verification failed, falling back to demo driver:', err.message);
    }
  }

  // Graceful fallback for local development & captain portal demo
  req.userId = 'driver-demo-01';
  req.userRole = 'driver';
  req.captainUser = {
    id: 'driver-demo-01',
    role: 'driver',
    name: 'Sai (Star Captain)',
    phone: '+91 98765 43210'
  };
  next();
};

// 3. Authorization Middleware — Check user role (e.g. 'driver', 'admin')
export const authorizeRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const role = req.userRole || 'driver';
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access denied. Required role in [${allowedRoles.join(', ')}], but your role is '${role}'.`
      });
    }
    next();
  };
};

// 4. Backward-compatible userContextMiddleware (extracts x-user-id or JWT if present)
export const userContextMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // If Bearer token is passed, extract from JWT
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        req.userId = decoded.id;
        req.userRole = decoded.role;
        req.captainUser = decoded;
        return next();
      } catch (e) { }
    }

    const headerUserId = req.headers['x-user-id'] as string;
    let user;
    if (headerUserId) {
      user = await prisma.user.findUnique({ where: { id: headerUserId } });
    }

    if (!user) {
      user = await prisma.user.upsert({
        where: { email: 'demo@sart.com' },
        update: {},
        create: {
          id: 'user-sart-demo',
          email: 'demo@sart.com',
          name: 'Sai',
          phone: '+91 98765 43210',
          role: 'driver',
          wallet: {
            create: {
              balance: 15000.0,
              points: 2450,
              cashback: 350.0
            }
          }
        }
      });
    }

    req.userId = user.id;
    req.userRole = user.role;
    next();
  } catch (error) {
    console.error('User Context Middleware Error:', error);
    next();
  }
};
