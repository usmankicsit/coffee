import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlogPost } from './blog-post.entity';
import { CreateBlogDto, UpdateBlogDto } from './dto/blog.dto';

@Injectable()
export class BlogsService {
  constructor(
    @InjectRepository(BlogPost)
    private readonly blogsRepo: Repository<BlogPost>,
  ) {}

  findAll() {
    return this.blogsRepo.find({ order: { createdAt: 'DESC' } });
  }

  findPublished() {
    return this.blogsRepo.find({
      where: { isPublished: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findBySlug(slug: string) {
    const post = await this.blogsRepo.findOne({
      where: { slug, isPublished: true },
    });
    if (!post) throw new NotFoundException('Blog post not found');
    return post;
  }

  async findOne(id: string) {
    const post = await this.blogsRepo.findOne({ where: { id } });
    if (!post) throw new NotFoundException('Blog post not found');
    return post;
  }

  async create(dto: CreateBlogDto) {
    const existing = await this.blogsRepo.findOne({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException('A post with this slug already exists');
    }
    const post = this.blogsRepo.create({
      title: dto.title,
      slug: dto.slug,
      excerpt: dto.excerpt,
      content: dto.content,
      coverImageUrl: dto.coverImageUrl ?? null,
      isPublished: dto.isPublished ?? true,
    });
    return this.blogsRepo.save(post);
  }

  async update(id: string, dto: UpdateBlogDto) {
    const post = await this.findOne(id);
    if (dto.slug !== undefined && dto.slug !== post.slug) {
      const existing = await this.blogsRepo.findOne({
        where: { slug: dto.slug },
      });
      if (existing) {
        throw new ConflictException('A post with this slug already exists');
      }
    }
    Object.assign(post, dto);
    return this.blogsRepo.save(post);
  }

  async remove(id: string) {
    const post = await this.findOne(id);
    await this.blogsRepo.remove(post);
    return { ok: true };
  }
}
