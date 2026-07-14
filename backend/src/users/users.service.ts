import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { email: email.toLowerCase() } });
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findAll(): Promise<Omit<User, 'passwordHash'>[]> {
    const users = await this.usersRepo.find({ order: { createdAt: 'DESC' } });
    return users.map(({ passwordHash: _, ...rest }) => rest);
  }

  async create(dto: CreateUserDto): Promise<Omit<User, 'passwordHash'>> {
    const existing = await this.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.usersRepo.create({
      email: dto.email.toLowerCase(),
      name: dto.name,
      role: dto.role,
      passwordHash,
      phone: dto.phone?.trim() || null,
      address: dto.address?.trim() || null,
      city: dto.city?.trim() || null,
      isActive: true,
    });
    const saved = await this.usersRepo.save(user);
    const { passwordHash: _, ...rest } = saved;
    return rest;
  }

  async update(
    id: string,
    dto: UpdateUserDto,
  ): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.findById(id);
    if (dto.name !== undefined) user.name = dto.name;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    if (dto.phone !== undefined) user.phone = dto.phone.trim();
    if (dto.address !== undefined) user.address = dto.address.trim();
    if (dto.city !== undefined) user.city = dto.city.trim();
    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, 10);
    }
    const saved = await this.usersRepo.save(user);
    const { passwordHash: _, ...rest } = saved;
    return rest;
  }

  sanitize(user: User) {
    const { passwordHash: _, ...rest } = user;
    return rest;
  }
}
