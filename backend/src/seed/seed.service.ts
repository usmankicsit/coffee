import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { BlogPost } from '../blogs/blog-post.entity';
import { UserRole } from '../common/enums';
import { Category } from '../categories/category.entity';
import { Inventory } from '../inventory/inventory.entity';
import { Product } from '../products/product.entity';
import { ShopSettings } from '../shop/shop-settings.entity';
import { TeamMember } from '../team/team-member.entity';
import { User } from '../users/user.entity';

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
          phone: '+92 300 1112233',
          address: 'House 14, Street 7, Gulberg III',
          city: 'Islamabad',
          isActive: true,
        }),
      ]);
      this.logger.log('Seeded admin, cashier, and customer users');
    } else {
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
            phone: '+92 300 1112233',
            address: 'House 14, Street 7, Gulberg III',
            city: 'Islamabad',
            isActive: true,
          }),
        );
        this.logger.log('Seeded demo customer user');
      } else if (!existingCustomer.phone) {
        existingCustomer.phone = '+92 300 1112233';
        existingCustomer.address = 'House 14, Street 7, Gulberg III';
        existingCustomer.city = 'Islamabad';
        await this.usersRepo.save(existingCustomer);
      }
    }

    if ((await this.shopRepo.count()) === 0) {
      await this.shopRepo.save(
        this.shopRepo.create({
          name: 'Brew & Bean',
          taxPercent: 8.5,
          currency: 'PKR',
          phone: '+92 300 1234567',
          whatsapp: '+923001234567',
          address: '12 MM Alam Road, Gulberg III, Lahore',
          logoUrl: null,
          aboutText:
            'Brew & Bean is a neighborhood coffee shop serving carefully roasted beans, handcrafted drinks, and fresh pastries in the heart of Lahore.',
        }),
      );
      this.logger.log('Seeded shop settings');
    }

    if ((await this.categoriesRepo.count()) === 0) {
      const espresso = await this.categoriesRepo.save(
        this.categoriesRepo.create({
          name: 'Espresso',
          sortOrder: 1,
          isActive: true,
        }),
      );
      const brew = await this.categoriesRepo.save(
        this.categoriesRepo.create({
          name: 'Brewed',
          sortOrder: 2,
          isActive: true,
        }),
      );
      const pastry = await this.categoriesRepo.save(
        this.categoriesRepo.create({
          name: 'Pastries',
          sortOrder: 3,
          isActive: true,
        }),
      );

      const menu: Array<{
        name: string;
        price: number;
        categoryId: string;
        stock: number;
        imageUrl: string;
        description: string;
      }> = [
        {
          name: 'Espresso',
          price: 250,
          categoryId: espresso.id,
          stock: 200,
          imageUrl:
            'https://images.unsplash.com/photo-1510590337019-5ef8d3d32116?auto=format&fit=crop&w=600&q=80',
          description: 'A rich, concentrated shot of pure coffee intensity.',
        },
        {
          name: 'Americano',
          price: 300,
          categoryId: espresso.id,
          stock: 200,
          imageUrl:
            'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
          description: 'Espresso stretched with hot water for a smooth cup.',
        },
        {
          name: 'Latte',
          price: 450,
          categoryId: espresso.id,
          stock: 150,
          imageUrl:
            'https://images.unsplash.com/photo-1561882468-9110e03e0f78?auto=format&fit=crop&w=600&q=80',
          description: 'Silky steamed milk over espresso with a light foam.',
        },
        {
          name: 'Cappuccino',
          price: 425,
          categoryId: espresso.id,
          stock: 150,
          imageUrl:
            'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=600&q=80',
          description: 'Equal parts espresso, steamed milk, and airy foam.',
        },
        {
          name: 'Flat White',
          price: 475,
          categoryId: espresso.id,
          stock: 120,
          imageUrl:
            'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80',
          description: 'Velvety microfoam poured over a double ristretto.',
        },
        {
          name: 'Drip Coffee',
          price: 275,
          categoryId: brew.id,
          stock: 200,
          imageUrl:
            'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80',
          description: 'Classic filter brew, clean and aromatic.',
        },
        {
          name: 'Cold Brew',
          price: 400,
          categoryId: brew.id,
          stock: 100,
          imageUrl:
            'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80',
          description: 'Slow-steeped overnight for a smooth, low-acid chill.',
        },
        {
          name: 'Croissant',
          price: 350,
          categoryId: pastry.id,
          stock: 40,
          imageUrl:
            'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80',
          description: 'Buttery, flaky layers baked fresh each morning.',
        },
        {
          name: 'Blueberry Muffin',
          price: 325,
          categoryId: pastry.id,
          stock: 35,
          imageUrl:
            'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?auto=format&fit=crop&w=600&q=80',
          description: 'Soft muffin studded with juicy blueberries.',
        },
        {
          name: 'Chocolate Cookie',
          price: 250,
          categoryId: pastry.id,
          stock: 50,
          imageUrl:
            'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=600&q=80',
          description: 'Chewy cookie packed with dark chocolate chunks.',
        },
      ];

      for (const item of menu) {
        const product = await this.productsRepo.save(
          this.productsRepo.create({
            name: item.name,
            price: item.price,
            categoryId: item.categoryId,
            imageUrl: item.imageUrl,
            description: item.description,
            isAvailable: true,
          }),
        );
        await this.inventoryRepo.save(
          this.inventoryRepo.create({
            productId: product.id,
            quantity: item.stock,
            lowStockThreshold: 10,
          }),
        );
      }
      this.logger.log('Seeded demo menu and inventory');
    } else {
      const defaults: Record<string, string> = {
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
      const descriptions: Record<string, string> = {
        Espresso: 'A rich, concentrated shot of pure coffee intensity.',
        Americano: 'Espresso stretched with hot water for a smooth cup.',
        Latte: 'Silky steamed milk over espresso with a light foam.',
        Cappuccino: 'Equal parts espresso, steamed milk, and airy foam.',
        'Flat White': 'Velvety microfoam poured over a double ristretto.',
        'Drip Coffee': 'Classic filter brew, clean and aromatic.',
        'Cold Brew': 'Slow-steeped overnight for a smooth, low-acid chill.',
        Croissant: 'Buttery, flaky layers baked fresh each morning.',
        'Blueberry Muffin': 'Soft muffin studded with juicy blueberries.',
        'Chocolate Cookie': 'Chewy cookie packed with dark chocolate chunks.',
      };
      const fallback =
        'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80';
      const missing = await this.productsRepo.find();
      let filled = 0;
      let descFilled = 0;
      for (const product of missing) {
        let changed = false;
        if (!product.imageUrl) {
          product.imageUrl = defaults[product.name] || fallback;
          filled += 1;
          changed = true;
        }
        if (!product.description && descriptions[product.name]) {
          product.description = descriptions[product.name];
          descFilled += 1;
          changed = true;
        }
        if (changed) {
          await this.productsRepo.save(product);
        }
      }
      if (filled) {
        this.logger.log(`Backfilled ${filled} product images`);
      }
      if (descFilled) {
        this.logger.log(`Backfilled ${descFilled} product descriptions`);
      }
    }

    if ((await this.blogsRepo.count()) === 0) {
      await this.blogsRepo.save([
        this.blogsRepo.create({
          title: 'How We Source Our Beans',
          slug: 'how-we-source-our-beans',
          excerpt:
            'From farm partnerships to our Lahore roastery — the journey behind every cup.',
          content:
            'At Brew & Bean we work directly with smallholder farms across Ethiopia, Colombia, and local Pakistani growers. Each lot is cupped, roasted in small batches, and served within weeks of roast so you taste the origin, not the shelf life.\n\nOur buyers visit farms seasonally, focusing on fair pricing and regenerative practices. The result is a rotating menu of single origins and house blends that stay true to the bean.',
          coverImageUrl:
            'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=1200&q=80',
          isPublished: true,
        }),
        this.blogsRepo.create({
          title: 'Latte Art 101',
          slug: 'latte-art-101',
          excerpt:
            'A quick guide to pouring hearts, tulips, and rosettas at home.',
          content:
            'Great latte art starts with textured milk — glossy microfoam, not big bubbles. Steam until the pitcher is warm to the touch, then swirl to integrate.\n\nBegin with a high pour to sink the milk, then drop close to the surface and wiggle for a tulip or hold steady for a heart. Practice with water and dish soap if you want to save milk while learning.',
          coverImageUrl:
            'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80',
          isPublished: true,
        }),
        this.blogsRepo.create({
          title: 'Weekend Brunch at Brew & Bean',
          slug: 'weekend-brunch-at-brew-and-bean',
          excerpt:
            'Pastries, pour-overs, and a slower pace every Saturday and Sunday.',
          content:
            'Weekends at our Gulberg shop mean fresh croissants, blueberry muffins, and a longer pour-over menu. Grab a seat by the window, order a flat white, and settle in — we keep the playlist soft and the Wi‑Fi steady.\n\nBrunch hours run 9am–2pm. Reservations are not required; walk-ins welcome.',
          coverImageUrl:
            'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80',
          isPublished: true,
        }),
      ]);
      this.logger.log('Seeded blog posts');
    }

    if ((await this.teamRepo.count()) === 0) {
      await this.teamRepo.save([
        this.teamRepo.create({
          name: 'Ayesha Khan',
          roleTitle: 'Head Barista',
          bio: 'Competition barista and latte-art coach with a soft spot for Ethiopian naturals.',
          photoUrl:
            'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80',
          sortOrder: 1,
          isActive: true,
        }),
        this.teamRepo.create({
          name: 'Hassan Ali',
          roleTitle: 'Roaster',
          bio: 'Profiles every batch for sweetness and clarity. Former pastry chef turned coffee nerd.',
          photoUrl:
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
          sortOrder: 2,
          isActive: true,
        }),
        this.teamRepo.create({
          name: 'Sara Malik',
          roleTitle: 'Pastry Lead',
          bio: 'Bakes the croissants and cookies you see in the case every morning.',
          photoUrl:
            'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=600&q=80',
          sortOrder: 3,
          isActive: true,
        }),
        this.teamRepo.create({
          name: 'Omar Raza',
          roleTitle: 'Shop Manager',
          bio: 'Keeps service humming from open to close and knows every regular by name.',
          photoUrl:
            'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=600&q=80',
          sortOrder: 4,
          isActive: true,
        }),
      ]);
      this.logger.log('Seeded team members');
    }
  }
}
