import { ThingsboardClientService } from '../thingsboard/thingsboard-client.service';
import { TbPageData } from '../types';

/**
 * Walks every page of a ThingsBoard paged endpoint.
 *
 * TB truncates at `pageSize` and reports no error — a short page is
 * indistinguishable from a complete one. Anywhere the caller needs *every* row
 * (scope resolution, client-side pagination, reference-name batches) a single
 * `pageSize=1000` request silently drops the remainder.
 *
 * In resolveScopedCustomerIds that truncation is not cosmetic: descendants past
 * the cap never enter the scope set, so legitimate access is denied — and it
 * presents as a permissions bug rather than a pagination one.
 *
 * Lives in its own module rather than entities.service so entity-ref-resolver
 * can use it without a circular import back into the service that owns it.
 */
export async function fetchAllPages<T>(
  tb: ThingsboardClientService,
  path: string,
  pageSize = 200,
): Promise<T[]> {
  const all: T[] = [];
  for (let page = 0; ; page++) {
    const sep = path.includes('?') ? '&' : '?';
    const res = await tb.request<TbPageData<T>>(
      'GET',
      `${path}${sep}pageSize=${pageSize}&page=${page}`,
    );
    all.push(...res.data);
    if (!res.hasNext) return all;
  }
}
