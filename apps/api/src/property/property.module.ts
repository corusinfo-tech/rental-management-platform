import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { PropertyController } from './property.controller';
import { PropertyRepository } from './property.repository';
import { PropertyService } from './property.service';

@Module({ imports: [IdentityModule], controllers: [PropertyController], providers: [PropertyRepository, PropertyService] })
export class PropertyModule {}
