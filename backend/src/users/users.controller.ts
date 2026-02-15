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
  async assignCourses(@Param('id') userId: string, @Body() body: { courseIds: string[] }) {
    return this.usersService.assignCourses(userId, body.courseIds);
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

  // Rest of the existing controller methods...
  // [All other existing methods should be kept exactly as they were]
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all users with pagination (Admin only)' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async findAll(@Query() paginationQuery: PaginationQueryDto) {
    return this.usersService.findAll(paginationQuery);
  }

  // ... [Include all other existing methods exactly as they were]
  // This is just a placeholder - the actual file should contain all original methods
}