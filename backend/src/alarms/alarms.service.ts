import { Injectable } from '@nestjs/common';
import { AppSession } from '../auth/auth.service';
import { applyClientSidePagination, buildPageParams } from '../entities/entities.service';
import { EntitiesService } from '../entities/entities.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { ThingsboardClientService } from '../thingsboard/thingsboard-client.service';
import { EntityType, TbAlarm, TbAlarmSeverity, TbAlarmStatus, TbPageData } from '../types';

@Injectable()
export class AlarmsService {
  constructor(
    private readonly tb: ThingsboardClientService,
    private readonly entitiesService: EntitiesService,
  ) {}

  /** Real ThingsBoard per-entity alarm endpoint — stable across CE/PE, confirmed against real TB Cloud. */
  async getForEntity(
    entityId: string,
    entityType: EntityType,
    pagination?: PaginationQueryDto,
  ): Promise<TbPageData<TbAlarm>> {
    const query = buildPageParams(pagination);
    return this.tb.request<TbPageData<TbAlarm>>('GET', `/api/alarm/${entityType}/${entityId}?${query}`);
  }

  /**
   * Global alarm list, scoped by customer hierarchy exactly like EntitiesService.list: composes
   * the in-scope device/asset entity list with per-entity alarm fetches rather than an unconfirmed
   * tenant-wide TB alarm search API (see 03-02-PLAN.md boundaries — N+1 but certain to work).
   */
  async getAllScoped(
    session: AppSession | null | undefined,
    pagination?: PaginationQueryDto,
    severity?: TbAlarmSeverity,
    status?: TbAlarmStatus,
  ): Promise<TbPageData<TbAlarm>> {
    const [devices, assets] = await Promise.all([
      this.entitiesService.list('DEVICE', session),
      this.entitiesService.list('ASSET', session),
    ]);
    const entities = [...devices.data, ...assets.data];

    const perEntity = await Promise.all(
      entities.map((e) => this.getForEntity(e.id, e.type, undefined).then((p) => p.data)),
    );
    let merged = perEntity.flat();

    if (severity) merged = merged.filter((a) => a.severity === severity);
    if (status) merged = merged.filter((a) => a.status === status);

    return applyClientSidePagination(merged, pagination);
  }
}
