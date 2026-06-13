import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { RequestContextService } from './request-context';
import { createScopedPrismaClient, SCOPED_PRISMA } from './scoped-prisma';

@Global()
@Module({
  providers: [
    PrismaService,
    RequestContextService,
    {
      provide: SCOPED_PRISMA,
      useFactory: createScopedPrismaClient,
      inject: [PrismaService, RequestContextService],
    },
  ],
  exports: [PrismaService, RequestContextService, SCOPED_PRISMA],
})
export class DbModule {}
