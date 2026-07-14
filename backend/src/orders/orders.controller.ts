import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '../common/enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/order.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.ordersService.create(dto, user);
  }

  @Get('mine')
  @Roles(UserRole.CUSTOMER)
  myOrders(@CurrentUser() user: { id: string }) {
    return this.ordersService.findMyOrders(user.id);
  }

  @Get('online')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CASHIER)
  online() {
    return this.ordersService.findOnlineActive();
  }

  @Get('online/today')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CASHIER)
  onlineToday() {
    return this.ordersService.findOnlineToday();
  }

  @Get('today')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CASHIER)
  today() {
    return this.ordersService.findToday();
  }

  @Get('today/summary')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CASHIER)
  todaySummary() {
    return this.ordersService.todaySummary();
  }

  @Get('status-counts')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CASHIER)
  statusCounts() {
    return this.ordersService.statusCounts();
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.CASHIER)
  findAll() {
    return this.ordersService.findAll();
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.ordersService.findOne(id, user);
  }

  @Patch(':id/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CASHIER)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto);
  }
}
