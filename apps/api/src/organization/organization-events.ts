/**
 * The only event names Organization producers may publish. Event payloads remain
 * ID-only and are deliberately owned by their aggregate service.
 */
export const OrganizationEvent = {
  Created: 'OrganizationCreated',
  Activated: 'OrganizationActivated',
  Suspended: 'OrganizationSuspended',
  Archived: 'OrganizationArchived',
  Restored: 'OrganizationRestored',
  Approved: 'OrganizationApproved',
  Rejected: 'OrganizationRejected',
  InvitationCreated: 'InvitationCreated',
  InvitationAccepted: 'InvitationAccepted',
  InvitationDeclined: 'InvitationDeclined',
  InvitationRevoked: 'InvitationRevoked',
  MembershipCreated: 'MembershipCreated',
  MembershipUpdated: 'MembershipUpdated',
  RoleCreated: 'RoleCreated',
  RoleAssigned: 'RoleAssigned',
  PermissionGranted: 'PermissionGranted',
  SettingsUpdated: 'OrganizationSettingsUpdated',
  BrandUpdated: 'BrandUpdated',
  ComplianceUpdated: 'OrganizationComplianceUpdated',
  RiskChanged: 'OrganizationRiskChanged',
} as const;

export type OrganizationEventType = (typeof OrganizationEvent)[keyof typeof OrganizationEvent];
export const ORGANIZATION_EVENT_TYPES = Object.values(OrganizationEvent) as OrganizationEventType[];
