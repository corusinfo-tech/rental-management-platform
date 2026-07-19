import { ForbiddenException, Injectable } from '@nestjs/common';
import { MembershipStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export const PortfolioPermission = {
  All: 'portfolio.access.all',
  PropertyRead: 'property.read',
  PropertyManage: 'property.manage',
  LeaseRead: 'lease.read',
  LeaseManage: 'lease.manage',
  InvoiceRead: 'invoice.read',
  InvoiceManage: 'invoice.manage',
  PaymentRead: 'payment.read',
  PaymentManage: 'payment.manage',
} as const;

export type PortfolioPermissionCode = Exclude<
  (typeof PortfolioPermission)[keyof typeof PortfolioPermission],
  'portfolio.access.all'
>;

export type PortfolioScope = {
  membershipId: string;
  organizationId: string;
  organizationWide: boolean;
  propertyIds: string[];
  permissionCodes: string[];
};

@Injectable()
export class PortfolioAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async scope(
    userId: string,
    organizationId: string,
    requiredPermission: PortfolioPermissionCode,
  ): Promise<PortfolioScope> {
    const membership = await this.prisma.organizationMembership.findFirst({
      where: {
        organizationId,
        status: MembershipStatus.ACTIVE,
        deletedAt: null,
        organization: { deletedAt: null },
        person: { user: { id: userId, deletedAt: null } },
      },
      select: {
        id: true,
        roles: {
          where: { role: { deletedAt: null } },
          select: {
            role: {
              select: {
                code: true,
                permissions: {
                  select: { permission: { select: { code: true, deletedAt: true } } },
                },
              },
            },
          },
        },
        portfolioAssignments: {
          where: { organizationId, revokedAt: null, property: { organizationId, deletedAt: null } },
          select: { propertyId: true },
        },
      },
    });
    if (!membership) throw new ForbiddenException('Active organization membership is required');

    const permissionCodes = [
      ...new Set(
        membership.roles
          .filter((membershipRole) => !['SUPER_ADMIN', 'OWNER', 'LANDLORD'].includes(membershipRole.role.code))
          .flatMap((membershipRole) =>
            membershipRole.role.permissions
              .filter((rolePermission) => !rolePermission.permission.deletedAt)
              .map((rolePermission) => rolePermission.permission.code),
          ),
      ),
    ];
    if (!permissionCodes.includes(requiredPermission)) {
      throw new ForbiddenException(`Required permission is missing: ${requiredPermission}`);
    }

    const organizationWide = permissionCodes.includes(PortfolioPermission.All);
    const ownerships = organizationWide
      ? []
      : await this.prisma.propertyOwnership.findMany({
          where: { userId, property: { organizationId, deletedAt: null } },
          select: { propertyId: true },
        });
    const propertyIds = [
      ...new Set([
        ...membership.portfolioAssignments.map((assignment) => assignment.propertyId),
        ...ownerships.map((ownership) => ownership.propertyId),
      ]),
    ];
    return {
      membershipId: membership.id,
      organizationId,
      organizationWide,
      propertyIds,
      permissionCodes,
    };
  }

  propertyWhere(scope: PortfolioScope): Prisma.PropertyWhereInput {
    return scope.organizationWide ? {} : { id: { in: scope.propertyIds } };
  }

  leaseWhere(scope: PortfolioScope): Prisma.LeaseWhereInput {
    return scope.organizationWide
      ? {}
      : { unit: { floor: { building: { propertyId: { in: scope.propertyIds } } } } };
  }

  invoiceWhere(scope: PortfolioScope): Prisma.InvoiceWhereInput {
    return scope.organizationWide ? {} : { lease: this.leaseWhere(scope) };
  }

  paymentWhere(scope: PortfolioScope): Prisma.PaymentWhereInput {
    return scope.organizationWide ? {} : { propertyId: { in: scope.propertyIds } };
  }

  async assertProperty(scope: PortfolioScope, propertyId: string): Promise<void> {
    if (scope.organizationWide || scope.propertyIds.includes(propertyId)) return;
    throw new ForbiddenException('Property is outside the assigned portfolio');
  }

  async assertUnit(scope: PortfolioScope, unitId: string): Promise<string> {
    const unit = await this.prisma.unit.findFirst({
      where: {
        id: unitId,
        deletedAt: null,
        floor: {
          deletedAt: null,
          building: {
            deletedAt: null,
            property: {
              organizationId: scope.organizationId,
              deletedAt: null,
              ...this.propertyWhere(scope),
            },
          },
        },
      },
      select: { floor: { select: { building: { select: { propertyId: true } } } } },
    });
    if (!unit) throw new ForbiddenException('Unit is outside the assigned portfolio');
    return unit.floor.building.propertyId;
  }

  async assertLease(scope: PortfolioScope, leaseId: string): Promise<string> {
    const lease = await this.prisma.lease.findFirst({
      where: { id: leaseId, organizationId: scope.organizationId, ...this.leaseWhere(scope) },
      select: {
        unit: { select: { floor: { select: { building: { select: { propertyId: true } } } } } },
      },
    });
    if (!lease) throw new ForbiddenException('Lease is outside the assigned portfolio');
    return lease.unit.floor.building.propertyId;
  }

  async assertSchedule(scope: PortfolioScope, scheduleId: string): Promise<string> {
    const schedule = await this.prisma.leaseRentSchedule.findFirst({
      where: {
        id: scheduleId,
        calendar: { lease: { organizationId: scope.organizationId, ...this.leaseWhere(scope) } },
      },
      select: {
        calendar: {
          select: {
            lease: {
              select: {
                unit: {
                  select: { floor: { select: { building: { select: { propertyId: true } } } } },
                },
              },
            },
          },
        },
      },
    });
    if (!schedule) throw new ForbiddenException('Rent schedule is outside the assigned portfolio');
    return schedule.calendar.lease.unit.floor.building.propertyId;
  }

  async assertInvoice(scope: PortfolioScope, invoiceId: string): Promise<string> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId: scope.organizationId, ...this.invoiceWhere(scope) },
      select: {
        lease: {
          select: {
            unit: { select: { floor: { select: { building: { select: { propertyId: true } } } } } },
          },
        },
      },
    });
    if (!invoice) throw new ForbiddenException('Invoice is outside the assigned portfolio');
    return invoice.lease.unit.floor.building.propertyId;
  }

  async assertInvoices(scope: PortfolioScope, invoiceIds: string[]): Promise<string> {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        id: { in: invoiceIds },
        organizationId: scope.organizationId,
        ...this.invoiceWhere(scope),
      },
      select: {
        id: true,
        lease: {
          select: {
            unit: { select: { floor: { select: { building: { select: { propertyId: true } } } } } },
          },
        },
      },
    });
    if (invoices.length !== new Set(invoiceIds).size)
      throw new ForbiddenException('One or more invoices are outside the assigned portfolio');
    const propertyIds = new Set(
      invoices.map((invoice) => invoice.lease.unit.floor.building.propertyId),
    );
    if (propertyIds.size !== 1)
      throw new ForbiddenException('A payment must be scoped to one property');
    return [...propertyIds][0];
  }

  async assertPayment(scope: PortfolioScope, paymentId: string): Promise<string | null> {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, organizationId: scope.organizationId, ...this.paymentWhere(scope) },
      select: { propertyId: true },
    });
    if (!payment) throw new ForbiddenException('Payment is outside the assigned portfolio');
    return payment.propertyId;
  }
}
