import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateSalesTeamDto, UpdateSalesTeamDto, AddTeamMemberDto, RemoveTeamMemberDto } from './dto/sales-team.dto';

@Injectable()
export class SalesTeamsService {
  constructor(private prisma: PrismaService) {}

  async create(createSalesTeamDto: CreateSalesTeamDto) {
    const { name, managerId, description, isActive = true, salesPersonIds = [] } = createSalesTeamDto;

    const manager = await this.prisma.user.findUnique({
      where: { id: managerId },
      select: { id: true, role: true, isActive: true, firstName: true, lastName: true },
    });

    if (!manager || manager.role !== 'SALES_MANAGER' || !manager.isActive) {
      throw new BadRequestException('مدیر فروش معتبر نیست');
    }

    if (salesPersonIds.length > 0) {
      const salesPersons = await this.prisma.user.findMany({
        where: {
          id: { in: salesPersonIds },
          role: 'SALES_PERSON',
          isActive: true,
        },
        select: { id: true },
      });

      if (salesPersons.length !== salesPersonIds.length) {
        throw new BadRequestException('برخی از فروشندگان معتبر نیستند');
      }

      const existingMembers = await this.prisma.salesTeamMember.findMany({
        where: {
          salesPersonId: { in: salesPersonIds },
          isActive: true,
        },
        select: { salesPersonId: true },
      });

      if (existingMembers.length > 0) {
        throw new ConflictException('برخی از فروشندگان قبلاً در تیم دیگری هستند');
      }
    }

    const team = await this.prisma.salesTeam.create({
      data: {
        name,
        managerId,
        description,
        isActive,
        members: {
          create: salesPersonIds.map(salesPersonId => ({
            salesPersonId,
            isActive: true,
          })),
        },
      },
      include: {
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
        members: {
          where: { isActive: true },
          include: {
            salesPerson: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    return team;
  }

  async findAll() {
    return this.prisma.salesTeam.findMany({
      include: {
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
        members: {
          where: { isActive: true },
          include: {
            salesPerson: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const team = await this.prisma.salesTeam.findUnique({
      where: { id },
      include: {
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
        members: {
          where: { isActive: true },
          include: {
            salesPerson: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!team) {
      throw new NotFoundException('تیم فروش یافت نشد');
    }

    return team;
  }

  async update(id: string, updateSalesTeamDto: UpdateSalesTeamDto) {
    const team = await this.findOne(id);
    
    const { managerId, ...updateData } = updateSalesTeamDto;

    if (managerId && managerId !== team.managerId) {
      const manager = await this.prisma.user.findUnique({
        where: { id: managerId },
        select: { id: true, role: true, isActive: true },
      });

      if (!manager || manager.role !== 'SALES_MANAGER' || !manager.isActive) {
        throw new BadRequestException('مدیر فروش معتبر نیست');
      }
    }

    return this.prisma.salesTeam.update({
      where: { id },
      data: {
        ...updateData,
        ...(managerId && { managerId }),
      },
      include: {
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
        members: {
          where: { isActive: true },
          include: {
            salesPerson: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
                phone: true,
              },
            },
          },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    
    return this.prisma.salesTeam.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async addMember(teamId: string, addTeamMemberDto: AddTeamMemberDto) {
    const { salesPersonId } = addTeamMemberDto;

    await this.findOne(teamId);

    const salesPerson = await this.prisma.user.findUnique({
      where: { id: salesPersonId },
      select: { id: true, role: true, isActive: true, firstName: true, lastName: true },
    });

    if (!salesPerson || salesPerson.role !== 'SALES_PERSON' || !salesPerson.isActive) {
      throw new BadRequestException('فروشنده معتبر نیست');
    }

    const existingMember = await this.prisma.salesTeamMember.findFirst({
      where: {
        salesPersonId,
        isActive: true,
      },
    });

    if (existingMember) {
      throw new ConflictException('این فروشنده قبلاً در تیم دیگری است');
    }

    return this.prisma.salesTeamMember.create({
      data: {
        teamId,
        salesPersonId,
        isActive: true,
      },
      include: {
        salesPerson: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            phone: true,
          },
        },
      },
    });
  }

  async removeMember(teamId: string, removeTeamMemberDto: RemoveTeamMemberDto) {
    const { salesPersonId } = removeTeamMemberDto;

    await this.findOne(teamId);

    const member = await this.prisma.salesTeamMember.findFirst({
      where: {
        teamId,
        salesPersonId,
        isActive: true,
      },
    });

    if (!member) {
      throw new NotFoundException('عضو تیم یافت نشد');
    }

    return this.prisma.salesTeamMember.update({
      where: { id: member.id },
      data: { isActive: false },
    });
  }

  async getAvailableSalesPersons() {
    const salesPersonsInTeams = await this.prisma.salesTeamMember.findMany({
      where: { isActive: true },
      select: { salesPersonId: true },
    });

    const salesPersonIdsInTeams = salesPersonsInTeams.map(member => member.salesPersonId);

    return this.prisma.user.findMany({
      where: {
        role: 'SALES_PERSON',
        isActive: true,
        id: {
          notIn: salesPersonIdsInTeams,
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        phone: true,
        email: true,
      },
      orderBy: {
        firstName: 'asc',
      },
    });
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
      },
      orderBy: {
        firstName: 'asc',
      },
    });
  }
}
