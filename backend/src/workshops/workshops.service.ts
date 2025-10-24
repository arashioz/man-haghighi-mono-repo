import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateWorkshopDto, UpdateWorkshopDto } from './dto/workshop.dto';

@Injectable()
export class WorkshopsService {
  constructor(private prisma: PrismaService) {}

  async create(createWorkshopDto: CreateWorkshopDto) {
    return this.prisma.workshop.create({
      data: createWorkshopDto,
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
        participants: {
          include: {
            creator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
              },
            },
          },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.workshop.findMany({
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
        participants: {
          include: {
            creator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
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

  async findActive() {
    return this.prisma.workshop.findMany({
      where: {
        isActive: true,
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
        participants: {
          include: {
            creator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
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
    const workshop = await this.prisma.workshop.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
        participants: {
          include: {
            creator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
              },
            },
          },
        },
      },
    });

    if (!workshop) {
      throw new NotFoundException('Workshop not found');
    }

    return workshop;
  }

  async update(id: string, updateWorkshopDto: UpdateWorkshopDto) {
    const workshop = await this.findOne(id);
    
    return this.prisma.workshop.update({
      where: { id },
      data: updateWorkshopDto,
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
        participants: {
          include: {
            creator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
              },
            },
          },
        },
      },
    });
  }

  async remove(id: string) {
    const workshop = await this.findOne(id);
    
    return this.prisma.workshop.delete({
      where: { id },
    });
  }

  async getUserWorkshops(userId: string) {
    const participants = await this.prisma.workshopParticipant.findMany({
      where: { createdBy: userId },
      include: {
        workshop: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return participants.map(participant => participant.workshop);
  }

  async getParticipants(workshopId: string) {
    const workshop = await this.findOne(workshopId);
    
    return this.prisma.workshopParticipant.findMany({
      where: { workshopId },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async addParticipant(workshopId: string, participantData: any) {
    const workshop = await this.findOne(workshopId);
    
    return this.prisma.workshopParticipant.create({
      data: {
        ...participantData,
        workshopId,
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
      },
    });
  }

  async updateParticipant(workshopId: string, participantId: string, participantData: any) {
    const participant = await this.prisma.workshopParticipant.findFirst({
      where: {
        id: participantId,
        workshopId,
      },
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    return this.prisma.workshopParticipant.update({
      where: { id: participantId },
      data: participantData,
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
      },
    });
  }

  async deleteParticipant(workshopId: string, participantId: string) {
    const participant = await this.prisma.workshopParticipant.findFirst({
      where: {
        id: participantId,
        workshopId,
      },
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    return this.prisma.workshopParticipant.delete({
      where: { id: participantId },
    });
  }

  async getSalesPersonAccessibleWorkshops(salesPersonId: string) {
    return this.prisma.workshop.findMany({
      where: {
        isActive: true,
        salesPersonAccess: {
          some: {
            salesPersonId,
            isActive: true,
          },
        },
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
        participants: {
          include: {
            creator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
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

  async grantSalesPersonAccess(workshopId: string, salesPersonId: string, grantedBy: string) {
    const workshop = await this.findOne(workshopId);
    
    return this.prisma.salesPersonWorkshopAccess.upsert({
      where: {
        salesPersonId_workshopId: {
          salesPersonId,
          workshopId,
        },
      },
      update: {
        isActive: true,
        grantedBy,
      },
      create: {
        salesPersonId,
        workshopId,
        grantedBy,
        isActive: true,
      },
      include: {
        salesPerson: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
        granter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
      },
    });
  }

  async revokeSalesPersonAccess(workshopId: string, salesPersonId: string) {
    const access = await this.prisma.salesPersonWorkshopAccess.findFirst({
      where: {
        workshopId,
        salesPersonId,
      },
    });

    if (!access) {
      throw new NotFoundException('Access not found');
    }

    return this.prisma.salesPersonWorkshopAccess.update({
      where: { id: access.id },
      data: { isActive: false },
    });
  }

  async getWorkshopSalesPersonAccess(workshopId: string) {
    const workshop = await this.findOne(workshopId);
    
    return this.prisma.salesPersonWorkshopAccess.findMany({
      where: { workshopId },
      include: {
        salesPerson: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
        granter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getSalesManagerWorkshops(salesManagerId: string) {
    return this.prisma.workshop.findMany({
      where: {
        creator: {
          id: salesManagerId,
        },
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
        participants: {
          include: {
            creator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
              },
            },
          },
        },
        salesPersonAccess: {
          include: {
            salesPerson: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
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
}
