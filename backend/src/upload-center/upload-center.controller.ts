import {
  Controller,
  Get,
  Delete,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UploadCenterService } from './upload-center.service';
import { AssignFileToCourseDto } from './dto/upload-center.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Upload Center')
@Controller('upload-center')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class UploadCenterController {
  constructor(private readonly uploadCenterService: UploadCenterService) {}

  @Get()
  @ApiOperation({ summary: 'Get all uploaded files (Admin only)' })
  @ApiResponse({ status: 200, description: 'Files retrieved successfully' })
  async getAllFiles() {
    return this.uploadCenterService.getAllFiles();
  }

  @Get('videos')
  @ApiOperation({ summary: 'Get all video files (Admin only)' })
  @ApiResponse({ status: 200, description: 'Video files retrieved successfully' })
  async getVideos() {
    return this.uploadCenterService.getVideos();
  }

  @Get('audios')
  @ApiOperation({ summary: 'Get all audio files (Admin only)' })
  @ApiResponse({ status: 200, description: 'Audio files retrieved successfully' })
  async getAudios() {
    return this.uploadCenterService.getAudios();
  }

  @Delete(':filename')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an uploaded file (Admin only)' })
  @ApiResponse({ status: 200, description: 'File deleted successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  @ApiResponse({ status: 400, description: 'File is in use and cannot be deleted' })
  async deleteFile(@Param('filename') filename: string) {
    await this.uploadCenterService.deleteFile(filename);
    return { message: 'File deleted successfully' };
  }

  @Post(':filename/assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign a file to a course (Admin only)' })
  @ApiResponse({ status: 200, description: 'File assigned to course successfully' })
  @ApiResponse({ status: 404, description: 'File or course not found' })
  @ApiResponse({ status: 400, description: 'Invalid operation' })
  async assignFileToCourse(
    @Param('filename') filename: string,
    @Body() assignDto: AssignFileToCourseDto,
  ) {
    return this.uploadCenterService.assignFileToCourse(filename, assignDto);
  }
}

