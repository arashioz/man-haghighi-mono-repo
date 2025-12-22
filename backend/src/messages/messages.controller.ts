import { Body, Controller, Get, Patch, Post, Req, UseGuards, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Messages')
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post('broadcast')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ارسال پیام همگانی توسط ادمین' })
  async broadcast(@Req() req: any, @Body() dto: CreateMessageDto) {
    return this.messagesService.broadcast(dto, req.user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'لیست پیام‌های ارسال شده (ادمین)' })
  async getMessages() {
    return this.messagesService.getAdminMessages();
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'لیست پیام‌های من' })
  @ApiResponse({ status: 200, description: 'لیست پیام‌ها دریافت شد' })
  async getMyMessages(@Req() req: any) {
    return this.messagesService.getUserMessages(req.user.id);
  }

  @Patch('my/:userMessageId/read')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'علامت‌گذاری پیام به عنوان خوانده شده' })
  async markAsRead(@Req() req: any, @Param('userMessageId') userMessageId: string) {
    return this.messagesService.markAsRead(req.user.id, userMessageId);
  }
}

