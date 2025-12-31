import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, UseInterceptors, UploadedFiles, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
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
  @UseInterceptors(FilesInterceptor('thumbnail', 1, {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = process.env.UPLOAD_PATH || join(process.cwd(), 'uploads');
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        cb(null, `workshop-thumbnail-${uniqueSuffix}${ext}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      if (file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'), false);
      }
    },
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  }))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a new workshop' })
  @ApiResponse({ status: 201, description: 'Workshop created successfully' })
  async create(
    @Body() createWorkshopDto: CreateWorkshopDto,
    @UploadedFiles() files: { thumbnail?: Express.Multer.File[] }
  ) {
    return this.workshopsService.create(createWorkshopDto, files);
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
  async getMyWorkshops(@Request() req, @Query('userId') userId?: string) {
    // اگر userId در query باشد، از آن استفاده کن (برای ادمین/مدیر فروش)
    // در غیر این صورت از کاربر لاگین شده استفاده کن
    const targetUserId = userId || req.user.id;
    return this.workshopsService.getUserWorkshops(targetUserId);
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
  @UseInterceptors(FilesInterceptor('thumbnail', 1, {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = process.env.UPLOAD_PATH || join(process.cwd(), 'uploads');
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        cb(null, `workshop-thumbnail-${uniqueSuffix}${ext}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      if (file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'), false);
      }
    },
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  }))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update workshop' })
  @ApiResponse({ status: 200, description: 'Workshop updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() updateWorkshopDto: UpdateWorkshopDto,
    @UploadedFiles() files: { thumbnail?: Express.Multer.File[] }
  ) {
    return this.workshopsService.update(id, updateWorkshopDto, files);
  }

  @Patch(':id/videos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SALES_MANAGER')
  @UseInterceptors(FilesInterceptor('videos', 20, {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = process.env.UPLOAD_PATH || join(process.cwd(), 'uploads');
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        cb(null, `workshopVideo-${uniqueSuffix}${ext}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      if (file.mimetype.match(/\/(mp4|webm|mov|avi|mkv)$/)) {
        cb(null, true);
      } else {
        cb(new Error('Only video files are allowed'), false);
      }
    },
    limits: { fileSize: 100 * 1024 * 1024 },
  }))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload workshop videos (Admin/Sales Manager only)' })
  @ApiResponse({ status: 200, description: 'Videos uploaded successfully' })
  async uploadVideos(@Param('id') id: string, @UploadedFiles() files: Express.Multer.File[]) {
    return this.workshopsService.uploadVideos(id, files);
  }

  @Patch(':id/audios')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SALES_MANAGER')
  @UseInterceptors(FilesInterceptor('audios', 20, {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = process.env.UPLOAD_PATH || join(process.cwd(), 'uploads');
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        cb(null, `workshopAudio-${uniqueSuffix}${ext}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      if (file.mimetype.match(/\/(mp3|wav|ogg|m4a|aac)$/)) {
        cb(null, true);
      } else {
        cb(new Error('Only audio files are allowed'), false);
      }
    },
    limits: { fileSize: 50 * 1024 * 1024 },
  }))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload workshop audios (Admin/Sales Manager only)' })
  @ApiResponse({ status: 200, description: 'Audios uploaded successfully' })
  async uploadAudios(@Param('id') id: string, @UploadedFiles() files: Express.Multer.File[]) {
    return this.workshopsService.uploadAudios(id, files);
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

  @Get(':id/available-sales-persons')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SALES_MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get sales persons available for workshop access' })
  @ApiResponse({ status: 200, description: 'Available sales persons retrieved successfully' })
  async getAvailableSalesPersonsForWorkshop(@Param('id') workshopId: string) {
    return this.workshopsService.getAvailableSalesPersonsForWorkshop(workshopId);
  }

  @Get(':id/all-access')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SALES_MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all workshop access records (active and inactive)' })
  @ApiResponse({ status: 200, description: 'All access records retrieved successfully' })
  async getAllWorkshopAccess(@Param('id') workshopId: string) {
    return this.workshopsService.getAllWorkshopAccess(workshopId);
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
