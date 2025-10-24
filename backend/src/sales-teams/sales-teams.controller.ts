import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { SalesTeamsService } from './sales-teams.service';
import { CreateSalesTeamDto, UpdateSalesTeamDto, AddTeamMemberDto, RemoveTeamMemberDto } from './dto/sales-team.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('sales-teams')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SALES_MANAGER)
export class SalesTeamsController {
  constructor(private readonly salesTeamsService: SalesTeamsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() createSalesTeamDto: CreateSalesTeamDto) {
    return this.salesTeamsService.create(createSalesTeamDto);
  }

  @Get()
  findAll() {
    return this.salesTeamsService.findAll();
  }

  @Get('available-sales-persons')
  getAvailableSalesPersons() {
    return this.salesTeamsService.getAvailableSalesPersons();
  }

  @Get('sales-managers')
  getSalesManagers() {
    return this.salesTeamsService.getSalesManagers();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesTeamsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() updateSalesTeamDto: UpdateSalesTeamDto) {
    return this.salesTeamsService.update(id, updateSalesTeamDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.salesTeamsService.remove(id);
  }

  @Post(':id/members')
  @Roles(UserRole.ADMIN)
  addMember(@Param('id') id: string, @Body() addTeamMemberDto: AddTeamMemberDto) {
    return this.salesTeamsService.addMember(id, addTeamMemberDto);
  }

  @Delete(':id/members')
  @Roles(UserRole.ADMIN)
  removeMember(@Param('id') id: string, @Body() removeTeamMemberDto: RemoveTeamMemberDto) {
    return this.salesTeamsService.removeMember(id, removeTeamMemberDto);
  }
}
