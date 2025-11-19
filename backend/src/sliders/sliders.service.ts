import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateSliderDto, UpdateSliderDto } from './dto/slider.dto';
import { UrlService } from '../common/services/url.service';

@Injectable()
export class SlidersService {
  constructor(
    private prisma: PrismaService,
    private urlService: UrlService,
  ) {}

  async create(
    createSliderDto: CreateSliderDto,
    files?: { image?: Express.Multer.File[]; video?: Express.Multer.File[] },
  ) {
    const sliderData: Prisma.SliderCreateInput = { ...createSliderDto } as Prisma.SliderCreateInput;

    Object.keys(sliderData).forEach((key) => {
      if (sliderData[key] === 'undefined' || sliderData[key] === 'null') {
        sliderData[key] = undefined;
      }
    });

    if (files?.image?.[0]) {
      sliderData.image = files.image[0].filename;
    }

    if (files?.video?.[0]) {
      sliderData.videoFile = files.video[0].filename;
    }

    if (!sliderData.image) {
      sliderData.image = '';
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

  async update(
    id: string,
    updateSliderDto: UpdateSliderDto,
    files?: { image?: Express.Multer.File[]; video?: Express.Multer.File[] },
  ) {
    const existingSlider = await this.prisma.slider.findUnique({
      where: { id },
    });

    if (!existingSlider) {
      throw new NotFoundException('Slider not found');
    }

    const updateData: Prisma.SliderUpdateInput = { ...updateSliderDto } as Prisma.SliderUpdateInput;

    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === 'undefined' || updateData[key] === 'null') {
        updateData[key] = undefined;
      }
    });

    if (files?.image?.[0]) {
      updateData.image = files.image[0].filename;
    }

    if (files?.video?.[0]) {
      updateData.videoFile = files.video[0].filename;
    }

    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    if (updateData.image === undefined && !existingSlider.image) {
      updateData.image = '';
    }

    const updatedSlider = await this.prisma.slider.update({
      where: { id },
      data: updateData,
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
