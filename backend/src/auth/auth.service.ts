import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../common/enums';
import { UsersService } from '../users/users.service';
import { LoginDto, RegisterCustomerDto, UpdateProfileDto } from '../users/dto/user.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwtService.signAsync(payload);
    return {
      accessToken,
      user: this.usersService.sanitize(user),
    };
  }

  async registerCustomer(dto: RegisterCustomerDto) {
    const user = await this.usersService.create({
      email: dto.email,
      password: dto.password,
      name: dto.name,
      role: UserRole.CUSTOMER,
      phone: dto.phone,
      address: dto.address,
      city: dto.city,
    });
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = await this.jwtService.signAsync(payload);
    return { accessToken, user };
  }

  async me(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user.isActive) {
      throw new UnauthorizedException('Account disabled');
    }
    return this.usersService.sanitize(user);
  }

  updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.usersService.update(userId, dto);
  }
}
