import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WorkshopsService } from './workshops.service';
import { CreateWorkshopDto, UpdateWorkshopDto } from './dto/workshop.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Workshops')
@Controller('workshops')
export class WorkshopsController {
  constructor(private readonly workshopsService: WorkshopsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SALES_MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new workshop' })
  @ApiResponse({ status: 201, description: 'Workshop created successfully' })
  async create(@Body() createWorkshopDto: CreateWorkshopDto) {
    return this.workshopsService.create(createWorkshopDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all workshops' })
  @ApiResponse({ status: 200, description: 'Workshops retrieved successfully' })
  async findAll() {
    return this.workshopsService.findAll();
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active workshops' })
  @ApiResponse({ status: 200, description: 'Active workshops retrieved successfully' })
  async findActive() {
    return this.workshopsService.findActive();
  }

  @Get('my-workshops')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user enrolled workshops' })
  @ApiResponse({ status: 200, description: 'User workshops retrieved successfully' })
  async getMyWorkshops(@Request() req) {
    return this.workshopsService.getUserWorkshops(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workshop by ID' })
  @ApiResponse({ status: 200, description: 'Workshop retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Workshop not found' })
  async findOne(@Param('id') id: string) {
    return this.workshopsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SALES_MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update workshop' })
  @ApiResponse({ status: 200, description: 'Workshop updated successfully' })
  async update(@Param('id') id: string, @Body() updateWorkshopDto: UpdateWorkshopDto) {
    return this.workshopsService.update(id, updateWorkshopDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SALES_MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete workshop' })
  @ApiResponse({ status: 200, description: 'Workshop deleted successfully' })
  async remove(@Param('id') id: string) {
    return this.workshopsService.remove(id);
  }

  @Get(':id/participants')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SALES_MANAGER', 'SALES_PERSON')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get workshop participants' })
  @ApiResponse({ status: 200, description: 'Participants retrieved successfully' })
  async getParticipants(@Param('id') id: string) {
    return this.workshopsService.getParticipants(id);
  }

  @Post(':id/participants')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SALES_MANAGER', 'SALES_PERSON')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add participant to workshop' })
  @ApiResponse({ status: 201, description: 'Participant added successfully' })
  async addParticipant(@Param('id') id: string, @Body() participantData: any) {
    return this.workshopsService.addParticipant(id, participantData);
  }

  @Patch(':id/participants/:participantId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SALES_MANAGER', 'SALES_PERSON')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update workshop participant' })
  @ApiResponse({ status: 200, description: 'Participant updated successfully' })
  async updateParticipant(
    @Param('id') id: string,
    @Param('participantId') participantId: string,
    @Body() participantData: any
  ) {
    return this.workshopsService.updateParticipant(id, participantId, participantData);
  }

  @Delete(':id/participants/:participantId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SALES_MANAGER', 'SALES_PERSON')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove participant from workshop' })
  @ApiResponse({ status: 200, description: 'Participant removed successfully' })
  async deleteParticipant(
    @Param('id') id: string,
    @Param('participantId') participantId: string
  ) {
    return this.workshopsService.deleteParticipant(id, participantId);
  }

  @Get('sales-manager/my-workshops')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SALES_MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get sales manager workshops' })
  @ApiResponse({ status: 200, description: 'Sales manager workshops retrieved successfully' })
  async getSalesManagerWorkshops(@Request() req: any) {
    return this.workshopsService.getSalesManagerWorkshops(req.user.id);
  }

  @Get('sales-person/accessible')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SALES_PERSON')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get accessible workshops for sales person' })
  @ApiResponse({ status: 200, description: 'Accessible workshops retrieved successfully' })
  async getSalesPersonAccessibleWorkshops(@Request() req: any) {
    return this.workshopsService.getSalesPersonAccessibleWorkshops(req.user.id);
  }

  @Get(':id/sales-person-access')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SALES_MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get workshop sales person access list' })
  @ApiResponse({ status: 200, description: 'Sales person access list retrieved successfully' })
  async getWorkshopSalesPersonAccess(@Param('id') id: string) {
    return this.workshopsService.getWorkshopSalesPersonAccess(id);
  }

  @Post(':id/sales-person-access')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SALES_MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Grant sales person access to workshop' })
  @ApiResponse({ status: 201, description: 'Sales person access granted successfully' })
  async grantSalesPersonAccess(
    @Param('id') id: string,
    @Body() body: { salesPersonId: string },
    @Request() req: any
  ) {
    return this.workshopsService.grantSalesPersonAccess(id, body.salesPersonId, req.user.id);
  }

  @Delete(':id/sales-person-access/:salesPersonId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SALES_MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke sales person access from workshop' })
  @ApiResponse({ status: 200, description: 'Sales person access revoked successfully' })
  async revokeSalesPersonAccess(
    @Param('id') id: string,
    @Param('salesPersonId') salesPersonId: string
  ) {
    return this.workshopsService.revokeSalesPersonAccess(id, salesPersonId);
  }
}
