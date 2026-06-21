import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { StaffRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class StaffService {
  constructor(private prisma: PrismaService) {}

  async findByStore(storeId: string) {
    return this.prisma.staff.findMany({
      where: { storeId },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });
  }

  async findById(id: string) {
    const staff = await this.prisma.staff.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        storeId: true,
      },
    });
    if (!staff) throw new NotFoundException('Nhân viên không tồn tại');
    return staff;
  }

  async create(data: {
    storeId: string;
    name: string;
    pin: string;
    phone?: string;
    role?: StaffRole;
  }) {
    if (data.pin.length < 4 || data.pin.length > 6) {
      throw new BadRequestException('PIN phải từ 4-6 số');
    }
    const hashedPin = await bcrypt.hash(data.pin, 10);
    return this.prisma.staff.create({
      data: {
        storeId: data.storeId,
        name: data.name,
        pin: hashedPin,
        phone: data.phone,
        role: data.role || StaffRole.staff,
      },
      select: { id: true, name: true, phone: true, role: true, isActive: true },
    });
  }

  async update(id: string, data: { name?: string; phone?: string; role?: StaffRole }) {
    return this.prisma.staff.update({
      where: { id },
      data,
      select: { id: true, name: true, phone: true, role: true, isActive: true },
    });
  }

  async toggleActive(id: string) {
    const staff = await this.prisma.staff.findUnique({ where: { id } });
    if (!staff) throw new NotFoundException('Nhân viên không tồn tại');
    return this.prisma.staff.update({
      where: { id },
      data: { isActive: !staff.isActive },
      select: { id: true, name: true, isActive: true },
    });
  }

  async resetPin(id: string, newPin: string) {
    if (newPin.length < 4 || newPin.length > 6) {
      throw new BadRequestException('PIN phải từ 4-6 số');
    }
    const hashedPin = await bcrypt.hash(newPin, 10);
    return this.prisma.staff.update({
      where: { id },
      data: { pin: hashedPin },
      select: { id: true, name: true },
    });
  }

  async changePin(id: string, currentPin: string, newPin: string) {
    if (newPin.length < 4 || newPin.length > 6) {
      throw new BadRequestException('PIN mới phải từ 4-6 số');
    }
    const staff = await this.prisma.staff.findUnique({ where: { id } });
    if (!staff) throw new NotFoundException('Nhân viên không tồn tại');

    const isMatch = await bcrypt.compare(currentPin, staff.pin);
    if (!isMatch) throw new BadRequestException('PIN hiện tại không đúng');

    const hashedPin = await bcrypt.hash(newPin, 10);
    return this.prisma.staff.update({
      where: { id },
      data: { pin: hashedPin },
      select: { id: true, name: true },
    });
  }

  async delete(id: string) {
    return this.prisma.staff.delete({ where: { id } });
  }
}
