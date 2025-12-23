import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateUserDto, UpdateUserDto, PaginationQueryDto, ExportUsersQueryDto } from './dto/user.dto';
import * as bcrypt from 'bcryptjs';
import { normalizePhone } from '../common/utils/phone.utils';
import { Prisma, UserRole } from '@prisma/client';
import * as XLSX from 'xlsx';
import { UrlService } from '../common/services/url.service';

const baseUserSelect = {
  id: true,
  email: true,
  phone: true,
  username: true,
  firstName: true,
  lastName: true,
  avatar: true,
  role: true,
  isActive: true,
  isOld: true,
  isBlocked: true,
  blockedUntil: true,
  rateLimitViolations: true,
  lastRateLimitViolation: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private readonly urlService: UrlService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const {
      email,
      phone,
      password,
      confirmPassword,
      firstName,
      lastName,
      avatar,
      role,
      isActive,
      isOld,
    } = createUserDto;

    const normalizedEmail = email ? email.trim().toLowerCase() : null;
    const normalizedPhone = phone ? normalizePhone(phone) : null;

    if (phone && !normalizedPhone) {
      throw new ConflictException('Invalid phone number format');
    }

    if (role === 'ADMIN' && !normalizedEmail) {
      throw new ConflictException('Admin users must have an email');
    }
    if (role !== 'ADMIN' && !normalizedPhone) {
      throw new ConflictException('Non-admin users must have a phone number');
    }

    // Password validation for USER role
    const userRole = (role ?? 'USER') as UserRole;
    if (userRole === 'USER') {
      if (!password) {
        throw new ConflictException('Password is required for regular users');
      }
      if (!confirmPassword) {
        throw new ConflictException('Confirm password is required');
      }
      if (password !== confirmPassword) {
        throw new ConflictException('Password and confirm password do not match');
      }
    }

    // Generate username from firstName + lastName
    let username = '';
    if (firstName && lastName) {
      username = `${firstName.trim()} ${lastName.trim()}`.trim();
    } else if (firstName) {
      username = firstName.trim();
    } else if (lastName) {
      username = lastName.trim();
    } else {
      // Fallback: use phone or email if names are not provided
      username = normalizedPhone || normalizedEmail || 'User';
    }

    // Check for unique username (in case of duplicates, add a number)
    let finalUsername = username;
    let usernameCounter = 1;
    while (true) {
      const existingUsername = await this.prisma.user.findFirst({
        where: {
          username: {
            equals: finalUsername,
            mode: Prisma.QueryMode.insensitive,
          },
        },
      });
      
      if (!existingUsername) {
        break;
      }
      
      finalUsername = `${username} ${usernameCounter}`;
      usernameCounter++;
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          ...(normalizedEmail ? [
            {
              email: {
                equals: normalizedEmail,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          ] : []),
          ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException('User with this email or phone already exists');
    }

    const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;

    const userData: Prisma.UserCreateInput = {
      email: normalizedEmail,
      phone: normalizedPhone,
      username: finalUsername,
      firstName,
      lastName,
      avatar,
      role: userRole,
      isActive: isActive ?? true,
      isOld,
    } as any;

    if (hashedPassword) {
      userData.password = hashedPassword;
    }

    const user = await this.prisma.user.create({
      data: userData,
      select: baseUserSelect,
    });

    return user;
  }

  async findAll(paginationQuery: PaginationQueryDto) {
    const { page = 1, limit = 10, search = '', role } = paginationQuery;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    // Search filter
    if (search && search.trim()) {
      where.OR = [
        { firstName: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { lastName: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { username: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { phone: { contains: search } },
        { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
      ];
    }

    // Role filter
    if (role) {
      where.role = role;
    }

    // Get total count
    const total = await this.prisma.user.count({ where });

    // Get paginated users
    const users = await this.prisma.user.findMany({
      where,
      select: baseUserSelect,
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: baseUserSelect,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  // Get user with their old products and purchased courses
  async getUserWithProducts(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...baseUserSelect,
        oldProducts: {
          select: {
            id: true,
            productId: true,
            productName: true,
            productCategory: true,
            importedAt: true,
          },
        },
        purchasedCourses: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                description: true,
                thumbnail: true,
                price: true,
                published: true,
                attachments: true,
                videos: {
                  select: {
                    id: true,
                    title: true,
                    description: true,
                    thumbnail: true,
                    duration: true,
                    order: true,
                    published: true,
                  },
                  orderBy: {
                    order: 'asc',
                  },
                },
              },
            },
          },
          orderBy: {
            enrolledAt: 'desc',
          },
        },
      } as any,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  // Assign a single course to user
  async assignCourse(userId: string, courseId: string) {
    // Check if user exists
    await this.findOne(userId);

    // Check if course exists
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Use upsert to handle race conditions - if enrollment exists, return it; otherwise create it
    return this.prisma.courseEnrollment.upsert({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
      update: {}, // If exists, just return it without updating
      create: {
        userId,
        courseId,
      },
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

  // Remove course from user
  async removeCourse(userId: string, courseId: string) {
    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (!enrollment) {
      throw new NotFoundException('User is not enrolled in this course');
    }

    return this.prisma.courseEnrollment.delete({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.findOne(id);

    const {
      email,
      phone,
      username,
      firstName,
      lastName,
      avatar,
      isActive,
      isOld,
      role,
      education,
      university,
      job,
      state,
      gender,
      password,
      confirmPassword,
    } = updateUserDto;

    let normalizedEmail: string | null | undefined;
    if (email === undefined) {
      normalizedEmail = undefined;
    } else if (email === null || email.trim() === '') {
      normalizedEmail = null;
    } else {
      normalizedEmail = email.trim().toLowerCase();
    }

    let normalizedPhone: string | null | undefined;
    if (phone === undefined) {
      normalizedPhone = undefined;
    } else if (phone === null || phone.trim() === '') {
      normalizedPhone = null;
    } else {
      normalizedPhone = normalizePhone(phone);
      if (!normalizedPhone) {
        throw new ConflictException('Invalid phone number format');
      }
    }

    if (normalizedEmail) {
      const emailConflict = await this.prisma.user.findFirst({
        where: {
          email: normalizedEmail,
          NOT: { id },
        },
      });
      if (emailConflict) {
        throw new ConflictException('Email is already in use');
      }
    }

    if (normalizedPhone) {
      const phoneConflict = await this.prisma.user.findFirst({
        where: {
          phone: normalizedPhone,
          NOT: { id },
        },
      });
      if (phoneConflict) {
        throw new ConflictException('Phone number is already in use');
      }
    }

    if (username) {
      const usernameConflict = await this.prisma.user.findFirst({
        where: {
          username: {
            equals: username,
            mode: Prisma.QueryMode.insensitive,
          },
          NOT: { id },
        },
      });
      if (usernameConflict) {
        throw new ConflictException('Username is already in use');
      }
    }

    const coerce = (value?: string | null) => {
      if (value === undefined) {
        return undefined;
      }
      if (value === null) {
        return null;
      }
      const trimmed = value.trim();
      return trimmed === '' ? null : trimmed;
    };

    const updateData: any = {
      ...(normalizedEmail !== undefined ? { email: normalizedEmail } : {}),
      ...(normalizedPhone !== undefined ? { phone: normalizedPhone } : {}),
    };

    if (username !== undefined) {
      updateData.username = username;
    }

    const coercedFirstName = coerce(firstName ?? undefined);
    if (coercedFirstName !== undefined) {
      updateData.firstName = coercedFirstName;
    }

    const coercedLastName = coerce(lastName ?? undefined);
    if (coercedLastName !== undefined) {
      updateData.lastName = coercedLastName;
    }

    const coercedAvatar = coerce(avatar ?? undefined);
    if (coercedAvatar !== undefined) {
      updateData.avatar = coercedAvatar;
    }

    const coercedEducation = coerce(education ?? undefined);
    if (coercedEducation !== undefined) {
      updateData.education = coercedEducation;
    }

    const coercedUniversity = coerce(university ?? undefined);
    if (coercedUniversity !== undefined) {
      updateData.university = coercedUniversity;
    }

    const coercedJob = coerce(job ?? undefined);
    if (coercedJob !== undefined) {
      updateData.job = coercedJob;
    }

    const coercedState = coerce(state ?? undefined);
    if (coercedState !== undefined) {
      updateData.state = coercedState;
    }

    const coercedGender = coerce(gender ?? undefined);
    if (coercedGender !== undefined) {
      updateData.gender = coercedGender;
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    if (isOld !== undefined) {
      updateData.isOld = isOld;
    }

    if (role !== undefined) {
      // Prevent changing role to/from ADMIN
      const currentUser = await this.prisma.user.findUnique({
        where: { id },
        select: { role: true },
      });
      
      if (currentUser) {
        const newRole = role as UserRole;
        // Prevent changing to ADMIN or from ADMIN
        if (currentUser.role === 'ADMIN' || newRole === 'ADMIN') {
          throw new ConflictException('Cannot change ADMIN role');
        }
        updateData.role = newRole;
      } else {
        updateData.role = role as UserRole;
      }
    }

    // Handle password change
    if (password) {
      if (!confirmPassword) {
        throw new ConflictException('Confirm password is required when changing password');
      }
      if (password !== confirmPassword) {
        throw new ConflictException('Password and confirm password do not match');
      }
      
      const saltRounds = process.env.NODE_ENV === 'production' ? 12 : 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      updateData.password = hashedPassword;
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: baseUserSelect,
    });
  }

  async remove(id: string) {
    const user = await this.findOne(id);
    
    // حذف تیم‌های فروش مربوط به مدیر فروش
    if (user.role === 'SALES_MANAGER') {
      try {
        await (this.prisma as any).salesTeam?.deleteMany({
          where: { managerId: id },
        });
      } catch (error) {
        // Ignore if salesTeam model doesn't exist
      }
    }
    
    // حذف عضویت‌های تیم و دسترسی‌های کارشناس فروش
    if (user.role === 'SALES_PERSON') {
      try {
        await (this.prisma as any).salesTeamMember?.deleteMany({
          where: { salesPersonId: id },
        });
      } catch (error) {
        // Ignore if salesTeamMember model doesn't exist
      }
      
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
    
    // حذف دسترسی‌های ویدیو و صوت
    await this.prisma.videoAccess.deleteMany({
      where: { userId: id },
    });
    
    await this.prisma.audioAccess.deleteMany({
      where: { userId: id },
    });
    
    // حذف ثبت نام‌های دوره
    await this.prisma.courseEnrollment.deleteMany({
      where: { userId: id },
    });
    
    // حذف کاربر
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
    // Remove duplicates from courseIds array
    const uniqueCourseIds = [...new Set(courseIds)];

    // Delete existing enrollments for this user
    await this.prisma.courseEnrollment.deleteMany({
      where: { userId },
    });

    // Create enrollments with skipDuplicates to handle any race conditions
    const enrollments = uniqueCourseIds.map(courseId => ({
      userId,
      courseId,
      enrolledAt: new Date(),
    }));

    return this.prisma.courseEnrollment.createMany({
      data: enrollments,
      skipDuplicates: true, // Skip if duplicate key constraint is violated
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

  async blockUser(id: string) {
    await this.findOne(id);
    
    const blockedUntil = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
    
    return this.prisma.user.update({
      where: { id },
      data: {
        isBlocked: true,
        blockedUntil,
        rateLimitViolations: { increment: 1 },
        lastRateLimitViolation: new Date(),
      },
      select: baseUserSelect,
    });
  }

  async unblockUser(id: string) {
    await this.findOne(id);
    
    return this.prisma.user.update({
      where: { id },
      data: {
        isBlocked: false,
        blockedUntil: null,
        rateLimitViolations: 0,
      },
      select: baseUserSelect,
    });
  }

  private buildUserExportWhere(filters: ExportUsersQueryDto): Prisma.UserWhereInput {
    const { userType, startDate, endDate, role } = filters;
    const where: Prisma.UserWhereInput = {};

    if (role) {
      where.role = role as UserRole;
    }

    if (userType === 'old') {
      where.isOld = true;
    } else if (userType === 'new') {
      where.isOld = false;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    return where;
  }

  async exportUsersWithCourses(filters: ExportUsersQueryDto) {
    const where = this.buildUserExportWhere(filters);

    const users = await this.prisma.user.findMany({
      where,
      include: {
        purchasedCourses: {
          include: {
            course: {
              include: {
                videos: {
                  orderBy: { order: 'asc' },
                },
                audios: {
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
          orderBy: { enrolledAt: 'desc' },
        },
        videoAccess: {
          select: { videoId: true },
        },
        audioAccess: {
          select: { audioId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      isOld: user.isOld,
      isBlocked: user.isBlocked,
      education: user.education,
      university: user.university,
      job: user.job,
      state: user.state,
      gender: user.gender,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      purchasedCourses: user.purchasedCourses.map((enrollment) => ({
        id: enrollment.id,
        enrolledAt: enrollment.enrolledAt,
        course: this.urlService.processCourseData(enrollment.course),
      })),
      videoAccessIds: user.videoAccess.map((access) => access.videoId),
      audioAccessIds: user.audioAccess.map((access) => access.audioId),
    }));
  }

  async exportSingleUserWithCourses(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        purchasedCourses: {
          include: {
            course: {
              include: {
                videos: {
                  orderBy: { order: 'asc' },
                },
                audios: {
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
          orderBy: { enrolledAt: 'desc' },
        },
        videoAccess: { select: { videoId: true } },
        audioAccess: { select: { audioId: true } },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      isOld: user.isOld,
      isBlocked: user.isBlocked,
      education: user.education,
      university: user.university,
      job: user.job,
      state: user.state,
      gender: user.gender,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      purchasedCourses: user.purchasedCourses.map((enrollment) => ({
        id: enrollment.id,
        enrolledAt: enrollment.enrolledAt,
        course: this.urlService.processCourseData(enrollment.course),
      })),
      videoAccessIds: user.videoAccess.map((access) => access.videoId),
      audioAccessIds: user.audioAccess.map((access) => access.audioId),
    };
  }

  async exportUsers(filters: ExportUsersQueryDto) {
    const where = this.buildUserExportWhere(filters);

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        isOld: true,
        isBlocked: true,
        education: true,
        university: true,
        job: true,
        state: true,
        gender: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            purchasedCourses: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Prepare data for Excel
    const excelData = users.map((user, index) => ({
      'ردیف': index + 1,
      'شناسه': user.id,
      'نام کاربری': user.username,
      'نام': user.firstName || '',
      'نام خانوادگی': user.lastName || '',
      'ایمیل': user.email || '',
      'موبایل': user.phone || '',
      'نقش': this.getRoleLabel(user.role),
      'وضعیت': user.isActive ? 'فعال' : 'غیرفعال',
      'نوع کاربر': user.isOld ? 'قدیمی' : 'جدید',
      'مسدود شده': user.isBlocked ? 'بله' : 'خیر',
      'تحصیلات': user.education || '',
      'دانشگاه': user.university || '',
      'شغل': user.job || '',
      'استان': user.state || '',
      'جنسیت': user.gender || '',
      'تعداد دوره‌ها': user._count.purchasedCourses,
      'تاریخ ثبت‌نام': user.createdAt ? new Date(user.createdAt).toLocaleDateString('fa-IR') : '',
      'تاریخ به‌روزرسانی': user.updatedAt ? new Date(user.updatedAt).toLocaleDateString('fa-IR') : '',
    }));

    // Create workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const columnWidths = [
      { wch: 5 },   // ردیف
      { wch: 30 },  // شناسه
      { wch: 20 },  // نام کاربری
      { wch: 15 },  // نام
      { wch: 20 },  // نام خانوادگی
      { wch: 25 },  // ایمیل
      { wch: 15 },  // موبایل
      { wch: 15 },  // نقش
      { wch: 10 },  // وضعیت
      { wch: 10 },  // نوع کاربر
      { wch: 10 },  // مسدود شده
      { wch: 15 },  // تحصیلات
      { wch: 20 },  // دانشگاه
      { wch: 20 },  // شغل
      { wch: 15 },  // استان
      { wch: 10 },  // جنسیت
      { wch: 12 },  // تعداد دوره‌ها
      { wch: 15 },  // تاریخ ثبت‌نام
      { wch: 15 },  // تاریخ به‌روزرسانی
    ];
    worksheet['!cols'] = columnWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'کاربران');

    // Generate Excel buffer
    const excelBuffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx',
      cellStyles: true,
    });

    return excelBuffer;
  }

  private getRoleLabel(role: UserRole): string {
    const roleLabels: Record<UserRole, string> = {
      ADMIN: 'مدیر',
      SALES_MANAGER: 'مدیر فروش',
      SALES_PERSON: 'فروشنده',
      USER: 'کاربر',
    };
    return roleLabels[role] || role;
  }
}
