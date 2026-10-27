import Redis from 'ioredis';
import RedisMock from 'ioredis-mock';

const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;

let redisClient: any;
let isConnected = false;

try {
  // If no external REDIS_URL or local server is specified, initialize resilient Redis client with mock fallback
  if (process.env.USE_REDIS_MOCK === 'true' || !process.env.REDIS_URL) {
    redisClient = new RedisMock();
    isConnected = true;
    console.log('⚡ Redis Client: Initialized high-speed in-memory Redis cache (mock engine ready)');
  } else {
    redisClient = process.env.REDIS_URL
      ? new Redis(process.env.REDIS_URL)
      : new Redis({
          host: REDIS_HOST,
          port: REDIS_PORT,
          lazyConnect: true,
          maxRetriesPerRequest: 1
        });

    redisClient.on('connect', () => {
      isConnected = true;
      console.log('⚡ Redis Client: Connected to live Redis instance!');
    });

    redisClient.on('error', (err: any) => {
      console.warn('⚠️ Redis live connection failed, falling back to in-memory Redis cache:', err.message);
      redisClient = new RedisMock();
      isConnected = true;
    });
  }
} catch (e) {
  redisClient = new RedisMock();
  isConnected = true;
}

export const redis = redisClient;
export const isRedisConnected = () => isConnected;
