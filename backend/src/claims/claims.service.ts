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
import { CreateClaimDto, UpdateClaimDto } from './dto/claim.dto';
import { ClaimStatus, OrderClaim } from './order-claim.entity';

@Injectable()
export class ClaimsService {
  constructor(
    @InjectRepository(OrderClaim)
    private readonly claimsRepo: Repository<OrderClaim>,
    @InjectRepository(Order)
    private readonly ordersRepo: Repository<Order>,
  ) {}

  async create(userId: string, dto: CreateClaimDto) {
    const order = await this.ordersRepo.findOne({ where: { id: dto.orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.createdById !== userId) {
      throw new ForbiddenException('Not your order');
    }
    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot claim a cancelled order');
    }

    const openExisting = await this.claimsRepo.findOne({
      where: [
        { orderId: dto.orderId, userId, status: ClaimStatus.OPEN },
        { orderId: dto.orderId, userId, status: ClaimStatus.IN_REVIEW },
      ],
    });
    if (openExisting) {
      throw new BadRequestException('You already have an open claim for this order');
    }

    const claim = this.claimsRepo.create({
      orderId: dto.orderId,
      userId,
      reason: dto.reason.trim(),
      details: dto.details.trim(),
      status: ClaimStatus.OPEN,
      staffNote: null,
    });
    return this.claimsRepo.save(claim);
  }

  findMine(userId: string) {
    return this.claimsRepo.find({
      where: { userId },
      relations: { order: true },
      order: { createdAt: 'DESC' },
    });
  }

  findAll() {
    return this.claimsRepo
      .find({
        relations: { order: true, user: true },
        order: { createdAt: 'DESC' },
        take: 100,
      })
      .then((claims) =>
        claims.map((claim) => {
          if (claim.user) {
            const { passwordHash: _, ...safe } = claim.user as typeof claim.user & {
              passwordHash?: string;
            };
            claim.user = safe as typeof claim.user;
          }
          return claim;
        }),
      );
  }

  async update(id: string, dto: UpdateClaimDto) {
    const claim = await this.claimsRepo.findOne({
      where: { id },
      relations: { order: true, user: true },
    });
    if (!claim) throw new NotFoundException('Claim not found');
    claim.status = dto.status;
    if (dto.staffNote !== undefined) claim.staffNote = dto.staffNote;
    const saved = await this.claimsRepo.save(claim);
    if (saved.user) {
      const { passwordHash: _, ...safe } = saved.user as typeof saved.user & {
        passwordHash?: string;
      };
      saved.user = safe as typeof saved.user;
    }
    return saved;
  }
}
