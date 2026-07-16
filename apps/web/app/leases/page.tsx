'use client';

import { date, EntityList, money, text } from '@/components/management/entity-list';

export default function LeasesPage(): React.ReactElement {
  return <EntityList entity="leases" title="Leases" description="Lease records for the current organization." path="leases" columns={[
    { label: 'Lease', value: (row) => <span className="font-medium">{text(row.code)}</span> },
    { label: 'Status', value: (row) => text(row.status) },
    { label: 'Starts', value: (row) => date(row.startsAt) },
    { label: 'Ends', value: (row) => date(row.endsAt) },
    { label: 'Rent', value: (row) => { const terms = row.terms as Record<string, unknown> | undefined; return money(terms?.rentAmount, text(terms?.currency, 'INR')); } },
  ]} />;
}
