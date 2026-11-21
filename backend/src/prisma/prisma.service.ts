import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '../config/config.service';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly config: ConfigService) {
    super();
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    const instanceUrl = new URL(this.config.thingsboardUrl).origin;
    await this.$transaction([
      this.customerHierarchyLevels.updateMany({
        where: { instanceUrl: null },
        data: { instanceUrl },
      }),
      this.assetHierarchyAssignment.updateMany({
        where: { instanceUrl: null },
        data: { instanceUrl },
      }),
      this.impersonationLog.updateMany({ where: { instanceUrl: null }, data: { instanceUrl } }),
      this.dashboard.updateMany({ where: { instanceUrl: null }, data: { instanceUrl } }),
      this.aiProviderConnection.updateMany({ where: { instanceUrl: null }, data: { instanceUrl } }),
    ]);
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
