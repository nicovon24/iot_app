import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EntitiesService } from '../entities/entities.service';
import { PrismaService } from '../prisma/prisma.service';
import { EntityRef } from '../types';
import { CreateAssetDto } from './dto/create-asset.dto';

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);

  constructor(
    private readonly entitiesService: EntitiesService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Validates the requested hierarchy level and parent, creates the Asset in ThingsBoard,
   * records its hierarchy assignment in Postgres (rolling back the TB Asset if that write
   * fails, same compensating pattern as CustomersService.create), then creates a real TB
   * "Contains" relation from the parent (Customer or Asset) to the new Asset.
   */
  async create(dto: CreateAssetDto): Promise<EntityRef> {
    const level = await this.prisma.customerHierarchyLevels.findUnique({
      where: { customerId_levelIndex: { customerId: dto.customerId, levelIndex: dto.levelIndex } },
    });
    if (!level) {
      throw new BadRequestException(
        `levelIndex ${dto.levelIndex} does not exist in customer ${dto.customerId}'s hierarchy`,
      );
    }

    let parentType: 'CUSTOMER' | 'ASSET';
    if (dto.parentId === dto.customerId) {
      if (dto.levelIndex !== 0) {
        throw new BadRequestException('Only levelIndex 0 can attach directly to the Customer');
      }
      parentType = 'CUSTOMER';
    } else {
      const parentAssignment = await this.prisma.assetHierarchyAssignment.findUnique({
        where: { assetId: dto.parentId },
      });
      if (!parentAssignment) {
        throw new NotFoundException(`Parent asset ${dto.parentId} is not a tracked hierarchy member`);
      }
      if (parentAssignment.customerId !== dto.customerId) {
        throw new BadRequestException('Parent asset belongs to a different customer');
      }
      if (parentAssignment.levelIndex !== dto.levelIndex - 1) {
        throw new BadRequestException('Parent asset must be exactly one level above this asset');
      }
      parentType = 'ASSET';
    }

    const created = await this.entitiesService.createAsset(dto.name, dto.type, dto.label);

    try {
      await this.entitiesService.assignAssetToCustomer(dto.customerId, created.id);
    } catch (err) {
      this.logger.error(`Rolling back Asset ${created.id} — customer assignment failed: ${(err as Error).message}`);
      await this.entitiesService.deleteAsset(created.id);
      throw err;
    }

    try {
      await this.prisma.assetHierarchyAssignment.create({
        data: { customerId: dto.customerId, assetId: created.id, levelIndex: dto.levelIndex },
      });
    } catch (err) {
      this.logger.error(`Rolling back Asset ${created.id} — hierarchy assignment write failed: ${(err as Error).message}`);
      await this.entitiesService.deleteAsset(created.id);
      throw err;
    }

    try {
      await this.entitiesService.createRelation(dto.parentId, parentType, created.id, 'ASSET');
    } catch (err) {
      this.logger.error(`Rolling back Asset ${created.id} — Contains relation creation failed: ${(err as Error).message}`);
      await this.prisma.assetHierarchyAssignment.delete({ where: { assetId: created.id } });
      await this.entitiesService.deleteAsset(created.id);
      throw err;
    }

    return created;
  }
}
