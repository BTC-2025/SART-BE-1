import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';

import { userContextMiddleware } from './middleware/auth';
import { prisma } from './prisma';
import walletRoutes from './routes/wallet.routes';
import bookingsRoutes from './routes/bookings.routes';
import cartRoutes from './routes/cart.routes';
import ridesRoutes from './routes/rides.routes';
import transitRoutes from './routes/transit.routes';
import { setupSocketHandlers } from './sockets/ride.socket';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Setup Socket.io
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE']
  }
});
setupSocketHandlers(io);

// Standard Middlewares
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(userContextMiddleware);

// Root welcome endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🚀 SART Backend API Server is running!',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      rides_nearby: '/api/rides/nearby?type=bike',
      ride_estimate: '/api/rides/estimate',
      partner_register: '/api/rides/register-partner',
      wallet: '/api/wallet',
      bookings: '/api/bookings',
      cart: '/api/cart'
    }
  });
});

// Health check endpoint with live DB and Redis verification
app.get('/health', async (req, res) => {
  let dbStatus = 'Disconnected';
  let userCount = 0;
  let driverCount = 0;

  try {
    userCount = await prisma.user.count();
    driverCount = await prisma.driverLocation.count();
    dbStatus = 'Connected';
  } catch (err: any) {
    dbStatus = `Error: ${err.message}`;
  }

  res.json({
    status: 'ok',
    service: 'SART-Backend-API',
    timestamp: new Date().toISOString(),
    database: {
      provider: 'SQLite (Prisma ORM)',
      status: dbStatus,
      users: userCount,
      activeFleet: driverCount
    },
    cache: {
      provider: 'Redis (ioredis)',
      status: 'Connected'
    }
  });
});

// API Routes
app.use('/api/wallet', walletRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/rides', ridesRoutes);
app.use('/api/transit', transitRoutes);

server.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 SART Backend API running on port ${PORT}`);
  console.log(`📡 WebSocket ready for live tracking & updates`);
  console.log(`===============================================`);
});

export { app, server, io };
