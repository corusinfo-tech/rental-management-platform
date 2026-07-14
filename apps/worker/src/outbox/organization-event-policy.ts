import { TerminalNoopOutboxHandler } from './handlers';
import type { OutboxEventHandler } from './types';

/** Keep this list synchronized with the producer contract in the API Organization module. */
export const ORGANIZATION_EVENT_TYPES = [
  'OrganizationCreated', 'OrganizationActivated', 'OrganizationSuspended', 'OrganizationArchived', 'OrganizationRestored',
  'OrganizationApproved', 'OrganizationRejected',
  'InvitationCreated', 'InvitationAccepted', 'InvitationDeclined', 'InvitationRevoked',
  'MembershipCreated', 'MembershipUpdated', 'RoleCreated', 'RoleAssigned', 'PermissionGranted',
  'OrganizationSettingsUpdated', 'BrandUpdated', 'OrganizationComplianceUpdated', 'OrganizationRiskChanged',
] as const;

/** Events currently have no external side effect. Their explicit terminal policy prevents accidental DLQ churn. */
export function organizationTerminalHandlers(): OutboxEventHandler[] {
  return ORGANIZATION_EVENT_TYPES.map((eventType) => new TerminalNoopOutboxHandler(eventType));
}
