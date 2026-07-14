import { Controller, Get, Param } from '@nestjs/common';
import { BlogsService } from '../blogs/blogs.service';
import { CategoriesService } from '../categories/categories.service';
import { ProductsService } from '../products/products.service';
import { ReviewsService } from '../reviews/reviews.service';
import { ShopService } from '../shop/shop.service';
import { TeamService } from '../team/team.service';

@Controller('public')
export class PublicController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly categoriesService: CategoriesService,
    private readonly shopService: ShopService,
    private readonly reviewsService: ReviewsService,
    private readonly blogsService: BlogsService,
    private readonly teamService: TeamService,
  ) {}

  @Get('menu')
  async menu() {
    const products = await this.productsService.findMenuWithTags();
    const averages = await this.reviewsService.averagesForProducts(
      products.map((p) => p.id),
    );
    return products.map((p) => ({
      ...p,
      ratingAvg: averages[p.id]?.avg ?? null,
      ratingCount: averages[p.id]?.count ?? 0,
    }));
  }

  @Get('top-selling')
  topSelling() {
    return this.productsService.getTopSelling(3);
  }

  @Get('categories')
  categories() {
    return this.categoriesService.findAll(true);
  }

  @Get('shop')
  shop() {
    return this.shopService.get();
  }

  @Get('blogs')
  blogs() {
    return this.blogsService.findPublished();
  }

  @Get('blogs/:slug')
  blogBySlug(@Param('slug') slug: string) {
    return this.blogsService.findBySlug(slug);
  }

  @Get('team')
  team() {
    return this.teamService.findActive();
  }
}
