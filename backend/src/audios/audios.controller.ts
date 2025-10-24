import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  Res,
  Headers,
} from '@nestjs/common';
import { AudiosService } from './audios.service';
import { CreateAudioDto, UpdateAudioDto } from './dto/audio.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@Controller('audios')
@UseGuards(JwtAuthGuard)
export class AudiosController {
  constructor(private readonly audiosService: AudiosService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() createAudioDto: CreateAudioDto) {
    return this.audiosService.create(createAudioDto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.audiosService.findAll();
  }

  @Get('my-audios')
  getMyAudios(@Request() req) {
    return this.audiosService.getMyAudios(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.audiosService.findOne(id);
  }

  @Get(':id/stream-url')
  getAudioStreamUrl(@Param('id') id: string) {
    return this.audiosService.getAudioStreamUrl(id);
  }

  @Get(':id/stream')
  async streamAudio(
    @Param('id') id: string,
    @Res() res: Response,
    @Headers('range') range?: string,
  ) {
    try {
      const audioInfo = await this.audiosService.getAudioStreamUrl(id);
      const audioPath = path.join(process.cwd(), 'uploads', audioInfo.audioFile);

      if (!fs.existsSync(audioPath)) {
        return res.status(404).json({ message: 'Audio file not found' });
      }

      const stat = fs.statSync(audioPath);
      const fileSize = stat.size;
      const start = 0;
      const end = fileSize - 1;

      const contentLength = end - start + 1;
      const headers = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': contentLength,
        'Content-Type': 'audio/mpeg',
      };

      res.writeHead(206, headers);

      const stream = fs.createReadStream(audioPath, { start, end });
      stream.pipe(res);
    } catch (error) {
      res.status(500).json({ message: 'Error streaming audio' });
    }
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() updateAudioDto: UpdateAudioDto) {
    return this.audiosService.update(id, updateAudioDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.audiosService.remove(id);
  }

  @Post(':id/access')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  grantAccess(@Param('id') id: string, @Body() body: { userId: string }) {
    return this.audiosService.grantAccess(body.userId, id);
  }

  @Delete(':id/access')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  revokeAccess(@Param('id') id: string, @Body() body: { userId: string }) {
    return this.audiosService.revokeAccess(body.userId, id);
  }
}

