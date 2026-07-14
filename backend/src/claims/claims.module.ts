import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../orders/order.entity';
import { ClaimsController } from './claims.controller';
import { ClaimsService } from './claims.service';
import { OrderClaim } from './order-claim.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OrderClaim, Order])],
  controllers: [ClaimsController],
  providers: [ClaimsService],
  exports: [ClaimsService],
})
export class ClaimsModule {}
