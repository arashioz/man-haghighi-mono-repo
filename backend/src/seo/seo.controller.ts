import { Controller, Get, Res, Header } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SeoService } from './seo.service';
import { Response } from 'express';

@ApiTags('SEO')
@Controller('seo')
export class SeoController {
  constructor(private readonly seoService: SeoService) {}

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml')
  @ApiOperation({ summary: 'Generate sitemap.xml for search engines' })
  async generateSitemap(@Res() res: Response) {
    const sitemap = await this.seoService.generateSitemap();
    res.set('Content-Type', 'application/xml');
    return res.send(sitemap);
  }

  @Get('robots.txt')
  @Header('Content-Type', 'text/plain')
  @ApiOperation({ summary: 'Generate robots.txt' })
  async generateRobotsTxt(@Res() res: Response) {
    const robots = await this.seoService.generateRobotsTxt();
    res.set('Content-Type', 'text/plain');
    return res.send(robots);
  }
}




