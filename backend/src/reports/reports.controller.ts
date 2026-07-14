import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '../common/enums';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  sales(@Query('from') from?: string, @Query('to') to?: string) {
    return this.reportsService.salesSummary(from, to);
  }
}
