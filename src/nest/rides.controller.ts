import { Controller, Get, Query } from '@nestjs/common';
import { prisma } from '../prisma';
import { redis } from '../redis';

@Controller('nest/rides')
export class NestRidesController {
  @Get('nearby')
  async getNearby(@Query('type') type: string = 'bike') {
    const cacheKey = `nearby_rides_${type}`;

    // Redis check
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return {
          framework: 'NestJS',
          source: 'redis_cache',
          count: JSON.parse(cached).length,
          data: JSON.parse(cached)
        };
      }
    } catch (e) {}

    const drivers = await prisma.driverLocation.findMany({
      where: { serviceType: type }
    });

    try {
      await redis.setex(cacheKey, 30, JSON.stringify(drivers));
    } catch (e) {}

    return {
      framework: 'NestJS',
      source: 'database',
      count: drivers.length,
      data: drivers
    };
  }
}
