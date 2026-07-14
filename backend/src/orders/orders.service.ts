import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, Repository } from 'typeorm';
import { OrderSource, OrderStatus, UserRole } from '../common/enums';
import { Inventory } from '../inventory/inventory.entity';
import { Product } from '../products/product.entity';
import { ShopSettings } from '../shop/shop-settings.entity';
import { User } from '../users/user.entity';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/order.dto';
import { OrderItem } from './order-item.entity';
import { Order } from './order.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepo: Repository<Order>,
    private readonly dataSource: DataSource,
  ) {}

  private startOfToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private endOfToday() {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  }

  async create(
    dto: CreateOrderDto,
    user: { id: string; role: UserRole },
  ) {
    const source =
      user.role === UserRole.CUSTOMER ? OrderSource.ONLINE : OrderSource.POS;

    return this.dataSource.transaction(async (manager) => {
      const settings = await manager.findOne(ShopSettings, { where: {} });
      const taxPercent = Number(settings?.taxPercent ?? 0);

      let subtotal = 0;
      const lineItems: Partial<OrderItem>[] = [];

      for (const item of dto.items) {
        const product = await manager.findOne(Product, {
          where: { id: item.productId },
          relations: { inventory: true },
        });
        if (!product || !product.isAvailable) {
          throw new BadRequestException(
            `Product unavailable: ${item.productId}`,
          );
        }
        const inventory = await manager.findOne(Inventory, {
          where: { productId: product.id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!inventory || inventory.quantity < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for ${product.name}`,
          );
        }
        inventory.quantity -= item.quantity;
        await manager.save(inventory);

        const unitPrice = Number(product.price);
        const lineTotal = unitPrice * item.quantity;
        subtotal += lineTotal;
        lineItems.push({
          productId: product.id,
          productName: product.name,
          quantity: item.quantity,
          unitPrice,
          lineTotal,
        });
      }

      const tax = Math.round(subtotal * (taxPercent / 100) * 100) / 100;
      const total = Math.round((subtotal + tax) * 100) / 100;
      const count = await manager.count(Order);
      const orderNumber = `ORD-${String(count + 1).padStart(5, '0')}`;

      const order = manager.create(Order, {
        orderNumber,
        status: OrderStatus.PENDING,
        source,
        paymentMethod: dto.paymentMethod,
        subtotal,
        tax,
        total,
        note: dto.note?.trim() || null,
        createdById: user.id,
      });
      const savedOrder = await manager.save(order);

      for (const line of lineItems) {
        const orderItem = manager.create(OrderItem, {
          ...line,
          orderId: savedOrder.id,
        });
        await manager.save(orderItem);
      }

      return this.sanitizeOrder(
        await manager.findOne(Order, {
          where: { id: savedOrder.id },
          relations: { items: true, createdBy: true },
        }),
      );
    });
  }

  findToday(source?: OrderSource) {
    return this.ordersRepo
      .find({
        where: {
          createdAt: Between(this.startOfToday(), this.endOfToday()),
          ...(source ? { source } : {}),
        },
        relations: { items: true, createdBy: true },
        order: { createdAt: 'DESC' },
      })
      .then((orders) => this.sanitizeOrders(orders));
  }

  findOnlineActive() {
    return this.ordersRepo
      .find({
        where: [
          {
            source: OrderSource.ONLINE,
            status: OrderStatus.PENDING,
          },
          {
            source: OrderSource.ONLINE,
            status: OrderStatus.PREPARING,
          },
          {
            source: OrderSource.ONLINE,
            status: OrderStatus.READY,
          },
        ],
        relations: { items: true, createdBy: true },
        order: { createdAt: 'ASC' },
      })
      .then((orders) => this.sanitizeOrders(orders));
  }

  findOnlineToday() {
    return this.findToday(OrderSource.ONLINE);
  }

  findMyOrders(userId: string) {
    return this.ordersRepo
      .find({
        where: { createdById: userId },
        relations: { items: true, createdBy: true },
        order: { createdAt: 'DESC' },
        take: 50,
      })
      .then((orders) => this.sanitizeOrders(orders));
  }

  findAll(limit = 50) {
    return this.ordersRepo
      .find({
        relations: { items: true, createdBy: true },
        order: { createdAt: 'DESC' },
        take: limit,
      })
      .then((orders) => this.sanitizeOrders(orders));
  }

  async findOne(
    id: string,
    user?: { id: string; role: UserRole },
  ) {
    const order = await this.ordersRepo.findOne({
      where: { id },
      relations: { items: true, createdBy: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (
      user?.role === UserRole.CUSTOMER &&
      order.createdById !== user.id
    ) {
      throw new ForbiddenException('Not your order');
    }
    return this.sanitizeOrder(order);
  }

  async todaySummary() {
    const orders = await this.findToday();
    const active = orders.filter((o) => o.status !== OrderStatus.CANCELLED);
    const revenue = active.reduce((sum, o) => sum + Number(o.total), 0);
    return {
      orderCount: active.length,
      revenue: Math.round(revenue * 100) / 100,
      orders,
    };
  }

  async statusCounts() {
    const today = await this.findToday();
    const onlineToday = today.filter((o) => o.source === OrderSource.ONLINE);
    const allToday = today;

    const countByStatus = (orders: Order[]) => {
      const counts: Record<string, number> = {
        PENDING: 0,
        PREPARING: 0,
        READY: 0,
        COMPLETED: 0,
        CANCELLED: 0,
      };
      for (const order of orders) {
        counts[order.status] = (counts[order.status] || 0) + 1;
      }
      return counts;
    };

    const online = countByStatus(onlineToday);
    const overall = countByStatus(allToday);

    return {
      online: {
        ...online,
        total: onlineToday.length,
        active:
          online.PENDING + online.PREPARING + online.READY,
      },
      today: {
        ...overall,
        total: allToday.length,
        active:
          overall.PENDING + overall.PREPARING + overall.READY,
      },
    };
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    const order = await this.ordersRepo.findOne({
      where: { id },
      relations: { items: true, createdBy: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    order.status = dto.status;
    const saved = await this.ordersRepo.save(order);
    return this.sanitizeOrder(saved);
  }

  private sanitizeOrder<T extends Order | null>(order: T): T {
    if (order?.createdBy) {
      const { passwordHash: _, ...safe } = order.createdBy as User & {
        passwordHash?: string;
      };
      order.createdBy = safe as User;
    }
    return order;
  }

  private sanitizeOrders(orders: Order[]) {
    return orders.map((o) => this.sanitizeOrder(o));
  }
}
