import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

// Note: This is a separate SEO service for sitemap generation
// The existing SEO service in common/services/seo.service.ts is for article SEO

@Injectable()
export class SeoService {
  private readonly baseUrl: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    // Get base URL from environment or use manehaghighi.com
    this.baseUrl = process.env.FRONTEND_URL || 'https://manehaghighi.com';
  }

  /**
   * Generate sitemap.xml with all public pages (Google-compliant)
   * https://www.sitemaps.org/protocol.html
   */
  async generateSitemap(): Promise<string> {
    const baseUrl = this.baseUrl.replace(/\/$/, '');

    // Get all published content
    const [articles, courses, podcasts, videoPodcasts, workshops] = await Promise.all([
      this.prisma.article.findMany({
        where: { published: true },
        select: { slug: true, updatedAt: true, publishedAt: true },
        orderBy: { publishedAt: 'desc' },
      }),
      this.prisma.course.findMany({
        where: { published: true },
        select: { id: true, updatedAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.podcast.findMany({
        where: { published: true },
        select: { id: true, updatedAt: true, publishedAt: true },
        orderBy: { publishedAt: 'desc' },
      }),
      this.prisma.videoPodcast.findMany({
        where: { published: true },
        select: { id: true, updatedAt: true, publishedAt: true },
        orderBy: { publishedAt: 'desc' },
      }),
      this.prisma.workshop.findMany({
        where: { isActive: true },
        select: { id: true, updatedAt: true, createdAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    const urls: string[] = [];

    // Homepage — highest priority
    urls.push(this.buildSitemapUrl(`${baseUrl}/`, new Date(), 'daily', '1.0'));

    // Static / important pages
    urls.push(this.buildSitemapUrl(`${baseUrl}/about`, new Date(), 'monthly', '0.9'));
    urls.push(this.buildSitemapUrl(`${baseUrl}/contact`, new Date(), 'monthly', '0.8'));
    urls.push(this.buildSitemapUrl(`${baseUrl}/articles`, new Date(), 'daily', '0.9'));
    urls.push(this.buildSitemapUrl(`${baseUrl}/courses`, new Date(), 'daily', '0.9'));
    urls.push(this.buildSitemapUrl(`${baseUrl}/podcasts`, new Date(), 'daily', '0.9'));
    urls.push(this.buildSitemapUrl(`${baseUrl}/video-podcasts`, new Date(), 'daily', '0.9'));
    urls.push(this.buildSitemapUrl(`${baseUrl}/workshops`, new Date(), 'weekly', '0.85'));

    // Articles
    articles.forEach((article) => {
      const lastmod = article.updatedAt || article.publishedAt || new Date();
      urls.push(this.buildSitemapUrl(`${baseUrl}/articles/${article.slug}`, lastmod, 'weekly', '0.8'));
    });

    // Courses
    courses.forEach((course) => {
      const lastmod = course.updatedAt || new Date();
      urls.push(this.buildSitemapUrl(`${baseUrl}/courses/${course.id}`, lastmod, 'weekly', '0.8'));
    });

    // Podcasts
    podcasts.forEach((podcast) => {
      const lastmod = podcast.updatedAt || podcast.publishedAt || new Date();
      urls.push(this.buildSitemapUrl(`${baseUrl}/podcasts/${podcast.id}`, lastmod, 'weekly', '0.7'));
    });

    // Video Podcasts
    videoPodcasts.forEach((vp) => {
      const lastmod = vp.updatedAt || vp.publishedAt || new Date();
      urls.push(this.buildSitemapUrl(`${baseUrl}/video-podcasts/${vp.id}`, lastmod, 'weekly', '0.7'));
    });

    // Workshops
    workshops.forEach((w) => {
      const lastmod = w.updatedAt || w.createdAt || new Date();
      urls.push(this.buildSitemapUrl(`${baseUrl}/workshops/${w.id}`, lastmod, 'weekly', '0.75'));
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urls.join('\n')}
</urlset>`;
  }

  /**
   * Build a single URL entry for sitemap (W3C / Google compliant)
   */
  private buildSitemapUrl(
    loc: string,
    lastmod: Date,
    changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never',
    priority: string,
  ): string {
    const lastmodISO = lastmod.toISOString().split('T')[0]; // YYYY-MM-DD
    return `  <url>
    <loc>${this.escapeXml(loc)}</loc>
    <lastmod>${lastmodISO}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Generate robots.txt (main site URL; sitemap is served at /sitemap.xml via nginx)
   */
  async generateRobotsTxt(): Promise<string> {
    const baseUrl = this.baseUrl.replace(/\/$/, '');
    const sitemapUrl = `${baseUrl}/sitemap.xml`;

    return `# robots.txt for ${baseUrl}
# https://www.robotstxt.org/robotstxt.html

User-agent: *
Allow: /

# Sitemap (canonical URL on main site)
Sitemap: ${sitemapUrl}

# Do not crawl auth and private areas
Disallow: /api/
Disallow: /admin/
Disallow: /dashboard
Disallow: /login
Disallow: /register
Disallow: /payment/

# Allow public assets
Allow: /assets/
Allow: /uploads/
`;
  }
}

