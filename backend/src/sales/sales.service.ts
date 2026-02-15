import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async getSalesReport(userId: string, userRole: string, period?: string) {
    if (userRole === 'ADMIN') {
      const totalUsers = await this.prisma.user.count({
        where: { role: 'USER' }
      });
      
      const totalSalesManagers = await this.prisma.user.count({
        where: { role: 'SALES_MANAGER' }
      });
      
      const totalSalesPersons = await this.prisma.user.count({
        where: { role: 'SALES_PERSON' }
      });

      const totalCourses = await this.prisma.course.count();
      
      const totalEnrollments = await this.prisma.courseEnrollment.count();

      return {
        totalUsers,
        totalSalesManagers,
        totalSalesPersons,
        totalCourses,
        totalEnrollments,
        period: period || 'all',
        role: userRole
      };
    }

    if (userRole === 'SALES_MANAGER') {
      const salesTeam = await this.prisma.user.findMany({
        where: { 
          role: 'SALES_PERSON',
          parentId: userId 
        }
      });

      const teamEnrollments = await this.prisma.courseEnrollment.findMany({
        where: {
          user: {
            role: 'SALES_PERSON',
            parentId: userId
          }
        },
        include: {
          user: true,
          course: true
        }
      });

      return {
        salesTeam: salesTeam.length,
        teamEnrollments: teamEnrollments.length,
        enrollments: teamEnrollments,
        period: period || 'all',
        role: userRole
      };
    }

    return { message: 'Access denied' };
  }

  async getSalesTeam(managerId: string) {
    return this.prisma.user.findMany({
      where: { 
        role: 'SALES_PERSON',
        parentId: managerId 
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        isActive: true,
        createdAt: true
      }
    });
  }

  async getPersonalSalesReport(userId: string, period?: string) {
    const enrollments = await this.prisma.courseEnrollment.findMany({
      where: { userId },
      include: {
        course: true
      }
    });

    const workshops = await this.prisma.workshopParticipant.findMany({
      where: { createdBy: userId }
    });

    // Get payment links created by this sales person
    const paymentLinks = await this.prisma.paymentLink.findMany({
      where: { createdById: userId },
      include: {
        invoices: {
          include: {
            transactions: true
          }
        }
      }
    });

    // Calculate stats
    const totalLinks = paymentLinks.length;
    const paidLinks = paymentLinks.filter(link => 
      link.invoices?.some(inv => inv.status === 'PAID')
    ).length;
    const unpaidLinks = totalLinks - paidLinks;
    const totalRevenue = paymentLinks
      .filter(link => link.invoices?.some(inv => inv.status === 'PAID'))
      .reduce((sum, link) => sum + Number(link.amount), 0);

    // Calculate today's revenue
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayRevenue = paymentLinks
      .filter(link => 
        link.invoices?.some(inv => 
          inv.status === 'PAID' && 
          new Date(inv.paidAt!) >= today && 
          new Date(inv.paidAt!) < tomorrow
        )
      )
      .reduce((sum, link) => sum + Number(link.amount), 0);

    return {
      enrollments: enrollments.length,
      workshops: workshops.length,
      enrollmentsList: enrollments,
      workshopsList: workshops,
      paymentLinks: {
        totalLinks,
        paidLinks,
        unpaidLinks,
        totalRevenue,
        todayRevenue
      },
      period: period || 'all',
      role: 'SALES_PERSON'
    };
  }
}
