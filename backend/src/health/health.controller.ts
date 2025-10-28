import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { PrismaClient } from '@prisma/client';

@Controller('health')
export class HealthController {
  private prisma = new PrismaClient();

  @Get()
  async check() {
    // Test database connection
    let dbStatus = 'disconnected';
    let dbError = null;
    let userCount = 0;
    let adminUsers = [];
    let courseCount = 0;
    let articleCount = 0;
    let podcastCount = 0;
    let sliderCount = 0;

    try {
      // Try to query database
      await this.prisma.$connect();
      dbStatus = 'connected';
      
      // Count users
      userCount = await this.prisma.user.count();
      
      // Get admin users
      adminUsers = await this.prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { email: true, username: true, firstName: true, lastName: true },
      });
      
      // Count other entities
      courseCount = await this.prisma.course.count();
      articleCount = await this.prisma.article.count();
      podcastCount = await this.prisma.podcast.count();
      sliderCount = await this.prisma.slider.count();
      
    } catch (error) {
      dbStatus = 'error';
      dbError = error.message;
    }

    return {
      status: dbStatus === 'connected' ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: 'haghighi-backend',
      version: '1.0.0',
      
      database: {
        status: dbStatus,
        error: dbError,
      },
      
      data: {
        users: {
          total: userCount,
          admins: adminUsers,
          seeded: userCount > 0,
        },
        courses: {
          total: courseCount,
          seeded: courseCount > 0,
        },
        articles: {
          total: articleCount,
          seeded: articleCount > 0,
        },
        podcasts: {
          total: podcastCount,
          seeded: podcastCount > 0,
        },
        sliders: {
          total: sliderCount,
          seeded: sliderCount > 0,
        },
      },
      
      environment: {
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT,
      },
    };
  }
  
  @Get('status')
  async statusPage(@Res() res: Response) {
    const health = await this.check();
    
    const html = `
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>وضعیت سیستم - پلتفرم حقیقی</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            min-height: 100vh;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 2.5rem;
        }
        .timestamp {
            color: #666;
            margin-bottom: 30px;
            font-size: 0.9rem;
        }
        .status-badge {
            display: inline-block;
            padding: 8px 20px;
            border-radius: 25px;
            font-weight: bold;
            margin-bottom: 20px;
            font-size: 1.1rem;
        }
        .status-ok { background: #10b981; color: white; }
        .status-error { background: #ef4444; color: white; }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .card {
            background: #f8fafc;
            border-radius: 15px;
            padding: 25px;
            border: 2px solid #e2e8f0;
            transition: transform 0.2s;
        }
        .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }
        .card h2 {
            color: #1e293b;
            margin-bottom: 15px;
            font-size: 1.3rem;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
        }
        .stat {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        .stat:last-child { border-bottom: none; }
        .stat-label {
            color: #64748b;
            font-weight: 500;
        }
        .stat-value {
            color: #1e293b;
            font-weight: bold;
        }
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.85rem;
            font-weight: bold;
        }
        .badge-success { background: #d1fae5; color: #065f46; }
        .badge-error { background: #fee2e2; color: #991b1b; }
        .badge-warning { background: #fef3c7; color: #92400e; }
        .admin-list {
            background: white;
            padding: 15px;
            border-radius: 10px;
            margin-top: 10px;
        }
        .admin-item {
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        .admin-item:last-child { border-bottom: none; }
        .refresh-btn {
            background: #667eea;
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 10px;
            cursor: pointer;
            font-size: 1rem;
            font-weight: bold;
            margin-top: 20px;
            transition: background 0.2s;
        }
        .refresh-btn:hover { background: #5568d3; }
        .uptime { 
            font-size: 1.2rem; 
            color: #667eea; 
            font-weight: bold; 
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 وضعیت سیستم پلتفرم حقیقی</h1>
        <div class="timestamp">آخرین بررسی: ${health.timestamp}</div>
        
        <div class="status-badge status-${health.status === 'ok' ? 'ok' : 'error'}">
            ${health.status === 'ok' ? '✅ سیستم سالم است' : '❌ خطا در سیستم'}
        </div>
        
        <div class="grid">
            <!-- Database Status -->
            <div class="card">
                <h2>🗄️ دیتابیس</h2>
                <div class="stat">
                    <span class="stat-label">وضعیت</span>
                    <span class="badge ${health.database.status === 'connected' ? 'badge-success' : 'badge-error'}">
                        ${health.database.status === 'connected' ? 'متصل' : 'قطع'}
                    </span>
                </div>
                ${health.database.error ? `
                <div class="stat">
                    <span class="stat-label">خطا</span>
                    <span class="stat-value" style="color: #ef4444;">${health.database.error}</span>
                </div>
                ` : ''}
            </div>
            
            <!-- System Info -->
            <div class="card">
                <h2>⚙️ اطلاعات سیستم</h2>
                <div class="stat">
                    <span class="stat-label">سرویس</span>
                    <span class="stat-value">${health.service}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">نسخه</span>
                    <span class="stat-value">${health.version}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">محیط</span>
                    <span class="stat-value">${health.environment.nodeEnv}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">زمان فعالیت</span>
                    <span class="uptime">${Math.floor(health.uptime / 60)} دقیقه</span>
                </div>
            </div>
            
            <!-- Users -->
            <div class="card">
                <h2>👥 کاربران</h2>
                <div class="stat">
                    <span class="stat-label">تعداد کل</span>
                    <span class="stat-value">${health.data.users.total}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">وضعیت Seed</span>
                    <span class="badge ${health.data.users.seeded ? 'badge-success' : 'badge-error'}">
                        ${health.data.users.seeded ? 'انجام شده' : 'انجام نشده'}
                    </span>
                </div>
                ${health.data.users.admins.length > 0 ? `
                <div class="admin-list">
                    <strong>ادمین‌ها:</strong>
                    ${health.data.users.admins.map(admin => `
                        <div class="admin-item">
                            📧 ${admin.email || admin.username}<br>
                            👤 ${admin.firstName || ''} ${admin.lastName || ''}
                        </div>
                    `).join('')}
                </div>
                ` : ''}
            </div>
            
            <!-- Courses -->
            <div class="card">
                <h2>📚 دوره‌ها</h2>
                <div class="stat">
                    <span class="stat-label">تعداد</span>
                    <span class="stat-value">${health.data.courses.total}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">وضعیت Seed</span>
                    <span class="badge ${health.data.courses.seeded ? 'badge-success' : 'badge-warning'}">
                        ${health.data.courses.seeded ? 'انجام شده' : 'انجام نشده'}
                    </span>
                </div>
            </div>
            
            <!-- Articles -->
            <div class="card">
                <h2>📝 مقالات</h2>
                <div class="stat">
                    <span class="stat-label">تعداد</span>
                    <span class="stat-value">${health.data.articles.total}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">وضعیت Seed</span>
                    <span class="badge ${health.data.articles.seeded ? 'badge-success' : 'badge-warning'}">
                        ${health.data.articles.seeded ? 'انجام شده' : 'انجام نشده'}
                    </span>
                </div>
            </div>
            
            <!-- Podcasts -->
            <div class="card">
                <h2>🎙️ پادکست‌ها</h2>
                <div class="stat">
                    <span class="stat-label">تعداد</span>
                    <span class="stat-value">${health.data.podcasts.total}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">وضعیت Seed</span>
                    <span class="badge ${health.data.podcasts.seeded ? 'badge-success' : 'badge-warning'}">
                        ${health.data.podcasts.seeded ? 'انجام شده' : 'انجام نشده'}
                    </span>
                </div>
            </div>
            
            <!-- Sliders -->
            <div class="card">
                <h2>🖼️ اسلایدرها</h2>
                <div class="stat">
                    <span class="stat-label">تعداد</span>
                    <span class="stat-value">${health.data.sliders.total}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">وضعیت Seed</span>
                    <span class="badge ${health.data.sliders.seeded ? 'badge-success' : 'badge-warning'}">
                        ${health.data.sliders.seeded ? 'انجام شده' : 'انجام نشده'}
                    </span>
                </div>
            </div>
        </div>
        
        <button class="refresh-btn" onclick="location.reload()">🔄 بروزرسانی</button>
    </div>
    
    <script>
        // Auto refresh every 30 seconds
        setTimeout(() => location.reload(), 30000);
    </script>
</body>
</html>
    `;
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }
  
  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }
}
