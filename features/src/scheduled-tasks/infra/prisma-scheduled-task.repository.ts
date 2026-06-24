import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@mitama/data';
import type { ScheduledTaskProps, ScheduledTaskRepository } from '../domain/scheduled-task';
import { isDue } from '../domain/scheduled-task';

@Injectable()
export class PrismaScheduledTaskRepository implements ScheduledTaskRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<ScheduledTaskProps[]> {
    const rows = await this.prisma.scheduledTask.findMany({ orderBy: { name: 'asc' } });
    return rows.map(toDomain);
  }

  async findById(id: string): Promise<ScheduledTaskProps | null> {
    const row = await this.prisma.scheduledTask.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async findByName(name: string): Promise<ScheduledTaskProps | null> {
    const row = await this.prisma.scheduledTask.findUnique({ where: { name } });
    return row ? toDomain(row) : null;
  }

  async findDue(now: Date): Promise<ScheduledTaskProps[]> {
    const rows = await this.prisma.scheduledTask.findMany({
      where: { enabled: true },
      orderBy: { name: 'asc' },
    });
    return rows.map(toDomain).filter((task) => isDue(task, now));
  }

  async claim(id: string, now: Date, expectedLastStartUtc: Date | null): Promise<boolean> {
    // Lock por fila: solo el caller cuya foto del `lastStartUtc` coincide con
    // la que vio el runner gana la carrera; los demás reciben `count=0`.
    const result = await this.prisma.scheduledTask.updateMany({
      where: { id, lastStartUtc: expectedLastStartUtc },
      data: { lastStartUtc: now, lastError: null },
    });
    return result.count === 1;
  }

  async recordResult(
    id: string,
    result: { endedAt: Date; success: boolean; error: string | null; disableOnError: boolean },
  ): Promise<void> {
    await this.prisma.scheduledTask.update({
      where: { id },
      data: {
        lastEndUtc: result.endedAt,
        lastSuccessUtc: result.success ? result.endedAt : undefined,
        lastError: result.error,
        enabled: result.disableOnError ? false : undefined,
      },
    });
  }

  async save(task: ScheduledTaskProps): Promise<void> {
    const data: Prisma.ScheduledTaskUncheckedCreateInput = {
      id: task.id,
      name: task.name,
      type: task.type,
      seconds: task.seconds,
      enabled: task.enabled,
      stopOnError: task.stopOnError,
      lastStartUtc: task.lastStartUtc,
      lastEndUtc: task.lastEndUtc,
      lastSuccessUtc: task.lastSuccessUtc,
      lastError: task.lastError,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
    await this.prisma.scheduledTask.upsert({
      where: { id: task.id },
      create: data,
      update: data,
    });
  }
}

interface ScheduledTaskRow {
  id: string;
  name: string;
  type: string;
  seconds: number;
  enabled: boolean;
  stopOnError: boolean;
  lastStartUtc: Date | null;
  lastEndUtc: Date | null;
  lastSuccessUtc: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function toDomain(row: ScheduledTaskRow): ScheduledTaskProps {
  return { ...row };
}
