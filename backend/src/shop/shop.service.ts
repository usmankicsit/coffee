import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { Repository } from 'typeorm';
import { UpdateShopDto } from './dto/shop.dto';
import { ShopSettings } from './shop-settings.entity';

@Injectable()
export class ShopService {
  constructor(
    @InjectRepository(ShopSettings)
    private readonly shopRepo: Repository<ShopSettings>,
  ) {}

  async get() {
    let settings = await this.shopRepo.findOne({ where: {} });
    if (!settings) {
      settings = await this.shopRepo.save(
        this.shopRepo.create({
          name: 'Coffee Shop',
          taxPercent: 0,
          currency: 'PKR',
          phone: '+92 300 1234567',
          whatsapp: '+923001234567',
          address: '12 MM Alam Road, Gulberg III, Lahore',
          logoUrl: null,
          aboutText:
            'Brew & Bean is a neighborhood coffee shop serving carefully roasted beans, handcrafted drinks, and fresh pastries in the heart of Lahore.',
        }),
      );
    }
    return settings;
  }

  async update(dto: UpdateShopDto) {
    const settings = await this.get();
    Object.assign(settings, dto);
    return this.shopRepo.save(settings);
  }

  async setLogo(logoUrl: string) {
    const settings = await this.get();
    this.deleteLocalUpload(settings.logoUrl);
    settings.logoUrl = logoUrl;
    return this.shopRepo.save(settings);
  }

  async removeLogo() {
    const settings = await this.get();
    this.deleteLocalUpload(settings.logoUrl);
    settings.logoUrl = null;
    return this.shopRepo.save(settings);
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
