import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlogPost } from '../blogs/blog-post.entity';
import { Category } from '../categories/category.entity';
import { Inventory } from '../inventory/inventory.entity';
import { Product } from '../products/product.entity';
import { ShopSettings } from '../shop/shop-settings.entity';
import { TeamMember } from '../team/team-member.entity';
import { User } from '../users/user.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Category,
      Product,
      Inventory,
      ShopSettings,
      BlogPost,
      TeamMember,
    ]),
  ],
  providers: [SeedService],
})
export class SeedModule {}
