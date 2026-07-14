import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '../common/enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateClaimDto, UpdateClaimDto } from './dto/claim.dto';
import { ClaimsService } from './claims.service';

@Controller('claims')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClaimsController {
  constructor(private readonly claimsService: ClaimsService) {}

  @Post()
  @Roles(UserRole.CUSTOMER)
  create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateClaimDto,
  ) {
    return this.claimsService.create(user.id, dto);
  }

  @Get('mine')
  @Roles(UserRole.CUSTOMER)
  mine(@CurrentUser() user: { id: string }) {
    return this.claimsService.findMine(user.id);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.CASHIER)
  findAll() {
    return this.claimsService.findAll();
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CASHIER)
  update(@Param('id') id: string, @Body() dto: UpdateClaimDto) {
    return this.claimsService.update(id, dto);
  }
}
