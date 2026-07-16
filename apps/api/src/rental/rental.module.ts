import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { BillingController } from './billing.controller';
import { BillingRepository } from './billing.repository';
import { BillingService } from './billing.service';
import { LeaseController } from './lease.controller';
import { LeaseRepository } from './lease.repository';
import { LeaseService } from './lease.service';

@Module({ imports: [IdentityModule], controllers: [LeaseController, BillingController], providers: [LeaseRepository, LeaseService, BillingRepository, BillingService] })
export class RentalModule {}
