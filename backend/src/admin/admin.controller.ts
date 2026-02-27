import { Controller, Get, Post, UseGuards, Res, HttpException, HttpStatus, Query, Param } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';

const execAsync = promisify(exec);

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  @Get('backup')
  @ApiOperation({ summary: 'Create database backup (Admin only)' })
  @ApiResponse({ status: 200, description: 'Database backup created successfully' })
  @ApiResponse({ status: 500, description: 'Failed to create backup' })
  async createBackup(@Res() res: Response) {
    try {
      const backupPath = await this.adminService.createDatabaseBackup();
      
      // Set headers for file download
      const fileName = path.basename(backupPath);
      res.setHeader('Content-Type', 'application/sql');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', fs.statSync(backupPath).size);

      // Stream the file
      const fileStream = fs.createReadStream(backupPath);
      fileStream.pipe(res);

      // Clean up the file after streaming
      fileStream.on('end', () => {
        // Delete the backup file after sending
        setTimeout(() => {
          try {
            fs.unlinkSync(backupPath);
          } catch (err) {
            console.error('Failed to delete backup file:', err);
          }
        }, 1000);
      });
    } catch (error) {
      console.error('Backup error:', error);
      throw new HttpException(
        `Failed to create backup: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('backup/json')
  @ApiOperation({ summary: 'Create JSON backup for selected entities (Admin only)' })
  @ApiQuery({ name: 'entity', required: false, description: 'Comma separated list of entities (users,courses,videos,audios,podcasts,videoPodcasts,articles,comments,invoices,workshops). Default: all' })
  @ApiResponse({ status: 200, description: 'JSON backup generated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid entities' })
  async createJsonBackup(@Query('entity') entity: string | undefined, @Res() res: Response) {
    const { data, filename } = await this.adminService.createJsonBackup(entity);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(JSON.stringify(data, null, 2));
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get overall system stats (Admin only)' })
  @ApiResponse({ status: 200, description: 'Stats retrieved successfully' })
  async getStats() {
    return this.adminService.getStats();
  }

  @Post('users/:userId/assign-all-courses')
  @ApiOperation({ summary: 'Assign all courses to a user - Complete Pack (Admin only)' })
  @ApiResponse({ status: 200, description: 'All courses assigned successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async assignAllCourses(@Param('userId') userId: string) {
    return this.usersService.assignAllCourses(userId);
  }
}

