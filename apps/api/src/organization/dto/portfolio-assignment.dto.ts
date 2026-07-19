import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class SetPortfolioAssignmentsDto {
  @ApiProperty({
    type: [String],
    format: 'uuid',
    description: 'Complete replacement set of properties assigned to this membership.',
  })
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(1000)
  @IsUUID(undefined, { each: true })
  propertyIds!: string[];
}
