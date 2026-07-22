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
          name: 'The Brewing Cottage',
          taxPercent: 5,
          currency: 'PKR',
          phone: '+92 312 8671544',
          whatsapp: '+923128671544',
          address:
            'Shop No. 02, Sector B, Family B Park, DHA Phase 2, Islamabad',
          logoUrl: null,
          aboutText:
            'The Brewing Cottage is your neighborhood café in DHA Phase 2, Islamabad — serving coffee, comfort food, burgers, pasta, and cool drinks in a warm cottage vibe.',
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
