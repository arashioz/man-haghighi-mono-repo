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

    return {
      enrollments: enrollments.length,
      workshops: workshops.length,
      enrollmentsList: enrollments,
      workshopsList: workshops,
      period: period || 'all',
      role: 'SALES_PERSON'
    };
  }
}
