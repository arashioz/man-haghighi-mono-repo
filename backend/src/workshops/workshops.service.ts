import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateWorkshopDto, UpdateWorkshopDto, CreateWorkshopParticipantDto, WorkshopPaymentDto, CompleteWorkshopPaymentDto } from './dto/workshop.dto';
import { UrlService } from '../common/services/url.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class WorkshopsService {
  constructor(
    private prisma: PrismaService,
    private urlService: UrlService,
  ) {}

  async create(createWorkshopDto: CreateWorkshopDto, files?: { thumbnail?: Express.Multer.File[] }) {
    const thumbnailUrl = files?.thumbnail?.[0] 
      ? this.urlService.getFileUrl(files.thumbnail[0].filename)
      : createWorkshopDto.thumbnail;

    const data = {
      ...createWorkshopDto,
      thumbnail: thumbnailUrl,
    };

    const workshop = await this.prisma.workshop.create({
      data,
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

    return {
      ...workshop,
      thumbnail: workshop.thumbnail ? this.urlService.getFileUrl(workshop.thumbnail) : null,
    };
  }

  async findAll() {
    const workshops = await this.prisma.workshop.findMany({
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
    
    return workshops.map(workshop => ({
      ...workshop,
      thumbnail: workshop.thumbnail ? this.urlService.getFileUrl(workshop.thumbnail) : null,
    }));
  }

  async findActive() {
    const workshops = await this.prisma.workshop.findMany({
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
    
    return workshops.map(workshop => ({
      ...workshop,
      thumbnail: workshop.thumbnail ? this.urlService.getFileUrl(workshop.thumbnail) : null,
    }));
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

    return {
      ...workshop,
      thumbnail: workshop.thumbnail ? this.urlService.getFileUrl(workshop.thumbnail) : null,
    };
  }

  async update(id: string, updateWorkshopDto: UpdateWorkshopDto, files?: { thumbnail?: Express.Multer.File[] }) {
    await this.findOne(id);
    
    const thumbnailUrl = files?.thumbnail?.[0] 
      ? this.urlService.getFileUrl(files.thumbnail[0].filename)
      : updateWorkshopDto.thumbnail;

    const data = {
      ...updateWorkshopDto,
      ...(thumbnailUrl !== undefined && { thumbnail: thumbnailUrl }),
    };

    const updatedWorkshop = await this.prisma.workshop.update({
      where: { id },
      data,
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

    return {
      ...updatedWorkshop,
      thumbnail: updatedWorkshop.thumbnail ? this.urlService.getFileUrl(updatedWorkshop.thumbnail) : null,
    };
  }

  async remove(id: string) {
    const workshop = await this.findOne(id);
    
    return this.prisma.workshop.delete({
      where: { id },
    });
  }

  async uploadVideos(id: string, files: Express.Multer.File[]) {
    const workshop = await this.findOne(id) as any;
    
    const existingVideos = workshop.videoLinks || [];
    const newVideoLinks = files.map(file => this.urlService.getFileUrl(file.filename));
    const allVideoLinks = [...existingVideos, ...newVideoLinks.filter(Boolean) as string[]];
    
    const updatedWorkshop = await this.prisma.workshop.update({
      where: { id },
      data: { videoLinks: allVideoLinks } as any,
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

    return updatedWorkshop;
  }

  async uploadAudios(id: string, files: Express.Multer.File[]) {
    const workshop = await this.findOne(id) as any;
    
    const existingAudios = workshop.audioLinks || [];
    const newAudioLinks = files.map(file => this.urlService.getFileUrl(file.filename));
    const allAudioLinks = [...existingAudios, ...newAudioLinks.filter(Boolean) as string[]];
    
    const updatedWorkshop = await this.prisma.workshop.update({
      where: { id },
      data: { audioLinks: allAudioLinks } as any,
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

    return updatedWorkshop;
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

  async addParticipant(workshopId: string, participantData: CreateWorkshopParticipantDto, userId: string) {
    const workshop = await this.findOne(workshopId);

    // Create participant with initial payment
    const participant = await this.prisma.workshopParticipant.create({
      data: {
        workshopId,
        customerName: participantData.customerName,
        customerPhone: participantData.customerPhone,
        totalAmount: workshop.price, // Workshop full price
        paidAmount: new Decimal(0), // Will be updated after payment
        createdBy: userId,
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
        workshop: true,
      },
    });

    // If there's an initial payment, create the payment record
    if (participantData.initialPaymentAmount > 0) {
      await this.addParticipantPayment(participant.id, {
        amount: participantData.initialPaymentAmount,
        paymentMethod: 'PAYMENT_LINK',
        notes: participantData.notes || 'پرداخت اولیه کارگاه',
      }, userId);
    }

    return participant;
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

  async getAllWorkshopAccess(workshopId: string) {
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
            phone: true,
            isActive: true,
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

  async getAvailableSalesPersonsForWorkshop(workshopId: string) {
    // فروشنده‌هایی که هنوز به این کارگاه دسترسی ندارند یا دسترسی غیرفعال دارند
    const existingAccess = await this.prisma.salesPersonWorkshopAccess.findMany({
      where: {
        workshopId,
        isActive: true, // فقط دسترسی‌های فعال را در نظر بگیر
      },
      select: { salesPersonId: true },
    });

    const excludedIds = existingAccess.map(access => access.salesPersonId);

    return this.prisma.user.findMany({
      where: {
        role: 'SALES_PERSON',
        // فروشنده‌های غیرفعال را هم شامل شود تا بتوان دوباره اضافه کرد
        id: {
          notIn: excludedIds,
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        phone: true,
        isActive: true,
      },
      orderBy: {
        firstName: 'asc',
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

  async addParticipantPayment(participantId: string, paymentData: WorkshopPaymentDto, userId: string) {
    const participant = await this.prisma.workshopParticipant.findUnique({
      where: { id: participantId },
      include: { workshop: true },
    });

    if (!participant) {
      throw new NotFoundException('شرکت‌کننده یافت نشد');
    }

    // Check if payment exceeds remaining amount
    const remainingAmount = participant.totalAmount.minus(participant.paidAmount);
    if (paymentData.amount > Number(remainingAmount)) {
      throw new BadRequestException(`مبلغ پرداخت نمی‌تواند بیشتر از ${remainingAmount} تومان باشد`);
    }

    // Create payment record
    const payment = await this.prisma.workshopPayment.create({
      data: {
        participantId,
        amount: new Decimal(paymentData.amount),
        paymentMethod: paymentData.paymentMethod || 'PAYMENT_LINK',
        status: 'PENDING', // Will be updated when payment is confirmed
        notes: paymentData.notes,
      },
    });

    return payment;
  }

  async completeWorkshopPayment(participantId: string, paymentData: CompleteWorkshopPaymentDto, userId: string) {
    const participant = await this.prisma.workshopParticipant.findUnique({
      where: { id: participantId },
      include: { workshop: true, payments: true },
    });

    if (!participant) {
      throw new NotFoundException('شرکت‌کننده یافت نشد');
    }

    const remainingAmount = participant.totalAmount.minus(participant.paidAmount);
    if (paymentData.amount !== Number(remainingAmount)) {
      throw new BadRequestException(`مبلغ باید دقیقاً ${remainingAmount} تومان باشد`);
    }

    // Create final payment
    const payment = await this.prisma.workshopPayment.create({
      data: {
        participantId,
        amount: new Decimal(paymentData.amount),
        paymentMethod: paymentData.paymentMethod || 'PAYMENT_LINK',
        status: 'PAID',
        paymentDate: new Date(),
      },
    });

    // Update participant status
    await this.prisma.workshopParticipant.update({
      where: { id: participantId },
      data: {
        paidAmount: participant.totalAmount,
        paymentStatus: 'PAID',
      },
    });

    return {
      participant: await this.prisma.workshopParticipant.findUnique({
        where: { id: participantId },
        include: { workshop: true, payments: true },
      }),
      finalPayment: payment,
    };
  }

  async getParticipantPayments(participantId: string) {
    const participant = await this.prisma.workshopParticipant.findUnique({
      where: { id: participantId },
      include: {
        workshop: true,
        payments: {
          orderBy: { createdAt: 'desc' },
        },
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

    if (!participant) {
      throw new NotFoundException('شرکت‌کننده یافت نشد');
    }

    return {
      participant: {
        ...participant,
        totalAmount: Number(participant.totalAmount),
        paidAmount: Number(participant.paidAmount),
        remainingAmount: Number(participant.totalAmount.minus(participant.paidAmount)),
      },
      payments: participant.payments.map(payment => ({
        ...payment,
        amount: Number(payment.amount),
      })),
    };
  }
}
