export type ApiSuccess<T> = { success: true; data: T; meta?: { page?: number; limit?: number; total?: number } };
export type ApiFailure = { success: false; error: { code: string; message: string | string[]; traceId?: string } };
export type AgreementStatus = 'DRAFT' | 'ACTIVE' | 'VACATED' | 'CANCELLED' | 'EXPIRED';
export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'VOID' | 'OVERDUE';
