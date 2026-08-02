import { Injectable, Logger } from '@nestjs/common';
import { EntitiesService } from '../entities/entities.service';
import { PrismaService } from '../prisma/prisma.service';
import { EntityRef } from '../types';
import { CreateCustomerDto } from './dto/create-customer.dto';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    private readonly entitiesService: EntitiesService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Creates a real ThingsBoard Customer, then persists its hierarchy levels in Postgres
   * keyed by the new customerId. If the Postgres write fails, the TB Customer is deleted
   * to avoid an orphaned Customer with no hierarchy — TB has no native transaction spanning
   * both stores, so this is a best-effort compensating action, not true atomicity.
   */
  async create(dto: CreateCustomerDto): Promise<EntityRef & { hierarchyLevels: { levelIndex: number; name: string }[] }> {
    const customer = await this.entitiesService.createCustomer(dto.name, dto.parentCustomerId);

    try {
      await this.prisma.customerHierarchyLevels.createMany({
        data: dto.hierarchyLevels.map((level) => ({
          customerId: customer.id,
          levelIndex: level.levelIndex,
          name: level.name,
        })),
      });
    } catch (err) {
      this.logger.error(
        `Rolling back Customer ${customer.id} — hierarchy write failed: ${(err as Error).message}`,
      );
      await this.entitiesService.deleteCustomer(customer.id);
      throw err;
    }

    const hierarchyLevels = await this.prisma.customerHierarchyLevels.findMany({
      where: { customerId: customer.id },
      orderBy: { levelIndex: 'asc' },
      select: { levelIndex: true, name: true },
    });

    return { ...customer, hierarchyLevels };
  }

  async getHierarchy(customerId: string) {
    // Throws NotFoundException if the Customer doesn't exist in ThingsBoard.
    await this.entitiesService.getById(customerId, 'CUSTOMER');

    return this.prisma.customerHierarchyLevels.findMany({
      where: { customerId },
      orderBy: { levelIndex: 'asc' },
    });
  }
}
