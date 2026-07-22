import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { Repository } from 'typeorm';
import { BlogPost } from '../blogs/blog-post.entity';
import { UserRole } from '../common/enums';
import { Category } from '../categories/category.entity';
import { Inventory } from '../inventory/inventory.entity';
import { Product } from '../products/product.entity';
import { ShopSettings } from '../shop/shop-settings.entity';
import { TeamMember } from '../team/team-member.entity';
import { User } from '../users/user.entity';
import {
  MENU_CATEGORIES,
  SHOP_SEED,
  UNLIMITED_STOCK,
} from './menu-catalog';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Category)
    private readonly categoriesRepo: Repository<Category>,
    @InjectRepository(Product)
    private readonly productsRepo: Repository<Product>,
    @InjectRepository(Inventory)
    private readonly inventoryRepo: Repository<Inventory>,
    @InjectRepository(ShopSettings)
    private readonly shopRepo: Repository<ShopSettings>,
    @InjectRepository(BlogPost)
    private readonly blogsRepo: Repository<BlogPost>,
    @InjectRepository(TeamMember)
    private readonly teamRepo: Repository<TeamMember>,
  ) {}

  async onModuleInit() {
    if (this.config.get('SEED_ON_START') !== 'true') return;
    await this.seed();
  }

  async seed() {
    try {
      await this.usersRepo.query(
        `ALTER TABLE users ALTER COLUMN role TYPE varchar(32) USING role::text`,
      );
    } catch {
      /* already varchar or table missing */
    }

    await this.seedUsers();
    await this.syncShopSettings();
    await this.seedMenu();
    await this.seedBlogs();
    await this.seedTeam();
  }

  private async seedUsers() {
    const userCount = await this.usersRepo.count();
    if (userCount === 0) {
      const adminHash = await bcrypt.hash('Admin123!', 10);
      const cashierHash = await bcrypt.hash('Cashier123!', 10);
      const customerHash = await bcrypt.hash('Customer123!', 10);
      await this.usersRepo.save([
        this.usersRepo.create({
          email: 'admin@coffee.local',
          name: 'Super Admin',
          role: UserRole.SUPER_ADMIN,
          passwordHash: adminHash,
          isActive: true,
        }),
        this.usersRepo.create({
          email: 'cashier@coffee.local',
          name: 'Cashier',
          role: UserRole.CASHIER,
          passwordHash: cashierHash,
          isActive: true,
        }),
        this.usersRepo.create({
          email: 'customer@coffee.local',
          name: 'Demo Customer',
          role: UserRole.CUSTOMER,
          passwordHash: customerHash,
          phone: '+92 312 8671544',
          address: 'Shop No. 02, Sector B, Family B Park, DHA Phase 2',
          city: 'Islamabad',
          isActive: true,
        }),
      ]);
      this.logger.log('Seeded admin, cashier, and customer users');
      return;
    }

    const existingCustomer = await this.usersRepo.findOne({
      where: { email: 'customer@coffee.local' },
    });
    if (!existingCustomer) {
      const customerHash = await bcrypt.hash('Customer123!', 10);
      await this.usersRepo.save(
        this.usersRepo.create({
          email: 'customer@coffee.local',
          name: 'Demo Customer',
          role: UserRole.CUSTOMER,
          passwordHash: customerHash,
          phone: '+92 312 8671544',
          address: 'Shop No. 02, Sector B, Family B Park, DHA Phase 2',
          city: 'Islamabad',
          isActive: true,
        }),
      );
      this.logger.log('Seeded demo customer user');
    } else if (!existingCustomer.phone) {
      existingCustomer.phone = '+92 312 8671544';
      existingCustomer.address =
        'Shop No. 02, Sector B, Family B Park, DHA Phase 2';
      existingCustomer.city = 'Islamabad';
      await this.usersRepo.save(existingCustomer);
    }
  }

  private async syncShopSettings() {
    const uploadsDir = join(process.cwd(), 'uploads');
    const assetLogo = join(process.cwd(), 'assets', 'logo-brewing-cottage.png');
    const uploadLogo = join(uploadsDir, 'logo-brewing-cottage.png');
    if (existsSync(assetLogo)) {
      if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
      if (!existsSync(uploadLogo)) {
        copyFileSync(assetLogo, uploadLogo);
        this.logger.log('Installed The Brewing Cottage logo in uploads');
      }
    }

    let settings = await this.shopRepo.findOne({ where: {} });
    if (!settings) {
      settings = this.shopRepo.create({
        ...SHOP_SEED,
      });
      await this.shopRepo.save(settings);
      this.logger.log('Seeded shop settings');
      return;
    }

    settings.name = SHOP_SEED.name;
    settings.taxPercent = SHOP_SEED.taxPercent;
    settings.currency = SHOP_SEED.currency;
    settings.phone = SHOP_SEED.phone;
    settings.whatsapp = SHOP_SEED.whatsapp;
    settings.address = SHOP_SEED.address;
    settings.aboutText = SHOP_SEED.aboutText;
    if (!settings.logoUrl && existsSync(uploadLogo)) {
      settings.logoUrl = SHOP_SEED.logoUrl;
    }
    await this.shopRepo.save(settings);
    this.logger.log('Updated shop settings for The Brewing Cottage');
  }

  private async clearMenuTables() {
    await this.productsRepo.query('DELETE FROM product_reviews');
    await this.productsRepo.query('DELETE FROM order_items');
    await this.productsRepo.query('DELETE FROM order_claims');
    await this.productsRepo.query('DELETE FROM orders');
    await this.productsRepo.query('DELETE FROM inventory');
    await this.productsRepo.query('DELETE FROM products');
    await this.productsRepo.query('DELETE FROM categories');
  }

  private async seedMenu() {
    const categoryCount = await this.categoriesRepo.count();
    const legacyCategories = await this.categoriesRepo
      .createQueryBuilder('c')
      .where('c.name IN (:...names)', {
        names: ['Espresso', 'Brewed', 'Pastries'],
      })
      .getCount();
    const replace =
      this.config.get('REPLACE_MENU_ON_START') === 'true' ||
      categoryCount === 0 ||
      legacyCategories > 0;

    if (!replace) {
      await this.backfillProductMedia();
      return;
    }

    if (categoryCount > 0) {
      await this.clearMenuTables();
      this.logger.log(
        'Cleared old categories/products for The Brewing Cottage catalog',
      );
    }

    for (const cat of MENU_CATEGORIES) {
      const category = await this.categoriesRepo.save(
        this.categoriesRepo.create({
          name: cat.name,
          sortOrder: cat.sortOrder,
          isActive: true,
        }),
      );

      for (const item of cat.items) {
        const product = await this.productsRepo.save(
          this.productsRepo.create({
            name: item.name,
            price: item.price,
            categoryId: category.id,
            imageUrl: item.imageUrl,
            description: item.description,
            isAvailable: true,
          }),
        );
        await this.inventoryRepo.save(
          this.inventoryRepo.create({
            productId: product.id,
            quantity: UNLIMITED_STOCK,
            lowStockThreshold: 0,
          }),
        );
      }
    }

    const productCount = MENU_CATEGORIES.reduce(
      (n, c) => n + c.items.length,
      0,
    );
    this.logger.log(
      `Seeded The Brewing Cottage menu (${MENU_CATEGORIES.length} categories, ${productCount} items, unlimited stock)`,
    );
  }

  private async backfillProductMedia() {
    const imageByName = new Map<string, string>();
    const descByName = new Map<string, string>();
    for (const cat of MENU_CATEGORIES) {
      for (const item of cat.items) {
        imageByName.set(item.name, item.imageUrl);
        descByName.set(item.name, item.description);
      }
    }
    const fallback =
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80';

    const products = await this.productsRepo.find();
    let filled = 0;
    let descFilled = 0;
    for (const product of products) {
      let changed = false;
      if (!product.imageUrl) {
        product.imageUrl = imageByName.get(product.name) || fallback;
        filled += 1;
        changed = true;
      }
      if (!product.description && descByName.has(product.name)) {
        product.description = descByName.get(product.name)!;
        descFilled += 1;
        changed = true;
      }
      if (changed) await this.productsRepo.save(product);
    }
    if (filled) this.logger.log(`Backfilled ${filled} product images`);
    if (descFilled) {
      this.logger.log(`Backfilled ${descFilled} product descriptions`);
    }
  }

  private async seedBlogs() {
    const stale = await this.blogsRepo
      .createQueryBuilder('b')
      .where('b.title ILIKE :q OR b.content ILIKE :q', { q: '%Brew & Bean%' })
      .getCount();
    if (stale > 0) {
      await this.blogsRepo.clear();
      this.logger.log('Cleared old Brew & Bean blog posts');
    }
    if ((await this.blogsRepo.count()) !== 0) return;

    await this.blogsRepo.save([
      this.blogsRepo.create({
        title: 'Welcome to The Brewing Cottage',
        slug: 'welcome-to-the-brewing-cottage',
        excerpt:
          'Coffee, comfort food, and cool drinks at Family B Park, DHA Phase 2.',
        content:
          'The Brewing Cottage brings café classics and cottage comfort to Sector B, Family B Park in DHA Phase 2, Islamabad. From loaded fries and burgers to specialty coffee and mocktails, every visit is meant to feel warm and welcoming.\n\nStop by Shop No. 02 — WhatsApp us on +92 312 8671544 for orders and updates.',
        coverImageUrl:
          'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80',
        isPublished: true,
      }),
      this.blogsRepo.create({
        title: 'Our Café Menu Favorites',
        slug: 'cafe-menu-favorites',
        excerpt: 'Burgers, pasta, paninis, and cold coffees guests love most.',
        content:
          'Guests keep coming back for Cowboy and Bad Boy burgers, crispy wings, and our cold coffee lineup — Vanilla, Caramel, Hazelnut, Spanish, and Irish lattes.\n\nPair a meal with a raspberry mojito or pistachio shake for the full Brewing Cottage experience.',
        coverImageUrl:
          'https://images.unsplash.com/photo-1553979459-d2229ba7433b?auto=format&fit=crop&w=1200&q=80',
        isPublished: true,
      }),
      this.blogsRepo.create({
        title: 'Find Us in DHA Phase 2',
        slug: 'find-us-dha-phase-2',
        excerpt: 'Shop No. 02, Sector B, Family B Park — easy to reach.',
        content:
          'We are located at Shop No. 02, Sector B, Family B Park, DHA Phase 2, Islamabad. Message us on WhatsApp at +92 312 8671544 for directions, takeaway, or table questions.\n\nWe look forward to brewing something great for you.',
        coverImageUrl:
          'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80',
        isPublished: true,
      }),
    ]);
    this.logger.log('Seeded blog posts');
  }

  private async seedTeam() {
    if ((await this.teamRepo.count()) !== 0) return;

    await this.teamRepo.save([
      this.teamRepo.create({
        name: 'Ayesha Khan',
        roleTitle: 'Head Barista',
        bio: 'Crafts our hot and cold coffee menu with care every day.',
        photoUrl:
          'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80',
        sortOrder: 1,
        isActive: true,
      }),
      this.teamRepo.create({
        name: 'Hassan Ali',
        roleTitle: 'Kitchen Lead',
        bio: 'Owns burgers, fries, paninis, and pasta from the pass.',
        photoUrl:
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
        sortOrder: 2,
        isActive: true,
      }),
      this.teamRepo.create({
        name: 'Sara Malik',
        roleTitle: 'Drinks Specialist',
        bio: 'Mocktails, mojitos, shakes, and slush — always ice-cold.',
        photoUrl:
          'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=600&q=80',
        sortOrder: 3,
        isActive: true,
      }),
      this.teamRepo.create({
        name: 'Omar Raza',
        roleTitle: 'Shop Manager',
        bio: 'Keeps The Brewing Cottage running smoothly for every guest.',
        photoUrl:
          'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=600&q=80',
        sortOrder: 4,
        isActive: true,
      }),
    ]);
    this.logger.log('Seeded team members');
  }
}
