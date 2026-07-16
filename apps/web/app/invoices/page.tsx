'use client';

import { date, EntityList, money, text } from '@/components/management/entity-list';

export default function InvoicesPage(): React.ReactElement {
  return <EntityList entity="invoices" title="Invoices" description="Invoice status and outstanding balances." path="invoices" columns={[
    { label: 'Invoice', value: (row) => <span className="font-medium">{text(row.number ?? row.invoiceNumber)}</span> },
    { label: 'Status', value: (row) => text(row.status) },
    { label: 'Issued', value: (row) => date(row.issuedAt) },
    { label: 'Due', value: (row) => date(row.dueAt) },
    { label: 'Total', value: (row) => money(row.totalAmount, text(row.currency, 'INR')) },
    { label: 'Outstanding', value: (row) => money(row.outstandingBalance, text(row.currency, 'INR')) },
  ]} />;
}
