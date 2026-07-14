import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdjustInventoryDto } from './dto/inventory.dto';
import { Inventory } from './inventory.entity';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory)
    private readonly inventoryRepo: Repository<Inventory>,
  ) {}

  findAll() {
    return this.inventoryRepo.find({
      relations: { product: { category: true } },
      order: { updatedAt: 'DESC' },
    });
  }

  async adjust(productId: string, dto: AdjustInventoryDto) {
    const item = await this.inventoryRepo.findOne({
      where: { productId },
      relations: { product: true },
    });
    if (!item) throw new NotFoundException('Inventory item not found');
    item.quantity = dto.quantity;
    if (dto.lowStockThreshold !== undefined) {
      item.lowStockThreshold = dto.lowStockThreshold;
    }
    return this.inventoryRepo.save(item);
  }
}
