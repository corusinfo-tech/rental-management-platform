'use client';

import { date, EntityList, money, text } from '@/components/management/entity-list';

export default function PaymentsPage(): React.ReactElement {
  return <EntityList entity="payments" title="Payments" description="Payments, allocations, and receipt status." path="payments" columns={[
    { label: 'Payment', value: (row) => <span className="font-medium">{text(row.number ?? row.paymentNumber ?? row.id)}</span> },
    { label: 'Status', value: (row) => text(row.status) },
    { label: 'Method', value: (row) => text(row.method) },
    { label: 'Purpose', value: (row) => text(row.purpose) },
    { label: 'Paid', value: (row) => date(row.paidAt) },
    { label: 'Amount', value: (row) => money(row.amount, text(row.currency, 'INR')) },
  ]} />;
}
