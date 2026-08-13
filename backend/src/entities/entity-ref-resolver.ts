import { ThingsboardClientService } from '../thingsboard/thingsboard-client.service';
import { RedisService } from '../thingsboard/redis.service';
import { EntityRef, EntityRefLink, EntityType, TbAsset, TbCustomer, TbDevice, TbPageData } from '../types';

export type RefKind = 'tenant' | 'customer' | 'assetProfile';

/** ThingsBoard's placeholder customerId for an entity never assigned to a real Customer —
 * appears as a real, truthy `customerId.id` on the raw entity, so callers must compare
 * against this constant rather than treating any customerId as "assigned". */
export const TB_NULL_CUSTOMER_ID = '13814000-1dd2-11b2-8080-808080808080';

/** Reference names/labels change rarely — a much longer TTL than the ~3s telemetry cache. */
const REF_CACHE_TTL_SECONDS = 300;

/**
 * Batched + Redis-cached resolution of tenant/customer/assetProfile reference names/labels
 * (`EntityRef.tenantId`/`customerId`/`assetProfileId`/`ownerId`), and mapping raw TB entities
 * into the enriched `EntityRef` shape. Split out of EntitiesService as a plain (non-@Injectable)
 * internal collaborator — not a NestJS provider — so the 13 files across the app that inject
 * EntitiesService (including the global CustomerScopeGuard/ws-auth.util) need zero DI changes;
 * this only reorganizes what was already one cohesive concern inside that file.
 */
export class EntityRefResolver {
  constructor(
    private readonly tb: ThingsboardClientService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Batched + Redis-cached resolution of tenant/customer/assetProfile reference names,
   * deduped by unique id across a whole entity list — never one lookup per entity (that
   * would reintroduce N+1). Individual failures degrade to a missing map entry (toEntityRef
   * then renders `{id}` with no name/label) rather than failing the whole batch.
   */
  private async resolveRefs(refs: { id: string; kind: RefKind }[]): Promise<Map<string, EntityRefLink>> {
    const result = new Map<string, EntityRefLink>();
    const byKind = new Map<RefKind, Set<string>>();
    for (const { id, kind } of refs) {
      if (!byKind.has(kind)) byKind.set(kind, new Set());
      byKind.get(kind)!.add(id);
    }

    for (const [kind, ids] of byKind) {
      const uncached: string[] = [];
      for (const id of ids) {
        const cached = await this.redis.get(`refname:${kind}:${id}`);
        if (cached) {
          result.set(`${kind}:${id}`, JSON.parse(cached) as EntityRefLink);
        } else {
          uncached.push(id);
        }
      }
      if (uncached.length === 0) continue;

      if (kind === 'customer') {
        // One call resolves every uncached customer id at once — TB has no per-customer-name
        // batch endpoint, but a single full-page fetch is far cheaper than N individual GETs.
        try {
          const page = await this.tb.request<TbPageData<TbCustomer>>('GET', '/api/customers?pageSize=1000&page=0');
          for (const id of uncached) {
            const customer = page.data.find((c) => c.id.id === id);
            if (customer) {
              const link: EntityRefLink = { id, name: customer.title };
              result.set(`customer:${id}`, link);
              await this.redis.set(`refname:customer:${id}`, JSON.stringify(link), REF_CACHE_TTL_SECONDS);
            }
          }
        } catch {
          // Leave unresolved ids out of the map — toEntityRef degrades to {id} only.
        }
        continue;
      }

      // tenant / assetProfile: no batch endpoint, resolve individually (in this project's
      // single-tenant model there's realistically only ever one unique tenantId).
      const path = kind === 'tenant' ? '/api/tenant' : '/api/assetProfile';
      await Promise.all(
        uncached.map(async (id) => {
          try {
            const entity = await this.tb.request<{ title?: string; name?: string }>('GET', `${path}/${id}`);
            const link: EntityRefLink = { id, name: entity.title ?? entity.name };
            result.set(`${kind}:${id}`, link);
            await this.redis.set(`refname:${kind}:${id}`, JSON.stringify(link), REF_CACHE_TTL_SECONDS);
          } catch {
            // Stale/deleted reference — degrade to {id} only, don't fail the whole batch.
          }
        }),
      );
    }

    return result;
  }

  private toEntityRefs(
    entities: (TbDevice | TbAsset | TbCustomer)[],
    type: EntityType,
    refMap: Map<string, EntityRefLink>,
  ): EntityRef[] {
    return entities.map((entity) => {
      const name = 'title' in entity ? entity.title : entity.name;
      const label = 'label' in entity ? entity.label : undefined;
      const tenantId = entity.tenantId?.id;
      const rawCustomerId = 'customerId' in entity ? entity.customerId?.id : undefined;
      const customerId = rawCustomerId && rawCustomerId !== TB_NULL_CUSTOMER_ID ? rawCustomerId : undefined;
      const assetProfileId = 'assetProfileId' in entity ? entity.assetProfileId?.id : undefined;
      const ownerId = entity.ownerId?.id;
      const ownerKind: RefKind | undefined =
        entity.ownerId?.entityType === 'TENANT' ? 'tenant' : entity.ownerId?.entityType === 'CUSTOMER' ? 'customer' : undefined;
      const parentCustomerId = 'parentCustomerId' in entity ? entity.parentCustomerId?.id : undefined;

      return {
        id: entity.id.id,
        type,
        name,
        label,
        tenantId: tenantId ? refMap.get(`tenant:${tenantId}`) ?? { id: tenantId } : undefined,
        customerId: customerId ? refMap.get(`customer:${customerId}`) ?? { id: customerId } : undefined,
        assetProfileId: assetProfileId ? refMap.get(`assetProfile:${assetProfileId}`) ?? { id: assetProfileId } : undefined,
        ownerId: ownerId ? (ownerKind ? refMap.get(`${ownerKind}:${ownerId}`) : undefined) ?? { id: ownerId } : undefined,
        parentCustomerId: parentCustomerId ? refMap.get(`customer:${parentCustomerId}`) ?? { id: parentCustomerId } : undefined,
        additionalInfo: entity.additionalInfo,
      };
    });
  }

  /** Collects every unique {id,kind} reference needed to enrich this batch of raw entities. */
  private collectRefs(entities: (TbDevice | TbAsset | TbCustomer)[]): { id: string; kind: RefKind }[] {
    const refs: { id: string; kind: RefKind }[] = [];
    for (const entity of entities) {
      if (entity.tenantId?.id) refs.push({ id: entity.tenantId.id, kind: 'tenant' });
      if ('customerId' in entity && entity.customerId?.id && entity.customerId.id !== TB_NULL_CUSTOMER_ID) {
        refs.push({ id: entity.customerId.id, kind: 'customer' });
      }
      if ('assetProfileId' in entity && entity.assetProfileId?.id) refs.push({ id: entity.assetProfileId.id, kind: 'assetProfile' });
      if ('parentCustomerId' in entity && entity.parentCustomerId?.id) refs.push({ id: entity.parentCustomerId.id, kind: 'customer' });
      if (entity.ownerId?.id) {
        if (entity.ownerId.entityType === 'TENANT') refs.push({ id: entity.ownerId.id, kind: 'tenant' });
        else if (entity.ownerId.entityType === 'CUSTOMER') refs.push({ id: entity.ownerId.id, kind: 'customer' });
      }
    }
    return refs;
  }

  /** Resolves refs for a batch and maps it in one call — the entry point EntitiesService uses. */
  async mapWithRefs(entities: (TbDevice | TbAsset | TbCustomer)[], type: EntityType): Promise<EntityRef[]> {
    const refMap = await this.resolveRefs(this.collectRefs(entities));
    return this.toEntityRefs(entities, type, refMap);
  }
}
