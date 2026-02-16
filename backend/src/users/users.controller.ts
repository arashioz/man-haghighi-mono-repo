import { Controller, Get, Patch, Param, Body, Delete, UseGuards, Post, Req, Query, Res, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, AssignSalesPersonDto, PaginationQueryDto, ExportUsersQueryDto, PromoteUserByPhoneDto } from './dto/user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { NotFoundException } from '@nestjs/common';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new user (Admin only)' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Post('check-phone/:phone')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SALES_PERSON', 'SALES_MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if phone number exists (Admin, Sales Person, Sales Manager only)' })
  @ApiResponse({ status: 200, description: 'Phone check result' })
  @ApiResponse({ status: 404, description: 'Phone not found' })
  async checkPhoneExists(@Param('phone') phone: string) {
    const user = await this.usersService.findByPhone(phone);
    return {
      exists: !!user,
      user: user ? {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
      } : null
    };
  }

  @Post('by-phone/:phone')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SALES_PERSON', 'SALES_MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user by phone number (Admin, Sales Person, Sales Manager only)' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserByPhone(@Param('phone') phone: string) {
    const user = await this.usersService.findByPhone(phone);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  @Post('customer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SALES_PERSON', 'SALES_MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new customer (Admin, Sales Person, Sales Manager only)' })
  @ApiResponse({ status: 201, description: 'Customer created successfully' })
  @ApiResponse({ status: 409, description: 'Customer already exists' })
  async createCustomer(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create({
      ...createUserDto,
      role: 'USER',
      isActive: true,
      isOld: false,
    });
  }

  @Post(':id/courses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign courses to user (Admin only)' })
  @ApiResponse({ status: 201, description: 'Courses assigned successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async assignCourses(@Param('id') userId: string, @Body() body: { courseIds?: string[] }) {
    return this.usersService.assignCourses(userId, body?.courseIds ?? []);
  }

  @Post('import')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Import users with courses from JSON file (Admin only)' })
  @ApiResponse({ status: 201, description: 'Users imported successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file format or content' })
  @ApiResponse({ status: 500, description: 'Import failed' })
  async importUsers(@UploadedFile() file: Express.Multer.File) {
    try {
      if (!file) {
        throw new Error('No file uploaded');
      }

      // Validate file type
      if (!file.mimetype.includes('json')) {
        throw new Error('Only JSON files are allowed');
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size exceeds 10MB limit');
      }

      // Read and parse JSON file
      const fs = require('fs');
      const path = require('path');
      
      let usersData;
      try {
        const fileContent = fs.readFileSync(file.path, 'utf8');
        usersData = JSON.parse(fileContent);
      } catch (parseError) {
        throw new Error(`Invalid JSON format: ${parseError.message}`);
      }

      // Validate data structure
      if (!Array.isArray(usersData)) {
        throw new Error('JSON file must contain an array of users');
      }

      if (usersData.length === 0) {
        throw new Error('JSON file is empty');
      }

      // Import users directly using the service
      const result = await this.usersService.importUsers(usersData);
      
      return {
        success: true,
        message: 'Users imported successfully',
        importedCount: result.importedCount,
        skippedCount: result.skippedCount,
        errors: result.errors
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Import failed'
      };
    }
  }

  @Get('sales-persons')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all sales persons (Admin only)' })
  @ApiResponse({ status: 200, description: 'Sales persons retrieved successfully' })
  async getSalesPersons() {
    return this.usersService.getSalesPersons();
  }

  @Get('sales-managers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all sales managers (Admin only)' })
  @ApiResponse({ status: 200, description: 'Sales managers retrieved successfully' })
  async getSalesManagers() {
    return this.usersService.getSalesManagers();
  }

  @Get('seller/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SALES_PERSON', 'SALES_MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get seller statistics (Sales Person, Sales Manager only)' })
  @ApiResponse({ status: 200, description: 'Seller statistics retrieved successfully' })
  async getSellerStats(@Req() req: any) {
    return this.usersService.getSellerStats(req.user.id);
  }

  /** Alternative route for user products (static path to avoid 404 with some proxies/routing). */
  @Get('with-products/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user with products and courses (Admin only)' })
  @ApiResponse({ status: 200, description: 'User with products' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserWithProductsByParam(@Param('id') userId: string) {
    return this.usersService.getUserWithProducts(userId);
  }

  @Get('export/json')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export users with courses as JSON (Admin only)' })
  @ApiQuery({ name: 'userType', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'role', required: false })
  @ApiResponse({ status: 200, description: 'JSON export' })
  async exportUsersJson(@Query() query: ExportUsersQueryDto) {
    return this.usersService.exportUsersWithCourses(query);
  }

  @Get('export/excel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export users as Excel (Admin only)' })
  @ApiQuery({ name: 'userType', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'role', required: false })
  @ApiResponse({ status: 200, description: 'Excel file' })
  async exportUsersExcel(@Query() query: ExportUsersQueryDto, @Res() res: Response) {
    const buffer = await this.usersService.exportUsers(query);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=users_export_${Date.now()}.xlsx`);
    res.send(buffer);
  }

  @Get(':id/export/json')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export single user with courses as JSON (Admin only)' })
  @ApiResponse({ status: 200, description: 'User JSON' })
  async exportUserJson(@Param('id') userId: string) {
    return this.usersService.exportSingleUserWithCourses(userId);
  }

  @Get(':id/courses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user courses (Admin only)' })
  @ApiResponse({ status: 200, description: 'User courses' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserCourses(@Param('id') userId: string) {
    return this.usersService.getUserCourses(userId);
  }

  @Get(':id/products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user products (Admin only)' })
  @ApiResponse({ status: 200, description: 'User products' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserProducts(@Param('id') userId: string) {
    return this.usersService.getUserWithProducts(userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user (Admin only)' })
  @ApiResponse({ status: 200, description: 'User updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete user (Admin only)' })
  @ApiResponse({ status: 200, description: 'User deleted' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all users with pagination (Admin only)' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async findAll(@Query() paginationQuery: PaginationQueryDto) {
    return this.usersService.findAll(paginationQuery);
  }
}