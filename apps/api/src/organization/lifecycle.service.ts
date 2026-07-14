import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrganizationEvent } from './organization-events';
import { OrganizationStatus, Prisma } from '@prisma/client';
import { OrganizationLifecycleRepository } from './lifecycle.repository';

const EVENTS: Record<OrganizationStatus, { audit: string; outbox: string }> = {
  [OrganizationStatus.PENDING]: { audit: 'organization.pending', outbox: 'OrganizationPending' },
  [OrganizationStatus.ACTIVE]: { audit: 'organization.activated', outbox: OrganizationEvent.Activated },
  [OrganizationStatus.SUSPENDED]: { audit: 'organization.suspended', outbox: OrganizationEvent.Suspended },
  [OrganizationStatus.ARCHIVED]: { audit: 'organization.archived', outbox: OrganizationEvent.Archived },
};

@Injectable()
export class OrganizationLifecycleService {
  constructor(private readonly repository: OrganizationLifecycleRepository) {}
  /** Pending activation is owned exclusively by OrganizationApprovalService. */
  activate(actorUserId: string, organizationId: string, transaction?: Prisma.TransactionClient) {
    return this.run(transaction, async (client) => {
      const organization = await this.repository.find(organizationId, client);
      if (!organization) throw new NotFoundException('Organization not found');
      if (organization.status === OrganizationStatus.PENDING) throw new ForbiddenException('Pending organizations must be activated through administrative approval');
      return this.transition(actorUserId, organizationId, OrganizationStatus.ACTIVE, undefined, client);
    });
  }
  activateAfterApproval(actorUserId: string, organizationId: string, transaction: Prisma.TransactionClient) {
    return this.transition(actorUserId, organizationId, OrganizationStatus.ACTIVE, undefined, transaction, true);
  }
  suspend(actorUserId: string, organizationId: string) { return this.transition(actorUserId, organizationId, OrganizationStatus.SUSPENDED); }
  archive(actorUserId: string, organizationId: string) { return this.transition(actorUserId, organizationId, OrganizationStatus.ARCHIVED); }
  restore(actorUserId: string, organizationId: string) { return this.transition(actorUserId, organizationId, OrganizationStatus.ACTIVE, { audit: 'organization.restored', outbox: OrganizationEvent.Restored }); }

  validateTransition(from: OrganizationStatus, to: OrganizationStatus): void {
    const allowed = (from === OrganizationStatus.PENDING && to === OrganizationStatus.ACTIVE)
      || (from === OrganizationStatus.ACTIVE && (to === OrganizationStatus.SUSPENDED || to === OrganizationStatus.ARCHIVED))
      || (from === OrganizationStatus.SUSPENDED && to === OrganizationStatus.ACTIVE)
      || (from === OrganizationStatus.ARCHIVED && to === OrganizationStatus.ACTIVE);
    if (!allowed) throw new ConflictException(`Transition from ${from} to ${to} is not allowed`);
  }

  private run<T>(transaction: Prisma.TransactionClient | undefined, callback: (client: Prisma.TransactionClient) => Promise<T>) { return transaction ? callback(transaction) : this.repository.transaction(callback); }

  private async transition(actorUserId: string, organizationId: string, to: OrganizationStatus, lifecycleEvent?: { audit: string; outbox: string }, existingTransaction?: Prisma.TransactionClient, approvedActivation = false) {
    return this.run(existingTransaction, async (transaction) => {
      const organization = await this.repository.find(organizationId, transaction);
      if (!organization) throw new NotFoundException('Organization not found');
      if (!approvedActivation) await this.assertAuthorized(actorUserId, organizationId, transaction);
      this.validateTransition(organization.status, to);
      const changed = await this.repository.transition(organizationId, organization.status, to, transaction);
      if (changed.count !== 1) throw new ConflictException('Organization lifecycle state changed concurrently');
      const event = lifecycleEvent ?? EVENTS[to];
      const payload = { organizationId, from: organization.status, to, actorUserId };
      await this.repository.audit(actorUserId, event.audit, payload, transaction);
      await this.repository.outbox(event.outbox, organizationId, payload, transaction);
      return { accepted: true, status: to };
    });
  }

  private async assertAuthorized(userId: string, organizationId: string, transaction: Prisma.TransactionClient) {
    if (await this.repository.ownerMembership(userId, organizationId, transaction)) return;
    if (await this.repository.platformSuperAdmin(userId, transaction)) return;
    throw new ForbiddenException('Only an organization owner or platform super administrator may change lifecycle state');
  }
}
