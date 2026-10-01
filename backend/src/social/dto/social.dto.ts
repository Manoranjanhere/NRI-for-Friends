import { IsIn, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { INTEREST_TYPES, InterestStatus, InterestType } from '../entities/interest.entity';
import { PaginationDto } from '../../likes/dto/likes.dto';

export class SendInterestDto {
  @ApiProperty({ enum: INTEREST_TYPES, example: 'coffee' })
  @IsIn([...INTEREST_TYPES])
  type: InterestType;
}

export class InterestListQueryDto extends PaginationDto {
  @ApiProperty({ required: false, enum: InterestStatus })
  @IsOptional()
  @IsIn(Object.values(InterestStatus))
  status?: InterestStatus;
}
