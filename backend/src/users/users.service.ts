import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const { email, phone, username, password, firstName, lastName, avatar, role, isActive, isOld } = createUserDto;

    if (role === 'ADMIN' && !email) {
      throw new ConflictException('Admin users must have an email');
    }
    if (role !== 'ADMIN' && !phone) {
      throw new ConflictException('Non-admin users must have a phone number');
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(phone ? [{ phone }] : []),
          { username }
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException('User with this email, phone, or username already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        phone,
        username,
        password: hashedPassword,
        firstName,
        lastName,
        avatar,
        role: role as any,
        isActive: isActive ?? true,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        phone: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        phone: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.findOne(id);
    
    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
      select: {
        id: true,
        email: true,
        phone: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async remove(id: string) {
    const user = await this.findOne(id);
    
    if (user.role === 'SALES_MANAGER') {
      await (this.prisma as any).salesTeam.deleteMany({
        where: { managerId: id },
      });
    }
    
    if (user.role === 'SALES_PERSON') {
      await (this.prisma as any).salesTeamMember.deleteMany({
        where: { salesPersonId: id },
      });
      
      await this.prisma.salesPersonWorkshopAccess.deleteMany({
        where: { 
          OR: [
            { salesPersonId: id },
            { grantedBy: id }
          ]
        },
      });
      
      await this.prisma.workshopParticipant.deleteMany({
        where: { createdBy: id },
      });
      
      await this.prisma.workshop.deleteMany({
        where: { createdBy: id },
      });
    }
    

    await this.prisma.videoAccess.deleteMany({
      where: { userId: id },
    });
    
    await this.prisma.audioAccess.deleteMany({
      where: { userId: id },
    });
    
    await this.prisma.courseEnrollment.deleteMany({
      where: { userId: id },
    });
    
    return this.prisma.user.delete({
      where: { id },
    });
  }

  async getUserCourses(userId: string) {
    return this.prisma.courseEnrollment.findMany({
      where: { userId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            thumbnail: true,
            price: true,
          },
        },
      },
    });
  }

  async grantVideoAccess(userId: string, videoId: string) {
    return this.prisma.videoAccess.create({
      data: {
        userId,
        videoId,
      },
    });
  }

  async revokeVideoAccess(userId: string, videoId: string) {
    return this.prisma.videoAccess.deleteMany({
      where: {
        userId,
        videoId,
      },
    });
  }

  async assignCourses(userId: string, courseIds: string[]) {
    await this.prisma.courseEnrollment.deleteMany({
      where: { userId },
    });

    const enrollments = courseIds.map(courseId => ({
      userId,
      courseId,
      enrolledAt: new Date(),
    }));

    return this.prisma.courseEnrollment.createMany({
      data: enrollments,
    });
  }

  async getSalesPersons() {
    return this.prisma.user.findMany({
      where: {
        role: 'SALES_PERSON',
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        phone: true,
        email: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: {
        firstName: 'asc',
      },
    });
  }

  async getSalesPersonsByManager(managerId: string) {
    return this.prisma.user.findMany({
      where: {
        role: 'SALES_PERSON',
        isActive: true,
        parentId: managerId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        phone: true,
        email: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: {
        firstName: 'asc',
      },
    });
  }
  async assignSalesPersonToManager(salesPersonId: string, salesManagerId: string) {
    const salesPerson = await this.prisma.user.findUnique({
      where: { id: salesPersonId },
      select: { id: true, role: true, isActive: true },
    });

    if (!salesPerson || salesPerson.role !== 'SALES_PERSON' || !salesPerson.isActive) {
      throw new Error('Sales person not found or invalid');
    }

    const salesManager = await this.prisma.user.findUnique({
      where: { id: salesManagerId },
      select: { id: true, role: true, isActive: true },
    });

    if (!salesManager || salesManager.role !== 'SALES_MANAGER' || !salesManager.isActive) {
      throw new Error('Sales manager not found or invalid');
    }

    const updatedSalesPerson = await this.prisma.user.update({
      where: { id: salesPersonId },
      data: { parentId: salesManagerId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        phone: true,
        email: true,
        role: true,
        isActive: true,
        parentId: true,
        createdAt: true,
      },
    });

    return {
      salesPerson: updatedSalesPerson,
      salesManager: {
        id: salesManager.id,
      },
    };
  }

  async unassignSalesPersonFromManager(salesPersonId: string) {
    const salesPerson = await this.prisma.user.findUnique({
      where: { id: salesPersonId },
      select: { id: true, role: true, isActive: true },
    });

    if (!salesPerson || salesPerson.role !== 'SALES_PERSON' || !salesPerson.isActive) {
      throw new Error('Sales person not found or invalid');
    }

    const updatedSalesPerson = await this.prisma.user.update({
      where: { id: salesPersonId },
      data: { parentId: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        phone: true,
        email: true,
        role: true,
        isActive: true,
        parentId: true,
        createdAt: true,
      },
    });

    return updatedSalesPerson;
  }

  async getSalesManagers() {
    return this.prisma.user.findMany({
      where: {
        role: 'SALES_MANAGER',
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        phone: true,
        email: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: {
        firstName: 'asc',
      },
    });
  }
}
