import { ForbiddenException, Injectable } from '@nestjs/common';
import { MembershipStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export type TenantScope = { organizationId: string; personId: string; leaseIds: string[] };

@Injectable()
export class TenantAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async scope(userId: string, organizationId: string): Promise<TenantScope> {
    const membership = await this.prisma.organizationMembership.findFirst({
      where: {
        organizationId,
        status: MembershipStatus.ACTIVE,
        deletedAt: null,
        person: { user: { id: userId, deletedAt: null } },
      },
      select: { personId: true },
    });
    if (!membership)
      throw new ForbiddenException('Active tenant organization membership is required');
    const parties = await this.prisma.leaseParty.findMany({
      where: {
        personId: membership.personId,
        role: { in: ['TENANT', 'CO_TENANT'] },
        linkedAt: { not: null },
        linkVerificationId: { not: null },
        lease: { organizationId, deletedAt: null },
      },
      select: { leaseId: true },
    });
    return {
      organizationId,
      personId: membership.personId,
      leaseIds: [...new Set(parties.map((party) => party.leaseId))],
    };
  }

  async assertLease(scope: TenantScope, leaseId: string) {
    if (!scope.leaseIds.includes(leaseId))
      throw new ForbiddenException('Lease is not linked to the verified tenant principal');
  }

  async assertInvoice(scope: TenantScope, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        organizationId: scope.organizationId,
        leaseId: { in: scope.leaseIds },
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!invoice)
      throw new ForbiddenException('Invoice is not linked to the verified tenant principal');
  }

  async assertPayment(scope: TenantScope, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id: paymentId,
        organizationId: scope.organizationId,
        allocations: {
          some: { invoice: { leaseId: { in: scope.leaseIds }, deletedAt: null } },
          every: { invoice: { leaseId: { in: scope.leaseIds } } },
        },
      },
      select: { id: true },
    });
    if (!payment)
      throw new ForbiddenException('Payment is not linked to the verified tenant principal');
  }

  async assertDocument(scope: TenantScope, documentId: string) {
    const document = await this.prisma.leaseDocument.findFirst({
      where: { id: documentId, leaseId: { in: scope.leaseIds }, deletedAt: null },
      select: { id: true },
    });
    if (!document)
      throw new ForbiddenException('Document is not linked to the verified tenant principal');
  }
}
