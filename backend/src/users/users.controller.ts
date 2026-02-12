import { Controller, Get, Patch, Param, Body, Delete, UseGuards, Post, Req, Query, Res, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, AssignSalesPersonDto, PaginationQueryDto, ExportUsersQueryDto, PromoteUserByPhoneDto } from './dto/user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('import')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Import users with courses from JSON file (Admin only)' })
  @ApiResponse({ status: 201, description: 'Users imported successfully' })
  async importUsers(@UploadedFile() file: Express.Multer.File) {
    const { spawn } = require('child_process');
    const path = require('path');
    
    return new Promise((resolve, reject) => {
      const importScript = spawn('npx', [
        'ts-node',
        path.join(process.cwd(), 'backend/scripts/import-users-with-courses.ts'),
        file.path
      ]);

      let output = '';
      
      importScript.stdout.on('data', (data) => {
        output += data.toString();
      });

      importScript.stderr.on('data', (data) => {
        output += data.toString();
      });

      importScript.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, output });
        } else {
          reject({ success: false, output });
        }
      });
    });
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