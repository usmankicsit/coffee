import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { DataSource, IsNull, Repository } from 'typeorm';
import { Inventory } from '../inventory/inventory.entity';
import { OrderItem } from '../orders/order-item.entity';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { Product } from './product.entity';

export const DEFAULT_PRODUCT_IMAGES: Record<string, string> = {
  Espresso:
    'https://images.unsplash.com/photo-1510590337019-5ef8d3d32116?auto=format&fit=crop&w=600&q=80',
  Americano:
    'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
  Latte:
    'https://images.unsplash.com/photo-1561882468-9110e03e0f78?auto=format&fit=crop&w=600&q=80',
  Cappuccino:
    'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=600&q=80',
  'Flat White':
    'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80',
  'Drip Coffee':
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80',
  'Cold Brew':
    'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80',
  Croissant:
    'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80',
  'Blueberry Muffin':
    'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?auto=format&fit=crop&w=600&q=80',
  'Chocolate Cookie':
    'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=600&q=80',
};

export const FALLBACK_PRODUCT_IMAGE =
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepo: Repository<Product>,
    private readonly dataSource: DataSource,
  ) {}

  findAll(availableOnly = false) {
    return this.productsRepo.find({
      where: availableOnly ? { isAvailable: true } : undefined,
      relations: { category: true, inventory: true },
      order: { name: 'ASC' },
    });
  }

  async findMenu() {
    const products = await this.productsRepo.find({
      where: { isAvailable: true },
      relations: { category: true, inventory: true },
      order: { name: 'ASC' },
    });
    return products.filter((p) => p.category?.isActive);
  }

  async getTopSelling(limit = 3) {
    const rows: Array<{ productId: string; qty: string }> =
      await this.dataSource.query(
        `
        SELECT oi."productId" as "productId", SUM(oi.quantity)::int as qty
        FROM order_items oi
        INNER JOIN orders o ON o.id = oi."orderId"
        WHERE o.status != 'CANCELLED'
        GROUP BY oi."productId"
        ORDER BY qty DESC
        LIMIT $1
        `,
        [limit],
      );

    const tags = ['MOST_SELLING', 'TOP_LISTED', 'POPULAR'] as const;
    return rows.map((row, index) => ({
      productId: row.productId,
      quantitySold: Number(row.qty),
      tag: tags[index] || 'POPULAR',
      label:
        index === 0
          ? 'Most Selling'
          : index === 1
            ? 'Top Listed'
            : 'Popular',
    }));
  }

  async findMenuWithTags() {
    const [products, top] = await Promise.all([
      this.findMenu(),
      this.getTopSelling(3),
    ]);
    const tagById = new Map(top.map((t) => [t.productId, t]));
    return products.map((product) => {
      const hit = tagById.get(product.id);
      return {
        ...product,
        sellingTag: hit?.tag || null,
        sellingLabel: hit?.label || null,
        quantitySold: hit?.quantitySold || 0,
      };
    });
  }

  async findOne(id: string) {
    const product = await this.productsRepo.findOne({
      where: { id },
      relations: { category: true, inventory: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(dto: CreateProductDto) {
    return this.dataSource.transaction(async (manager) => {
      const product = manager.create(Product, {
        name: dto.name,
        price: dto.price,
        categoryId: dto.categoryId,
        imageUrl: dto.imageUrl || DEFAULT_PRODUCT_IMAGES[dto.name] || FALLBACK_PRODUCT_IMAGE,
        description: dto.description ?? null,
        isAvailable: true,
      });
      const saved = await manager.save(product);
      const inventory = manager.create(Inventory, {
        productId: saved.id,
        quantity: dto.initialStock ?? 100,
        lowStockThreshold: 10,
      });
      await manager.save(inventory);
      return manager.findOne(Product, {
        where: { id: saved.id },
        relations: { category: true, inventory: true },
      });
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    const product = await this.findOne(id);
    if (dto.name !== undefined) product.name = dto.name;
    if (dto.price !== undefined) product.price = dto.price;
    if (dto.categoryId !== undefined) product.categoryId = dto.categoryId;
    if (dto.isAvailable !== undefined) product.isAvailable = dto.isAvailable;
    if (dto.imageUrl !== undefined) product.imageUrl = dto.imageUrl;
    if (dto.description !== undefined) product.description = dto.description;
    await this.productsRepo.save(product);
    return this.findOne(id);
  }

  async setImage(id: string, imageUrl: string) {
    const product = await this.findOne(id);
    this.deleteLocalUpload(product.imageUrl);
    product.imageUrl = imageUrl;
    await this.productsRepo.save(product);
    return this.findOne(id);
  }

  async removeImage(id: string) {
    const product = await this.findOne(id);
    this.deleteLocalUpload(product.imageUrl);
    product.imageUrl = null;
    await this.productsRepo.save(product);
    return this.findOne(id);
  }

  async remove(id: string) {
    const product = await this.findOne(id);
    const usedCount = await this.dataSource.getRepository(OrderItem).count({
      where: { productId: id },
    });
    if (usedCount > 0) {
      throw new BadRequestException(
        'Cannot delete this product because it appears in past orders. Disable it instead.',
      );
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(Inventory, { productId: id });
      this.deleteLocalUpload(product.imageUrl);
      await manager.delete(Product, { id });
    });

    return { ok: true };
  }

  async ensureDefaultImages() {
    const products = await this.productsRepo.find({
      where: { imageUrl: IsNull() },
    });
    for (const product of products) {
      product.imageUrl =
        DEFAULT_PRODUCT_IMAGES[product.name] || FALLBACK_PRODUCT_IMAGE;
      await this.productsRepo.save(product);
    }
    return products.length;
  }

  private deleteLocalUpload(imageUrl: string | null | undefined) {
    if (!imageUrl || !imageUrl.startsWith('/uploads/')) return;
    const filename = imageUrl.replace('/uploads/', '');
    const fullPath = join(process.cwd(), 'uploads', filename);
    if (existsSync(fullPath)) {
      try {
        unlinkSync(fullPath);
      } catch {
        /* ignore */
      }
    }
  }
}
