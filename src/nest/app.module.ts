import { Module } from '@nestjs/common';
import { NestRidesController } from './rides.controller';

@Module({
  controllers: [NestRidesController],
  providers: []
})
export class AppModule {}
