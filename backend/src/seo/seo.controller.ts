import { Controller, Get, Res, Header } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SeoService } from './seo.service';
import { Response } from 'express';

@ApiTags('SEO')
@Controller('seo')
export class SeoController {
  constructor(private readonly seoService: SeoService) {}

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  @ApiOperation({ summary: 'Generate sitemap.xml for search engines' })
  async generateSitemap(@Res() res: Response) {
    const sitemap = await this.seoService.generateSitemap();
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour
    return res.send(sitemap);
  }

  @Get('robots.txt')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @ApiOperation({ summary: 'Generate robots.txt' })
  async generateRobotsTxt(@Res() res: Response) {
    const robots = await this.seoService.generateRobotsTxt();
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours
    return res.send(robots);
  }
}




