import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
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
      isForeign,
    } = createUserDto;

    const normalizedEmail = email ? email.trim().toLowerCase() : null;
    const normalizedPhone = phone ? normalizePhone(phone) : null;

    if (phone && !normalizedPhone) {
      throw new ConflictException('Invalid phone number format');
    }

    if (role === 'ADMIN' && !normalizedEmail) {
      throw new ConflictException('Admin users must have an email');
    }
    if (isForeign) {
      if (!normalizedEmail) {
        throw new ConflictException('کاربر خارجی باید ایمیل داشته باشد');
      }
    } else if (role !== 'ADMIN' && !normalizedPhone) {
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

    // Build desired username: برای کاربر خارجی از ایمیل استفاده می‌کنیم تا با ایمیل وارد شود
    let desiredUsername = '';
    if (isForeign && normalizedEmail) {
      desiredUsername = normalizedEmail;
    } else if (firstName && lastName) {
      desiredUsername = `${firstName.trim()} ${lastName.trim()}`.trim();
    } else if (firstName) {
      desiredUsername = firstName.trim();
    } else if (lastName) {
      desiredUsername = lastName.trim();
    } else {
      desiredUsername = normalizedPhone || normalizedEmail || 'User';
    }

    const findUniqueUsername = async (candidate: string, excludeUserId?: string) => {
      let final = candidate;
      let counter = 1;

      while (true) {
        const existingUsername = await this.prisma.user.findFirst({
          where: {
            username: {
              equals: final,
              mode: Prisma.QueryMode.insensitive,
            },
            ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}),
          },
        });

        if (!existingUsername) {
          return final;
        }

        final = `${candidate} ${counter}`;
        counter++;
      }
    };

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

    const finalUsername = await findUniqueUsername(desiredUsername, existingUser?.id);

    if (existingUser) {
      if (existingUser.isOld) {
        // Reuse and refresh imported (isOld) users instead of blocking creation
        return this.update(existingUser.id, {
          email: normalizedEmail ?? undefined,
          phone: normalizedPhone ?? undefined,
          firstName,
          lastName,
          avatar,
          role: userRole,
          isActive: isActive ?? true,
          isOld: isOld ?? false,
          isForeign: isForeign ?? false,
          username: finalUsername,
          ...(password ? { password, confirmPassword } : {}),
        });
      }

      const conflictReason = normalizedPhone && existingUser.phone === normalizedPhone
        ? 'User with this phone already exists'
        : 'User with this email already exists';
      throw new ConflictException(conflictReason);
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
      isForeign: isForeign ?? false,
    } as any;

    if (hashedPassword) {
      userData.password = hashedPassword;
    }

    try {
      const user = await this.prisma.user.create({
        data: userData,
        select: baseUserSelect,
      });
      return user;
    } catch (error: any) {
      if (error?.code === 'P2002') {
        const target = Array.isArray(error?.meta?.target) ? error.meta.target : [];
        if (target.includes('user_phone') || target.includes('phone')) {
          throw new ConflictException('User with this phone number already exists');
        }
        if (target.includes('email')) {
          throw new ConflictException('User with this email already exists');
        }
        throw new ConflictException('User with this unique field already exists');
      }
      throw error;
    }
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
      select: {
        ...baseUserSelect,
        _count: {
          select: {
            purchasedCourses: true,
            oldProducts: true,
          },
        },
      },
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

  async findByPhone(phone: string) {
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return null;
    }

    return this.prisma.user.findUnique({
      where: { phone: normalizedPhone },
      select: baseUserSelect,
    });
  }

  /** همان select دوره برای استفاده در purchasedCourses و دوره‌های تطبیق‌داده‌شده از محصولات قدیمی */
  private courseSelectForUserProducts = {
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
      orderBy: { order: 'asc' as const },
    },
    audios: {
      select: {
        id: true,
        title: true,
        description: true,
        thumbnail: true,
        audioFile: true,
        duration: true,
        order: true,
        published: true,
      },
      orderBy: { order: 'asc' as const },
    },
  } as const;

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
              select: this.courseSelectForUserProducts,
            },
          },
          orderBy: {
            enrolledAt: 'desc',
          },
        },
        videoAccess: {
          select: {
            id: true,
            videoId: true,
            video: {
              select: {
                id: true,
                title: true,
                courseId: true,
              },
            },
          },
        },
        audioAccess: {
          select: {
            id: true,
            audioId: true,
            audio: {
              select: {
                id: true,
                title: true,
                courseId: true,
              },
            },
          },
        },
      } as any,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const enrolledCourseIds = (user.purchasedCourses as any[]).map((e) => e.course.id);
    const matchedCourseIds = new Set<string>();

    for (const op of (user.oldProducts as any[])) {
      const name = (op.productName || '').trim();
      if (!name) continue;
      const byTitle = await this.prisma.course.findFirst({
        where: {
          published: true,
          id: enrolledCourseIds.length ? { notIn: enrolledCourseIds } : undefined,
          title: { contains: name, mode: 'insensitive' },
        },
        select: { id: true },
      });
      if (byTitle && !matchedCourseIds.has(byTitle.id)) matchedCourseIds.add(byTitle.id);
      if (byTitle) continue;
      if (op.productId && !enrolledCourseIds.includes(op.productId)) {
        const byId = await this.prisma.course.findFirst({
          where: { published: true, id: op.productId },
          select: { id: true },
        });
        if (byId) matchedCourseIds.add(byId.id);
      }
    }

    // Find courses from videoAccess and audioAccess
    const courseIdsFromAccess = new Set<string>();
    
    // Get course IDs from video access
    for (const va of (user.videoAccess as any[])) {
      if (va.video?.courseId && !enrolledCourseIds.includes(va.video.courseId)) {
        courseIdsFromAccess.add(va.video.courseId);
      }
    }
    
    // Get course IDs from audio access
    for (const aa of (user.audioAccess as any[])) {
      if (aa.audio?.courseId && !enrolledCourseIds.includes(aa.audio.courseId)) {
        courseIdsFromAccess.add(aa.audio.courseId);
      }
    }

    let matchedCoursesFromOldProducts: any[] = [];
    if (matchedCourseIds.size > 0) {
      const courses = await this.prisma.course.findMany({
        where: { id: { in: [...matchedCourseIds] } },
        select: this.courseSelectForUserProducts,
      });
      matchedCoursesFromOldProducts = courses.map((course) =>
        this.urlService.processCourseData(course),
      );
    }

    // Get courses from video/audio access
    let coursesFromAccess: any[] = [];
    if (courseIdsFromAccess.size > 0) {
      const accessCourses = await this.prisma.course.findMany({
        where: { id: { in: [...courseIdsFromAccess] } },
        select: this.courseSelectForUserProducts,
      });
      coursesFromAccess = accessCourses.map((course) =>
        this.urlService.processCourseData(course),
      );
    }

    return {
      ...user,
      purchasedCourses: (user.purchasedCourses as any[]).map((enrollment) => ({
        ...enrollment,
        course: this.urlService.processCourseData(enrollment.course),
      })),
      matchedCoursesFromOldProducts,
      coursesFromAccess, // Courses from video/audio access
    };
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
      isForeign,
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
      const trimmed = phone.trim();
      // For foreign users allow any phone format; otherwise require Iranian format
      if (isForeign) {
        normalizedPhone = trimmed;
      } else {
        normalizedPhone = normalizePhone(phone);
        if (!normalizedPhone) {
          throw new ConflictException('Invalid phone number format');
        }
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

    if (isForeign !== undefined) {
      updateData.isForeign = isForeign;
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

    // اگر کاربر غیرفعال می‌شود، روابط را پاک کن
    if (isActive === false) {
      await this.deactivateUserRelations(id);
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: baseUserSelect,
    });
  }

  async deactivateUserRelations(id: string) {
    const user = await this.findOne(id);

    // اگر فروشنده است، از تیم‌ها و دسترسی‌های کارگاه حذف شود
    if (user.role === 'SALES_PERSON') {
      // حذف از تیم‌های فروش
      await this.prisma.salesTeamMember.deleteMany({
        where: { salesPersonId: id },
      });

      // حذف دسترسی‌های کارگاه
      await this.prisma.salesPersonWorkshopAccess.deleteMany({
        where: { salesPersonId: id },
      });
    }

    // اگر مدیر فروش است، تیم‌های تحت مدیریت را غیرفعال کن
    if (user.role === 'SALES_MANAGER') {
      // تیم‌های تحت مدیریت این مدیر را غیرفعال کن
      await this.prisma.salesTeam.updateMany({
        where: { managerId: id },
        data: { isActive: false },
      });

      // دسترسی‌های کارگاه داده شده توسط این مدیر را غیرفعال کن
      await this.prisma.salesPersonWorkshopAccess.updateMany({
        where: { grantedBy: id },
        data: { isActive: false },
      });
    }
  }

  async remove(id: string) {
    const user = await this.findOne(id);
    
    // حذف تیم‌های فروش مربوط به مدیر فروش
    if (user.role === 'SALES_MANAGER') {
      // ابتدا تمام تیم‌های تحت مدیریت این مدیر را پیدا می‌کنیم
      const teams = await this.prisma.salesTeam.findMany({
        where: { managerId: id },
        select: { id: true },
      });

      // برای هر تیم، ابتدا اعضای تیم را حذف می‌کنیم
      for (const team of teams) {
        await this.prisma.salesTeamMember.deleteMany({
          where: { teamId: team.id },
        });
      }

      // سپس خود تیم‌ها را حذف می‌کنیم
      await this.prisma.salesTeam.deleteMany({
        where: { managerId: id },
      });

      // تمام فروشنده‌هایی که تحت نظر این مدیر هستند را از انتساب خارج می‌کنیم
      await this.prisma.user.updateMany({
        where: { parentId: id },
        data: { parentId: null },
      });

      // حذف دسترسی‌های کارگاه که توسط این مدیر داده شده
      await this.prisma.salesPersonWorkshopAccess.deleteMany({
        where: { grantedBy: id },
      });
    }
    
    // حذف عضویت‌های تیم و دسترسی‌های کارشناس فروش
    if (user.role === 'SALES_PERSON') {
      await this.prisma.salesTeamMember.deleteMany({
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
    const enrollments = await this.prisma.courseEnrollment.findMany({
      where: { userId },
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
            audios: {
              select: {
                id: true,
                title: true,
                description: true,
                thumbnail: true,
                audioFile: true,
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
    });

    return enrollments.map((enrollment) => ({
      ...enrollment,
      course: this.urlService.processCourseData(enrollment.course),
    }));
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

  async assignCourses(userId: string, courseIds: string[] | undefined | null) {
    // Ensure user exists
    await this.findOne(userId);

    // Normalize: ensure array of strings, filter empty
    const safeIds = Array.isArray(courseIds) ? courseIds : [];
    const uniqueCourseIds = [...new Set(safeIds.map((id) => String(id).trim()).filter(Boolean))];

    // Delete existing enrollments for this user
    await this.prisma.courseEnrollment.deleteMany({
      where: { userId },
    });

    if (uniqueCourseIds.length === 0) {
      return { count: 0 };
    }

    // Create enrollments with skipDuplicates to handle any race conditions
    const enrollments = uniqueCourseIds.map((courseId) => ({
      userId,
      courseId,
      enrolledAt: new Date(),
    }));

    return this.prisma.courseEnrollment.createMany({
      data: enrollments,
      skipDuplicates: true, // Skip if duplicate key constraint is violated
    });
  }

  // Assign ALL courses to a user (Complete Pack)
  async assignAllCourses(userId: string) {
    // Ensure user exists
    await this.findOne(userId);

    // Get all published courses
    const allCourses = await this.prisma.course.findMany({
      where: { published: true },
      select: { id: true, title: true },
    });

    // Get user's current enrollments
    const currentEnrollments = await this.prisma.courseEnrollment.findMany({
      where: { userId },
      select: { courseId: true },
    });
    const enrolledCourseIds = new Set(currentEnrollments.map(e => e.courseId));

    // Find courses not yet enrolled
    const newCourses = allCourses.filter(c => !enrolledCourseIds.has(c.id));

    if (newCourses.length === 0) {
      return {
        assigned: 0,
        total: allCourses.length,
        message: 'کاربر قبلاً به همه دوره‌ها دسترسی دارد',
      };
    }

    // Create enrollments for all new courses
    const enrollments = newCourses.map((course) => ({
      userId,
      courseId: course.id,
      enrolledAt: new Date(),
    }));

    const result = await this.prisma.courseEnrollment.createMany({
      data: enrollments,
      skipDuplicates: true,
    });

    return {
      assigned: result.count,
      total: allCourses.length,
      newCourses: newCourses.map(c => c.title),
      message: `${result.count} دوره جدید به کاربر اختصاص داده شد`,
    };
  }

  async getSalesPersons(includeInactive = false) {
    return this.prisma.user.findMany({
      where: {
        role: 'SALES_PERSON',
        ...(includeInactive ? {} : { isActive: true }),
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

  async getSalesPersonsByManager(managerId: string, includeInactive = false) {
    return this.prisma.user.findMany({
      where: {
        role: 'SALES_PERSON',
        ...(includeInactive ? {} : { isActive: true }),
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

  async promoteUserByPhone(
    phone: string,
    role: 'SALES_MANAGER' | 'SALES_PERSON',
    firstName?: string,
    lastName?: string,
    salesManagerId?: string,
  ) {
    // Validate target role
    if (role !== 'SALES_MANAGER' && role !== 'SALES_PERSON') {
      throw new BadRequestException('نقش معتبر نیست');
    }

    // Normalize phone
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      throw new BadRequestException('شماره موبایل نامعتبر است');
    }

    // If assigning to a manager, validate the manager
    if (role === 'SALES_PERSON' && salesManagerId) {
      const manager = await this.prisma.user.findUnique({
        where: { id: salesManagerId },
        select: { id: true, role: true, isActive: true },
      });

      if (!manager || manager.role !== 'SALES_MANAGER' || !manager.isActive) {
        throw new BadRequestException('مدیر فروش معتبر نیست');
      }
    }

    // Find or create user by phone
    let user = await this.prisma.user.findUnique({
      where: { phone: normalizedPhone },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phone: normalizedPhone,
          username: `user_${normalizedPhone}`,
          firstName: firstName || '',
          lastName: lastName || '',
          role,
          isActive: true,
          parentId: role === 'SALES_PERSON' ? salesManagerId || null : null,
        },
      });
    } else {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          role,
          firstName: typeof firstName !== 'undefined' ? firstName : user.firstName,
          lastName: typeof lastName !== 'undefined' ? lastName : user.lastName,
          parentId: role === 'SALES_PERSON' ? salesManagerId || null : null,
          isActive: true,
        },
      });
    }

    // If promoted to sales manager, ensure no parent assignment
    if (role === 'SALES_MANAGER' && user.parentId) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { parentId: null },
      });
    }

    return user;
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

  // Get seller statistics
  async getSellerStats(sellerId: string) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Total payment links created by seller
    const totalLinksResult = await this.prisma.paymentLink.count({
      where: { createdById: sellerId },
    });

    // Paid payment links
    const paidLinksResult = await this.prisma.paymentLink.count({
      where: {
        createdById: sellerId,
        status: 'PAID',
      },
    });

    // Total revenue from paid links
    const revenueResult = await this.prisma.paymentLink.aggregate({
      where: {
        createdById: sellerId,
        status: 'PAID',
      },
      _sum: {
        amount: true,
      },
    });

    // Today's revenue
    const todayRevenueResult = await this.prisma.paymentLink.aggregate({
      where: {
        createdById: sellerId,
        status: 'PAID',
        createdAt: {
          gte: startOfDay,
        },
      },
      _sum: {
        amount: true,
      },
    });

    // Workshop access count
    const workshopAccessCount = await this.prisma.salesPersonWorkshopAccess.count({
      where: {
        salesPersonId: sellerId,
        isActive: true,
      },
    });

    return {
      totalLinks: totalLinksResult,
      paidLinks: paidLinksResult,
      unpaidLinks: totalLinksResult - paidLinksResult,
      totalRevenue: revenueResult._sum.amount || 0,
      todayRevenue: todayRevenueResult._sum.amount || 0,
      workshopCount: workshopAccessCount,
    };
  }

  // Get sales manager team statistics
  async getManagerTeamStats(managerId: string) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get all sellers under this manager
    const sellers = await this.prisma.user.findMany({
      where: {
        role: 'SALES_PERSON',
        parentId: managerId,
      },
      select: { id: true },
    });

    const sellerIds = sellers.map(s => s.id);

    if (sellerIds.length === 0) {
      return {
        totalSellers: 0,
        activeSellers: 0,
        totalRevenue: 0,
        todayRevenue: 0,
        totalLinks: 0,
        paidLinks: 0,
        conversionRate: 0,
      };
    }

    // Total sellers count
    const totalSellers = sellerIds.length;

    // Active sellers (those with links created in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeSellersResult = await this.prisma.paymentLink.findMany({
      where: {
        createdById: { in: sellerIds },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { createdById: true },
      distinct: ['createdById'],
    });

    const activeSellers = activeSellersResult.length;

    // Total links created by team
    const totalLinksResult = await this.prisma.paymentLink.count({
      where: { createdById: { in: sellerIds } },
    });

    // Paid links
    const paidLinksResult = await this.prisma.paymentLink.count({
      where: {
        createdById: { in: sellerIds },
        status: 'PAID',
      },
    });

    // Total revenue
    const revenueResult = await this.prisma.paymentLink.aggregate({
      where: {
        createdById: { in: sellerIds },
        status: 'PAID',
      },
      _sum: {
        amount: true,
      },
    });

    // Today's revenue
    const todayRevenueResult = await this.prisma.paymentLink.aggregate({
      where: {
        createdById: { in: sellerIds },
        status: 'PAID',
        createdAt: {
          gte: startOfDay,
        },
      },
      _sum: {
        amount: true,
      },
    });

    const conversionRate = totalLinksResult > 0 ? Math.round((paidLinksResult / totalLinksResult) * 100) : 0;

    return {
      totalSellers,
      activeSellers,
      totalRevenue: revenueResult._sum.amount || 0,
      todayRevenue: todayRevenueResult._sum.amount || 0,
      totalLinks: totalLinksResult,
      paidLinks: paidLinksResult,
      conversionRate,
    };
  }

  // Get sellers under a manager
  async getMySellers(managerId: string) {
    const sellers = await this.prisma.user.findMany({
      where: {
        role: 'SALES_PERSON',
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
    });

    // Get statistics for each seller
    const sellersWithStats = await Promise.all(
      sellers.map(async (seller) => {
        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Total links
        const totalLinks = await this.prisma.paymentLink.count({
          where: { createdById: seller.id },
        });

        // Paid links
        const paidLinks = await this.prisma.paymentLink.count({
          where: {
            createdById: seller.id,
            status: 'PAID',
          },
        });

        // Total revenue
        const revenueResult = await this.prisma.paymentLink.aggregate({
          where: {
            createdById: seller.id,
            status: 'PAID',
          },
          _sum: {
            amount: true,
          },
        });

        // Last activity (last link created)
        const lastLink = await this.prisma.paymentLink.findFirst({
          where: { createdById: seller.id },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        });

        return {
          ...seller,
          totalLinks,
          paidLinks,
          totalRevenue: revenueResult._sum.amount || 0,
          lastActivity: lastLink?.createdAt?.toISOString() || seller.createdAt.toISOString(),
        };
      })
    );

    return sellersWithStats;
  }

  async importUsers(usersData: any[]) {
    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const userData of usersData) {
      try {
        // Validate required fields
        if (!userData.phone) {
          errors.push(`User with ID ${userData.id || 'unknown'}: Phone number is required`);
          skippedCount++;
          continue;
        }

        // Check if user already exists
        const existingUser = await this.findByPhone(userData.phone);
        
        if (existingUser) {
          // Update existing user
          await this.update(existingUser.id, {
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: userData.role || 'USER',
            isOld: true,
          });
          skippedCount++;
        } else {
          // Create new user
          await this.create({
            phone: userData.phone,
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: userData.role || 'USER',
            isOld: true,
          });
          importedCount++;
        }
      } catch (error) {
        errors.push(`Error importing user: ${error.message}`);
        skippedCount++;
      }
    }

    return {
      importedCount,
      skippedCount,
      errors
    };
  }
}
