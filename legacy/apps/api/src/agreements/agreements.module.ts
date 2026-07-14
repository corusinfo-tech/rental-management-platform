import { Module } from '@nestjs/common'; import { AgreementsController } from './agreements.controller'; import { AgreementsService } from './agreements.service'; import { AuthModule } from '../auth/auth.module';
@Module({ imports: [AuthModule], controllers: [AgreementsController], providers: [AgreementsService], exports: [AgreementsService] }) export class AgreementsModule {}
