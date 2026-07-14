import type { PrismaClient } from '@prisma/client';
import { organizationTerminalHandlers, ORGANIZATION_EVENT_TYPES } from './organization-event-policy';
import { OutboxWorker, type OutboxWorkerConfig } from './outbox-worker';
import type { OutboxEventHandler } from './types';

/**
 * The supported Organization worker composition. Construction validates that
 * every Organization producer event has a registered concrete or terminal
 * policy before polling may begin.
 */
export function createOrganizationOutboxWorker(
  prisma: PrismaClient,
  config: OutboxWorkerConfig,
  concreteHandlers: OutboxEventHandler[] = [],
): OutboxWorker {
  return new OutboxWorker(prisma, config, [...concreteHandlers, ...organizationTerminalHandlers()], ORGANIZATION_EVENT_TYPES);
}
