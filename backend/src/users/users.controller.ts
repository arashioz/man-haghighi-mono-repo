import { Controller, Get, Patch, Param, Body, Delete, UseGuards, Post, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, AssignSalesPersonDto } from './dto/user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async findAll() {
    return this.usersService.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new user (Admin only)' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get('sales-persons')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SALES_MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get sales persons' })
  @ApiResponse({ status: 200, description: 'Sales persons retrieved successfully' })
  async getSalesPersons(@Req() req: any) {
    const userRole = req.user.role;
    const userId = req.user.id;
    
    if (userRole === 'ADMIN') {
      return this.usersService.getSalesPersons();
    } else if (userRole === 'SALES_MANAGER') {
      return this.usersService.getSalesPersonsByManager(userId);
    }
    
    return [];
  }

  @Get('sales-managers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get sales managers (Admin only)' })
  @ApiResponse({ status: 200, description: 'Sales managers retrieved successfully' })
  async getSalesManagers() {
    return this.usersService.getSalesManagers();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user (Admin only)' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete user (Admin only)' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Get(':id/courses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user courses (Admin only)' })
  @ApiResponse({ status: 200, description: 'User courses retrieved successfully' })
  async getUserCourses(@Param('id') id: string) {
    return this.usersService.getUserCourses(id);
  }

  @Post(':id/courses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign courses to user (Admin only)' })
  @ApiResponse({ status: 201, description: 'Courses assigned successfully' })
  async assignCourses(@Param('id') userId: string, @Body() body: { courseIds: string[] }) {
    return this.usersService.assignCourses(userId, body.courseIds);
  }

  @Post(':id/video-access/:videoId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Grant video access to user (Admin only)' })
  @ApiResponse({ status: 201, description: 'Video access granted successfully' })
  async grantVideoAccess(@Param('id') userId: string, @Param('videoId') videoId: string) {
    return this.usersService.grantVideoAccess(userId, videoId);
  }

  @Delete(':id/video-access/:videoId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke video access from user (Admin only)' })
  @ApiResponse({ status: 200, description: 'Video access revoked successfully' })
  async revokeVideoAccess(@Param('id') userId: string, @Param('videoId') videoId: string) {
    return this.usersService.revokeVideoAccess(userId, videoId);
  }

  @Post('assign-sales-person')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign sales person to sales manager (Admin only)' })
  @ApiResponse({ status: 201, description: 'Sales person assigned successfully' })
  async assignSalesPersonToManager(@Body() assignDto: AssignSalesPersonDto) {
    return this.usersService.assignSalesPersonToManager(assignDto.salesPersonId, assignDto.salesManagerId);
  }

  @Delete('unassign-sales-person/:salesPersonId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unassign sales person from manager (Admin only)' })
  @ApiResponse({ status: 200, description: 'Sales person unassigned successfully' })
  async unassignSalesPersonFromManager(@Param('salesPersonId') salesPersonId: string) {
    return this.usersService.unassignSalesPersonFromManager(salesPersonId);
  }

}
