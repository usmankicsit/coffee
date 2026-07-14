import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { OrderStatus } from '../common/enums';
import { Order } from '../orders/order.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepo: Repository<Order>,
  ) {}

  async salesSummary(from?: string, to?: string) {
    const start = from ? new Date(from) : new Date();
    start.setHours(0, 0, 0, 0);
    const end = to ? new Date(to) : new Date();
    end.setHours(23, 59, 59, 999);

    const orders = await this.ordersRepo.find({
      where: {
        createdAt: Between(start, end),
        status: OrderStatus.COMPLETED,
      },
      relations: { items: true },
    });

    // Include non-cancelled for revenue dashboard
    const allInRange = await this.ordersRepo.find({
      where: { createdAt: Between(start, end) },
      relations: { items: true },
    });

    const active = allInRange.filter((o) => o.status !== OrderStatus.CANCELLED);
    const revenue = active.reduce((s, o) => s + Number(o.total), 0);
    const byStatus = Object.values(OrderStatus).reduce(
      (acc, status) => {
        acc[status] = allInRange.filter((o) => o.status === status).length;
        return acc;
      },
      {} as Record<string, number>,
    );

    const productSales: Record<
      string,
      { name: string; quantity: number; revenue: number }
    > = {};
    for (const order of active) {
      for (const item of order.items || []) {
        if (!productSales[item.productId]) {
          productSales[item.productId] = {
            name: item.productName,
            quantity: 0,
            revenue: 0,
          };
        }
        productSales[item.productId].quantity += item.quantity;
        productSales[item.productId].revenue += Number(item.lineTotal);
      }
    }

    return {
      from: start.toISOString(),
      to: end.toISOString(),
      orderCount: active.length,
      completedCount: orders.length,
      revenue: Math.round(revenue * 100) / 100,
      byStatus,
      topProducts: Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10),
    };
  }
}
