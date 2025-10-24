import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Sales')
@Controller('sales')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get('report')
  @Roles('ADMIN', 'SALES_MANAGER')
  @ApiOperation({ summary: 'Get sales report' })
  @ApiResponse({ status: 200, description: 'Sales report retrieved successfully' })
  async getSalesReport(@Request() req, @Query('period') period?: string) {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    return this.salesService.getSalesReport(userId, userRole, period);
  }

  @Get('team')
  @Roles('SALES_MANAGER')
  @ApiOperation({ summary: 'Get sales team for manager' })
  @ApiResponse({ status: 200, description: 'Sales team retrieved successfully' })
  async getSalesTeam(@Request() req) {
    const managerId = req.user.id;
    return this.salesService.getSalesTeam(managerId);
  }

  @Get('my-report')
  @Roles('SALES_PERSON')
  @ApiOperation({ summary: 'Get personal sales report' })
  @ApiResponse({ status: 200, description: 'Personal sales report retrieved successfully' })
  async getMySalesReport(@Request() req, @Query('period') period?: string) {
    const userId = req.user.id;
    return this.salesService.getPersonalSalesReport(userId, period);
  }
}
