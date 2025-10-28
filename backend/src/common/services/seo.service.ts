import { Injectable } from '@nestjs/common';

@Injectable()
export class SeoService {
  /**
   * محاسبه زمان مطالعه بر اساس محتوا
   */
  calculateReadingTime(content: string): number {
    // حذف تگ‌های HTML
    const text = content.replace(/<[^>]*>/g, '');
    // تعداد کلمات
    const words = text.trim().split(/\s+/).length;
    // فرض: 200 کلمه در دقیقه برای زبان فارسی
    const wordsPerMinute = 200;
    const minutes = Math.ceil(words / wordsPerMinute);
    return minutes || 1;
  }

  /**
   * تولید توضیحات خودکار از محتوا
   */
  generateExcerpt(content: string, maxLength: number = 160): string {
    const text = content.replace(/<[^>]*>/g, '').trim();
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength).trim() + '...';
  }

  /**
   * بهینه‌سازی slug
   */
  optimizeSlug(slug: string): string {
    return slug
      .toLowerCase()
      .replace(/\s+/g, '-') // فاصله‌ها به خط تیره
      .replace(/[^\u0600-\u06FFa-z0-9\-]/g, '') // حذف کاراکترهای غیرمجاز
      .replace(/-+/g, '-') // حذف خط تیره‌های متوالی
      .replace(/^-|-$/g, ''); // حذف خط تیره از ابتدا و انتها
  }

  /**
   * تولید عنوان سئو بهینه
   */
  generateSeoTitle(title: string, siteName?: string): string {
    if (siteName) {
      return `${title} | ${siteName}`;
    }
    return title;
  }

  /**
   * استخراج تصاویر از محتوا
   */
  extractImages(content: string): string[] {
    const imgRegex = /<img[^>]+src="([^">]+)"/g;
    const images: string[] = [];
    let match;
    
    while ((match = imgRegex.exec(content)) !== null) {
      images.push(match[1]);
    }
    
    return images;
  }

  /**
   * تولید فهرست مطالب (TOC)
   */
  generateTableOfContents(content: string): Array<{ level: number; text: string; id: string }> {
    const headingRegex = /<h([1-6])[^>]*id="([^"]*)"[^>]*>(.*?)<\/h\1>/gi;
    const toc: Array<{ level: number; text: string; id: string }> = [];
    let match;

    while ((match = headingRegex.exec(content)) !== null) {
      toc.push({
        level: parseInt(match[1]),
        text: match[3].replace(/<[^>]*>/g, ''),
        id: match[2],
      });
    }

    return toc;
  }

  /**
   * تولید Schema.org JSON-LD
   */
  generateArticleSchema(article: any): object {
    const schema = {
      '@context': 'https://schema.org',
      '@type': article.schemaType || 'Article',
      headline: article.title,
      description: article.metaDescription || article.excerpt,
      image: article.ogImage || article.featuredImage,
      author: {
        '@type': 'Person',
        name: article.author || 'نویسنده',
      },
      datePublished: article.publishedAt,
      dateModified: article.updatedAt,
    };

    if (article.authorBio) {
      schema.author['description'] = article.authorBio;
    }

    return schema;
  }

  /**
   * تولید Breadcrumb Schema
   */
  generateBreadcrumbSchema(items: Array<{ name: string; url: string }>): object {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url,
      })),
    };
  }

  /**
   * بررسی کیفیت سئو
   */
  analyzeSeoQuality(article: any): {
    score: number;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    // بررسی عنوان
    if (!article.title) {
      issues.push('عنوان مقاله خالی است');
      score -= 20;
    } else if (article.title.length < 30) {
      suggestions.push('عنوان کوتاه است (حداقل 30 کاراکتر توصیه می‌شود)');
      score -= 5;
    } else if (article.title.length > 60) {
      suggestions.push('عنوان بلند است (حداکثر 60 کاراکتر توصیه می‌شود)');
      score -= 5;
    }

    // بررسی توضیحات متا
    if (!article.metaDescription) {
      issues.push('توضیحات متا خالی است');
      score -= 15;
    } else if (article.metaDescription.length < 120) {
      suggestions.push('توضیحات متا کوتاه است (حداقل 120 کاراکتر توصیه می‌شود)');
      score -= 5;
    } else if (article.metaDescription.length > 160) {
      suggestions.push('توضیحات متا بلند است (حداکثر 160 کاراکتر توصیه می‌شود)');
      score -= 5;
    }

    // بررسی کلمه کلیدی اصلی
    if (!article.focusKeyword) {
      suggestions.push('کلمه کلیدی اصلی تعیین نشده است');
      score -= 10;
    } else {
      const keyword = article.focusKeyword.toLowerCase();
      const content = article.content.toLowerCase();
      const title = article.title.toLowerCase();

      if (!title.includes(keyword)) {
        suggestions.push('کلمه کلیدی اصلی در عنوان وجود ندارد');
        score -= 10;
      }

      if (!content.includes(keyword)) {
        issues.push('کلمه کلیدی اصلی در محتوا وجود ندارد');
        score -= 15;
      }
    }

    // بررسی تصویر شاخص
    if (!article.featuredImage) {
      suggestions.push('تصویر شاخص تعیین نشده است');
      score -= 10;
    }

    // بررسی محتوا
    if (!article.content) {
      issues.push('محتوای مقاله خالی است');
      score -= 30;
    } else {
      const wordCount = article.content.replace(/<[^>]*>/g, '').trim().split(/\s+/).length;
      if (wordCount < 300) {
        suggestions.push('محتوای مقاله بسیار کوتاه است (حداقل 300 کلمه توصیه می‌شود)');
        score -= 10;
      }
    }

    // بررسی slug
    if (!article.slug) {
      issues.push('Slug مقاله خالی است');
      score -= 10;
    } else if (article.slug.length > 50) {
      suggestions.push('Slug بلند است (حداکثر 50 کاراکتر توصیه می‌شود)');
      score -= 5;
    }

    // بررسی تگ‌ها
    if (!article.tags || article.tags.length === 0) {
      suggestions.push('تگی برای مقاله تعیین نشده است');
      score -= 5;
    }

    return {
      score: Math.max(0, score),
      issues,
      suggestions,
    };
  }

  /**
   * تولید sitemap entry
   */
  generateSitemapEntry(article: any, baseUrl: string): object {
    return {
      url: `${baseUrl}/articles/${article.slug}`,
      lastmod: article.updatedAt,
      changefreq: 'weekly',
      priority: article.published ? 0.8 : 0.5,
    };
  }

  /**
   * تولید Open Graph tags
   */
  generateOpenGraphTags(article: any, baseUrl: string): Record<string, string> {
    return {
      'og:type': article.ogType || 'article',
      'og:title': article.ogTitle || article.metaTitle || article.title,
      'og:description': article.ogDescription || article.metaDescription || article.excerpt,
      'og:image': article.ogImage || article.featuredImage,
      'og:url': `${baseUrl}/articles/${article.slug}`,
      'og:site_name': 'وب‌سایت شما',
      'article:published_time': article.publishedAt,
      'article:modified_time': article.updatedAt,
      'article:author': article.author || 'نویسنده',
    };
  }

  /**
   * تولید Twitter Card tags
   */
  generateTwitterCardTags(article: any): Record<string, string> {
    return {
      'twitter:card': article.twitterCard || 'summary_large_image',
      'twitter:title': article.twitterTitle || article.metaTitle || article.title,
      'twitter:description': article.twitterDescription || article.metaDescription || article.excerpt,
      'twitter:image': article.twitterImage || article.ogImage || article.featuredImage,
    };
  }
}

