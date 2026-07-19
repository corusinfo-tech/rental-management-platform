import assert from 'node:assert/strict';
import test from 'node:test';
import { BillingService } from '../dist/rental/billing.service.js';

const access = { scope: async () => ({ organizationWide: true, propertyIds: [] }), assertLease: async () => 'property-1' };
const service = (repo) => new BillingService(repo, access);

const lease = {
  id: 'lease-1', startsAt: new Date('2026-01-01T00:00:00.000Z'), endsAt: new Date('2026-03-15T00:00:00.000Z'),
  terms: { rentAmount: 30000, securityDeposit: 60000, currency: 'INR' }, billingCalendar: null,
};

function repository(overrides = {}) {
  const calls = [];
  return {
    calls,
    managerMembership: async () => ({ id: 'membership-1' }),
    findLease: async () => lease,
    findCalendar: async () => null,
    lastSchedule: async () => null,
    listSchedules: async () => [],
    transaction: async (callback) => callback({
      leaseBillingCalendar: { create: async ({ data }) => ({ id: 'calendar-1', ...data }), update: async () => ({}) },
      leaseRentSchedule: { create: async ({ data }) => ({ id: `schedule-${data.sequence}`, ...data }) },
      leaseSecurityDeposit: { upsert: async ({ create }) => ({ id: 'deposit-1', ...create }) },
    }),
    audit: async (...args) => calls.push(args),
    ...overrides,
  };
}

test('rejects a custom billing cycle without its interval', async () => {
  const billing = service(repository());
  await assert.rejects(() => billing.create('actor-1', 'organization-1', 'lease-1', { billingCycle: 'CUSTOM' }));
});

test('generates monthly planning rows and prorates a partial final period', async () => {
  const repo = repository({ findLease: async () => ({ ...lease, billingCalendar: { id: 'calendar-1', billingCycle: 'MONTHLY', customIntervalDays: null, dueDaysAfterPeriodStart: 3, prorationMethod: 'DAILY', status: 'ACTIVE', escalationRules: [] } }) });
  const rows = await service(repo).generateSchedules('actor-1', 'organization-1', 'lease-1', { throughAt: '2026-03-15T00:00:00.000Z' });
  assert.equal(rows.length, 3);
  assert.equal(rows[0].totalDue, 30000);
  assert.ok(rows[2].prorationAmount > 0);
  assert.equal(repo.calls[0][3], 'lease.rent_schedule.generated');
});

test('includes effective percentage escalation in generated schedule totals', () => {
  const billing = service(repository());
  const rows = billing.buildSchedules(lease, { id: 'calendar-1', billingCycle: 'MONTHLY', customIntervalDays: null, dueDaysAfterPeriodStart: 0, prorationMethod: 'NONE', escalationRules: [{ effectiveAt: new Date('2026-01-01T00:00:00.000Z'), type: 'PERCENTAGE', amount: 10 }] }, null, new Date('2026-02-01T00:00:00.000Z'));
  assert.equal(rows[0].escalationAmount, 3000);
  assert.equal(rows[0].totalDue, 33000);
});

test('rejects a security-deposit refund above the held amount', async () => {
  const repo = repository({ findCalendar: async () => ({ id: 'calendar-1', securityDeposit: { heldAmount: 1000, refundedAmount: 0 } }) });
  await assert.rejects(() => service(repo).updateDeposit('actor-1', 'organization-1', 'lease-1', { refundedAmount: 1001 }));
});
