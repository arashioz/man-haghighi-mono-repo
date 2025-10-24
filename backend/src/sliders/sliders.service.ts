import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateSliderDto, UpdateSliderDto } from './dto/slider.dto';
import { UrlService } from '../common/services/url.service';

@Injectable()
export class SlidersService {
  constructor(
    private prisma: PrismaService,
    private urlService: UrlService,
  ) {}

  async create(createSliderDto: CreateSliderDto, files?: { image?: Express.Multer.File[], video?: Express.Multer.File[] }) {
    const sliderData: any = { ...createSliderDto };
    
    if (files?.image?.[0]) {
      sliderData.image = files.image[0].filename;
    }
    
    if (files?.video?.[0]) {
      sliderData.videoFile = files.video[0].filename;
    }

    const createdSlider = await this.prisma.slider.create({
      data: sliderData,
    });

    return this.urlService.processSliderData(createdSlider);
  }

  async findAll() {
    const sliders = await this.prisma.slider.findMany({
      orderBy: { order: 'asc' },
    });

    return this.urlService.processSlidersData(sliders);
  }

  async findActive() {
    const sliders = await this.prisma.slider.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });

    return this.urlService.processSlidersData(sliders);
  }

  async findOne(id: string) {
    const slider = await this.prisma.slider.findUnique({
      where: { id },
    });

    if (!slider) {
      throw new NotFoundException('Slider not found');
    }

    return this.urlService.processSliderData(slider);
  }

  async update(id: string, updateSliderDto: UpdateSliderDto) {
    const slider = await this.findOne(id);
    
    const updatedSlider = await this.prisma.slider.update({
      where: { id },
      data: updateSliderDto,
    });

    return this.urlService.processSliderData(updatedSlider);
  }

  async remove(id: string) {
    await this.findOne(id);
    
    return this.prisma.slider.delete({
      where: { id },
    });
  }
}
