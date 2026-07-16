import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { BlogPost } from './blogs/blog-post.entity';
import { BlogsModule } from './blogs/blogs.module';
import { CategoriesModule } from './categories/categories.module';
import { Category } from './categories/category.entity';
import { Inventory } from './inventory/inventory.entity';
import { InventoryModule } from './inventory/inventory.module';
import { OrderItem } from './orders/order-item.entity';
import { Order } from './orders/order.entity';
import { OrdersModule } from './orders/orders.module';
import { Product } from './products/product.entity';
import { ProductsModule } from './products/products.module';
import { ReportsModule } from './reports/reports.module';
import { SeedModule } from './seed/seed.module';
import { ShopSettings } from './shop/shop-settings.entity';
import { ShopModule } from './shop/shop.module';
import { PublicModule } from './public/public.module';
import { ReviewsModule } from './reviews/reviews.module';
import { ClaimsModule } from './claims/claims.module';
import { ProductReview } from './reviews/product-review.entity';
import { OrderClaim } from './claims/order-claim.entity';
import { TeamMember } from './team/team-member.entity';
import { TeamModule } from './team/team.module';
import { User } from './users/user.entity';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DATABASE_HOST', 'localhost'),
        port: Number(config.get('DATABASE_PORT', 5432)),
        username: config.get('DATABASE_USER', 'coffee'),
        password: config.get('DATABASE_PASSWORD', 'coffee'),
        database: config.get('DATABASE_NAME', 'coffee_pos'),
        ssl:
          config.get('DATABASE_SSL') === 'true'
            ? { rejectUnauthorized: false }
            : false,
        entities: [
          User,
          Category,
          Product,
          Inventory,
          Order,
          OrderItem,
          ShopSettings,
          ProductReview,
          OrderClaim,
          BlogPost,
          TeamMember,
        ],
        synchronize: true,
      }),
    }),
    AuthModule,
    UsersModule,
    CategoriesModule,
    ProductsModule,
    InventoryModule,
    OrdersModule,
    ReportsModule,
    ShopModule,
    PublicModule,
    ReviewsModule,
    ClaimsModule,
    BlogsModule,
    TeamModule,
    SeedModule,
  ],
})
export class AppModule {}
