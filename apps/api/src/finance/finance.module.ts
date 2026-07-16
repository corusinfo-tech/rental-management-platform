import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { InvoiceController } from './invoice.controller';
import { InvoiceRepository } from './invoice.repository';
import { InvoiceService } from './invoice.service';
import { PaymentController } from './payment.controller';
import { PaymentRepository } from './payment.repository';
import { PaymentService } from './payment.service';

@Module({ imports: [IdentityModule], controllers: [InvoiceController, PaymentController], providers: [InvoiceRepository, InvoiceService, PaymentRepository, PaymentService] })
export class FinanceModule {}
