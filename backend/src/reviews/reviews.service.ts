import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderStatus } from '../common/enums';
import { Order } from '../orders/order.entity';
import { CreateReviewDto } from './dto/review.dto';
import { ProductReview } from './product-review.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(ProductReview)
    private readonly reviewsRepo: Repository<ProductReview>,
    @InjectRepository(Order)
    private readonly ordersRepo: Repository<Order>,
  ) {}

  async create(userId: string, dto: CreateReviewDto) {
    const order = await this.ordersRepo.findOne({
      where: { id: dto.orderId },
      relations: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.createdById !== userId) {
      throw new ForbiddenException('Not your order');
    }
    if (order.status !== OrderStatus.COMPLETED && order.status !== OrderStatus.READY) {
      throw new BadRequestException(
        'You can review products after the order is ready or completed',
      );
    }
    const inOrder = (order.items || []).some((i) => i.productId === dto.productId);
    if (!inOrder) {
      throw new BadRequestException('Product was not part of this order');
    }

    const existing = await this.reviewsRepo.findOne({
      where: {
        orderId: dto.orderId,
        productId: dto.productId,
        userId,
      },
    });
    if (existing) {
      existing.rating = dto.rating;
      existing.comment = dto.comment?.trim() || null;
      return this.reviewsRepo.save(existing);
    }

    const review = this.reviewsRepo.create({
      orderId: dto.orderId,
      productId: dto.productId,
      userId,
      rating: dto.rating,
      comment: dto.comment?.trim() || null,
    });
    return this.reviewsRepo.save(review);
  }

  findForOrder(orderId: string, userId: string) {
    return this.reviewsRepo.find({
      where: { orderId, userId },
      order: { createdAt: 'DESC' },
    });
  }

  async averagesForProducts(productIds: string[]) {
    if (!productIds.length) return {} as Record<string, { avg: number; count: number }>;
    const rows = await this.reviewsRepo
      .createQueryBuilder('r')
      .select('r.productId', 'productId')
      .addSelect('AVG(r.rating)', 'avg')
      .addSelect('COUNT(*)', 'count')
      .where('r.productId IN (:...ids)', { ids: productIds })
      .groupBy('r.productId')
      .getRawMany<{ productId: string; avg: string; count: string }>();

    const map: Record<string, { avg: number; count: number }> = {};
    for (const row of rows) {
      map[row.productId] = {
        avg: Math.round(Number(row.avg) * 10) / 10,
        count: Number(row.count),
      };
    }
    return map;
  }
}
