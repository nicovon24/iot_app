import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Dashboard, DashboardCustomerAccess, DashboardWidget, Prisma } from '@prisma/client';
import { AppSession } from '../auth/auth.service';
import { isDescendantCustomer } from '../common/guards/ws-auth.util';
import { PrismaService } from '../prisma/prisma.service';
import { ThingsboardClientService } from '../thingsboard/thingsboard-client.service';
import { SaveDashboardDto } from './dto/save-dashboard.dto';
import { validateWidgetConfig } from './widget-registry';
import { validateTimeWindow } from './time-window';

type DashboardWithAccess = Dashboard & {
  customerAccess: DashboardCustomerAccess[];
  _count: { widgets: number };
};
type DashboardWithRelations = Dashboard & {
  widgets: DashboardWidget[];
  customerAccess: DashboardCustomerAccess[];
};

const isSysadmin = (session: AppSession) =>
  session.authority === 'TENANT_ADMIN' || session.authority === 'SYS_ADMIN';

@Injectable()
export class DashboardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tb: ThingsboardClientService,
  ) {}

  async list(session: AppSession): Promise<DashboardWithAccess[]> {
    const all = await this.prisma.dashboard.findMany({
      // _count rather than `widgets: true`: the gallery only needs how many, and loading every
      // widget row of every dashboard to call .length on it would grow with the whole tenant.
      include: { customerAccess: true, _count: { select: { widgets: true } } },
    });
    const visible = await Promise.all(
      all.map(async (d) => ((await this.canView(d, session)) ? d : null)),
    );
    return visible.filter((d): d is DashboardWithAccess => d !== null);
  }

  async getById(id: string, session: AppSession): Promise<DashboardWithRelations> {
    const dashboard = await this.prisma.dashboard.findUnique({
      where: { id },
      include: { widgets: true, customerAccess: true },
    });
    if (!dashboard) throw new NotFoundException('Dashboard not found');
    if (!(await this.canView(dashboard, session))) {
      throw new ForbiddenException('Dashboard is outside your customer hierarchy');
    }
    return dashboard;
  }

  async create(dto: SaveDashboardDto, session: AppSession): Promise<DashboardWithRelations> {
    const customerIds = this.resolveCustomerIds(dto, session);
    dto.widgets.forEach((w) => validateWidgetConfig(w.widgetType, w.config));
    validateTimeWindow(dto.timeWindow);

    const created = await this.prisma.$transaction(async (tx) => {
      const dashboard = await tx.dashboard.create({
        data: {
          title: dto.title,
          createdBy: session.tbUserId,
          visibility: dto.visibility,
          customerScope: dto.customerScope,
          timeWindow: dto.timeWindow ? (dto.timeWindow as Prisma.InputJsonValue) : Prisma.DbNull,
          layoutMode: dto.layoutMode ?? 'SCROLL',
        },
      });

      if (customerIds.length > 0) {
        await tx.dashboardCustomerAccess.createMany({
          data: customerIds.map((customerId) => ({ dashboardId: dashboard.id, customerId })),
        });
      }

      if (dto.widgets.length > 0) {
        await tx.dashboardWidget.createMany({
          data: dto.widgets.map((w) => ({
            dashboardId: dashboard.id,
            widgetType: w.widgetType,
            config: w.config as Prisma.InputJsonValue,
            layout: w.layout as unknown as Prisma.InputJsonValue,
          })),
        });
      }

      return dashboard;
    });

    return this.getById(created.id, session);
  }

  /**
   * Whole-dashboard save: replaces every widget and every customerAccess row in one
   * transaction. A failure anywhere (including widget validation, run before the
   * transaction opens) leaves the dashboard exactly as it was — Phase 10's "one save, one
   * transaction" requirement (AC-5), whether the request came from the one-by-one panel or
   * a bulk-add batch.
   */
  async save(id: string, dto: SaveDashboardDto, session: AppSession): Promise<DashboardWithRelations> {
    const existing = await this.prisma.dashboard.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Dashboard not found');
    if (existing.createdBy !== session.tbUserId && !isSysadmin(session)) {
      throw new ForbiddenException('Only the creator or a sysadmin can edit this dashboard');
    }

    const customerIds = this.resolveCustomerIds(dto, session);
    dto.widgets.forEach((w) => validateWidgetConfig(w.widgetType, w.config));
    validateTimeWindow(dto.timeWindow);

    await this.prisma.$transaction(async (tx) => {
      await tx.dashboard.update({
        where: { id },
        data: {
          title: dto.title,
          visibility: dto.visibility,
          customerScope: dto.customerScope,
          // DbNull, not JsonNull: clearing the window means "no window set", which is the
          // SQL NULL the nullable column and every pre-10-04 row already use — JsonNull would
          // write a literal JSON `null` value instead, a different thing to read back.
          timeWindow: dto.timeWindow ? (dto.timeWindow as Prisma.InputJsonValue) : Prisma.DbNull,
          layoutMode: dto.layoutMode ?? 'SCROLL',
        },
      });

      await tx.dashboardCustomerAccess.deleteMany({ where: { dashboardId: id } });
      if (customerIds.length > 0) {
        await tx.dashboardCustomerAccess.createMany({
          data: customerIds.map((customerId) => ({ dashboardId: id, customerId })),
        });
      }

      await tx.dashboardWidget.deleteMany({ where: { dashboardId: id } });
      if (dto.widgets.length > 0) {
        await tx.dashboardWidget.createMany({
          data: dto.widgets.map((w) => ({
            dashboardId: id,
            widgetType: w.widgetType,
            config: w.config as Prisma.InputJsonValue,
            layout: w.layout as unknown as Prisma.InputJsonValue,
          })),
        });
      }
    });

    return this.getById(id, session);
  }

  async delete(id: string, session: AppSession): Promise<void> {
    const existing = await this.prisma.dashboard.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Dashboard not found');
    if (existing.createdBy !== session.tbUserId && !isSysadmin(session)) {
      throw new ForbiddenException('Only the creator or a sysadmin can delete this dashboard');
    }
    await this.prisma.dashboard.delete({ where: { id } }); // widgets/customerAccess cascade
  }

  private async canView(
    dashboard: Dashboard & { customerAccess: DashboardCustomerAccess[] },
    session: AppSession,
  ): Promise<boolean> {
    if (isSysadmin(session)) return true;

    if (dashboard.visibility === 'PRIVATE') {
      return dashboard.createdBy === session.tbUserId;
    }

    // SHARED
    if (dashboard.customerScope === 'ALL') return true;
    if (!session.customerId) return false;

    for (const access of dashboard.customerAccess) {
      if (access.customerId === session.customerId) return true;
      if (await isDescendantCustomer(access.customerId, session.customerId, this.tb)) return true;
    }
    return false;
  }

  /**
   * Enforces the create/save-time sharing rules from CONTEXT.md: only a sysadmin may set
   * customerScope=ALL; a non-sysadmin's customerIds are always forced to their own
   * customerId, regardless of what the client sent, so an ADMIN can never grant another
   * Customer access to a dashboard they don't own.
   */
  private resolveCustomerIds(dto: SaveDashboardDto, session: AppSession): string[] {
    if (dto.visibility === 'PRIVATE' || dto.customerScope === 'ALL') {
      if (dto.customerScope === 'ALL' && !isSysadmin(session)) {
        throw new ForbiddenException('Only a sysadmin can create a tenant-wide (ALL) dashboard');
      }
      return [];
    }

    if (!isSysadmin(session)) {
      if (!session.customerId) {
        throw new ForbiddenException('No customer associated with this session');
      }
      return [session.customerId];
    }

    return dto.customerIds;
  }
}
