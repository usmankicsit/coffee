import { Module } from '@nestjs/common';
import { BlogsModule } from '../blogs/blogs.module';
import { CategoriesModule } from '../categories/categories.module';
import { ProductsModule } from '../products/products.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { ShopModule } from '../shop/shop.module';
import { TeamModule } from '../team/team.module';
import { PublicController } from './public.controller';

@Module({
  imports: [
    ProductsModule,
    CategoriesModule,
    ShopModule,
    ReviewsModule,
    BlogsModule,
    TeamModule,
  ],
  controllers: [PublicController],
})
export class PublicModule {}
