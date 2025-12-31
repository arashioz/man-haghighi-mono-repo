import { Controller, Get, Patch, Param, Body, Delete, UseGuards, Post, Req, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, AssignSalesPersonDto, PaginationQueryDto, ExportUsersQueryDto, PromoteUserByPhoneDto } from './dto/user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Response } from 'express';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all users with pagination (Admin only)' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async findAll(@Query() paginationQuery: PaginationQueryDto) {
    return this.usersService.findAll(paginationQuery);
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

  @Post('promote-by-phone')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Promote or create user as sales manager/person by phone (Admin only)' })
  @ApiResponse({ status: 200, description: 'User promoted successfully' })
  async promoteByPhone(@Body() body: PromoteUserByPhoneDto) {
    return this.usersService.promoteUserByPhone(
      body.phone,
      body.role,
      body.firstName,
      body.lastName,
      body.salesManagerId,
    );
  }

  @Get('sales-persons')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SALES_MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get sales persons' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean, description: 'Include inactive sales persons' })
  @ApiResponse({ status: 200, description: 'Sales persons retrieved successfully' })
  async getSalesPersons(@Req() req: any, @Query('includeInactive') includeInactive?: string) {
    const userRole = req.user.role;
    const userId = req.user.id;
    const includeInactiveBool = includeInactive === 'true';

    if (userRole === 'ADMIN') {
      return this.usersService.getSalesPersons(includeInactiveBool);
    } else if (userRole === 'SALES_MANAGER') {
      return this.usersService.getSalesPersonsByManager(userId, includeInactiveBool);
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

  @Get(':id/export/json')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export single user with full data as JSON (Admin only)' })
  @ApiResponse({ status: 200, description: 'JSON file generated successfully', content: { 'application/json': {} } })
  async exportSingleUserJson(@Param('id') id: string, @Res() res: Response) {
    const data = await this.usersService.exportSingleUserWithCourses(id);

    const filename = `user_${id}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(JSON.stringify(data, null, 2));
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

  @Get(':id/products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user with old products and purchased courses (Admin only)' })
  @ApiResponse({ status: 200, description: 'User data retrieved successfully' })
  async getUserWithProducts(@Param('id') id: string) {
    return this.usersService.getUserWithProducts(id);
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

  @Post(':id/courses/:courseId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign single course to user (Admin only)' })
  @ApiResponse({ status: 201, description: 'Course assigned successfully' })
  async assignCourse(@Param('id') userId: string, @Param('courseId') courseId: string) {
    return this.usersService.assignCourse(userId, courseId);
  }

  @Delete(':id/courses/:courseId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove course from user (Admin only)' })
  @ApiResponse({ status: 200, description: 'Course removed successfully' })
  async removeCourse(@Param('id') userId: string, @Param('courseId') courseId: string) {
    return this.usersService.removeCourse(userId, courseId);
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

  @Post(':id/block')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Block user for rate limiting violations (Admin only)' })
  @ApiResponse({ status: 200, description: 'User blocked successfully' })
  async blockUser(@Param('id') id: string) {
    return this.usersService.blockUser(id);
  }

  @Post(':id/unblock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unblock user (Admin only)' })
  @ApiResponse({ status: 200, description: 'User unblocked successfully' })
  async unblockUser(@Param('id') id: string) {
    return this.usersService.unblockUser(id);
  }

  @Get('export/excel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export users to Excel with filters (Admin only)' })
  @ApiResponse({ status: 200, description: 'Excel file generated successfully', content: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {} } })
  async exportUsers(@Query() filters: ExportUsersQueryDto, @Res() res: Response) {
    const excelBuffer = await this.usersService.exportUsers(filters);
    
    // Generate filename with filters
    const date = new Date().toISOString().split('T')[0];
    let filename = `users_export_${date}`;
    
    if (filters.userType && filters.userType !== 'all') {
      filename += `_${filters.userType}`;
    }
    if (filters.startDate || filters.endDate) {
      filename += `_${filters.startDate || 'start'}_${filters.endDate || 'end'}`;
    }
    if (filters.role) {
      filename += `_${filters.role}`;
    }
    
    filename += '.xlsx';

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(excelBuffer);
  }

  @Get('export/json')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export users with their courses and file links as JSON (Admin only)' })
  @ApiResponse({ status: 200, description: 'JSON file generated successfully', content: { 'application/json': {} } })
  async exportUsersJson(@Query() filters: ExportUsersQueryDto, @Res() res: Response) {
    const data = await this.usersService.exportUsersWithCourses(filters);

    const date = new Date().toISOString().split('T')[0];
    let filename = `users_export_${date}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(JSON.stringify(data, null, 2));
  }

  @Get('check-phone/:phone')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SALES_PERSON', 'SALES_MANAGER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if phone number exists in system' })
  @ApiResponse({ status: 200, description: 'Phone check result' })
  async checkPhoneExists(@Param('phone') phone: string) {
    const normalizedPhone = phone.replace(/^(\+98|98)/, '0');
    const user = await this.usersService.findByPhone(normalizedPhone);
    return { exists: !!user };
  }

  @Get('by-phone/:phone')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SALES_PERSON', 'SALES_MANAGER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user info by phone number' })
  @ApiResponse({ status: 200, description: 'User info' })
  async getUserByPhone(@Param('phone') phone: string) {
    const normalizedPhone = phone.replace(/^(\+98|98)/, '0');
    const user = await this.usersService.findByPhone(normalizedPhone);
    if (!user) {
      throw new Error('کاربر یافت نشد');
    }
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
    };
  }

  @Post('customer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SALES_PERSON', 'SALES_MANAGER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new customer (for salespersons)' })
  @ApiResponse({ status: 201, description: 'Customer created successfully' })
  async createCustomer(@Body() createCustomerDto: CreateUserDto, @Req() req) {
    // Ensure the role is USER for customers
    const customerData = { ...createCustomerDto, role: 'USER' };
    return this.usersService.create(customerData);
  }

}
