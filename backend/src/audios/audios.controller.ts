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
  ForbiddenException,
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
  findAll(@Query('courseId') courseId?: string) {
    if (courseId) {
      return this.audiosService.findByCourse(courseId);
    }
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
  async getAudioStreamUrl(@Param('id') id: string, @Request() req) {
    const audioInfo = await this.audiosService.getAudioStreamUrl(id);
    // Extract token from Authorization header and add to query parameter for audio streaming
    const token = req.headers.authorization?.replace('Bearer ', '') || '';
    const encodedToken = encodeURIComponent(token);
    return {
      ...audioInfo,
      streamUrl: `${audioInfo.streamUrl}?token=${encodedToken}`,
    };
  }

  @Get(':id/stream')
  async streamAudio(
    @Param('id') id: string,
    @Request() req,
    @Res() res: Response,
    @Headers('range') range?: string,
  ) {
    try {
      // Check if user has access to this audio
      const hasAccess = await this.audiosService.checkAudioAccess(req.user.id, id);
      
      if (!hasAccess) {
        throw new ForbiddenException('You do not have access to this audio');
      }

      const audio = await this.audiosService.findOne(id);
      const audioPath = path.join(process.cwd(), 'uploads', audio.audioFile);

      if (!fs.existsSync(audioPath)) {
        return res.status(404).json({ message: 'Audio file not found' });
      }

      const stat = fs.statSync(audioPath);
      const fileSize = stat.size;

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;

        const stream = fs.createReadStream(audioPath, { start, end });
        const headers = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'audio/mpeg',
          'Content-Disposition': 'inline',
          'X-Content-Type-Options': 'nosniff',
        };

        res.writeHead(206, headers);
        stream.pipe(res);
      } else {
        const headers = {
          'Content-Length': fileSize,
          'Content-Type': 'audio/mpeg',
          'Accept-Ranges': 'bytes',
          'Content-Disposition': 'inline',
          'X-Content-Type-Options': 'nosniff',
        };

        res.writeHead(200, headers);
        fs.createReadStream(audioPath).pipe(res);
      }
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

