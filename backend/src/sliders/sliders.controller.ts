import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { SlidersService } from './sliders.service';
import { CreateSliderDto, UpdateSliderDto } from './dto/slider.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { diskStorage } from 'multer';
import { extname, join } from 'path';

@ApiTags('Sliders')
@Controller('sliders')
export class SlidersController {
  constructor(private readonly slidersService: SlidersService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'image', maxCount: 1 },
    { name: 'video', maxCount: 1 },
  ], {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = process.env.UPLOAD_PATH || join(process.cwd(), 'uploads');
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      if (file.mimetype.match(/\/(jpg|jpeg|png|gif|mp4|webm|mov|avi)$/)) {
        cb(null, true);
      } else {
        cb(new Error('Unsupported file type'), false);
      }
    },
    limits: {
      fileSize: 100 * 1024 * 1024,
    },
  }))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a new slider (Admin only)' })
  @ApiResponse({ status: 201, description: 'Slider created successfully' })
  async create(
    @Body() createSliderDto: CreateSliderDto,
    @UploadedFiles() files: { image?: Express.Multer.File[], video?: Express.Multer.File[] }
  ) {
    return this.slidersService.create(createSliderDto, files);
  }

  @Get()
  @ApiOperation({ summary: 'Get all sliders' })
  @ApiResponse({ status: 200, description: 'Sliders retrieved successfully' })
  async findAll() {
    return this.slidersService.findAll();
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active sliders' })
  @ApiResponse({ status: 200, description: 'Active sliders retrieved successfully' })
  async findActive() {
    return this.slidersService.findActive();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get slider by ID' })
  @ApiResponse({ status: 200, description: 'Slider retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Slider not found' })
  async findOne(@Param('id') id: string) {
    return this.slidersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update slider (Admin only)' })
  @ApiResponse({ status: 200, description: 'Slider updated successfully' })
  async update(@Param('id') id: string, @Body() updateSliderDto: UpdateSliderDto) {
    return this.slidersService.update(id, updateSliderDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete slider (Admin only)' })
  @ApiResponse({ status: 200, description: 'Slider deleted successfully' })
  async remove(@Param('id') id: string) {
    return this.slidersService.remove(id);
  }
}
