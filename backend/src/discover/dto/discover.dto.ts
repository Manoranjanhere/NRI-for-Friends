import { IsOptional, IsNumber, IsEnum, IsInt, Min, Max, IsIn, IsBoolean, IsString, MaxLength } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { UserGender } from '../../users/entities/user.entity';
import {
  RELATIONSHIP_STATUSES,
  LOOKING_FOR_OPTIONS,
  MOTHER_TONGUES,
  RELIGIONS,
} from '../../users/profile-options';

// Query strings arrive as text; `@Type(() => Boolean)` would turn "false" into true.
const toBoolean = ({ value }: { value: unknown }) => value === true || value === 'true';

export class UpdateLocationDto {
  @ApiProperty({ example: 43.6532 })
  @IsNumber()
  latitude: number;

  @ApiProperty({ example: -79.3832 })
  @IsNumber()
  longitude: number;
}

export class DiscoverQueryDto {
  @ApiProperty({ required: false, default: 50, description: 'Max distance in km (Nearby always applies it; other lists only when sent)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  maxDistance?: number;

  @ApiProperty({ required: false, default: 18 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(18)
  @Max(80)
  minAge?: number = 18;

  @ApiProperty({ required: false, default: 80 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(18)
  @Max(80)
  maxAge?: number = 80;

  @ApiProperty({ required: false, enum: UserGender })
  @IsOptional()
  @IsEnum(UserGender)
  gender?: UserGender;

  @ApiProperty({ required: false, enum: RELATIONSHIP_STATUSES })
  @IsOptional()
  @IsIn([...RELATIONSHIP_STATUSES])
  relationshipStatus?: string;

  @ApiProperty({ required: false, enum: LOOKING_FOR_OPTIONS })
  @IsOptional()
  @IsIn([...LOOKING_FOR_OPTIONS])
  lookingFor?: string;

  @ApiProperty({ required: false, enum: MOTHER_TONGUES })
  @IsOptional()
  @IsIn([...MOTHER_TONGUES])
  motherTongue?: string;

  @ApiProperty({ required: false, enum: RELIGIONS })
  @IsOptional()
  @IsIn([...RELIGIONS])
  religion?: string;

  @ApiProperty({ required: false, description: 'Country the member lives in' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiProperty({ required: false, description: 'City the member grew up in' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  grewUpCity?: string;

  @ApiProperty({ required: false, description: 'Only members with at least one photo' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  photoOnly?: boolean;

  @ApiProperty({ required: false, description: 'Only photo-verified members' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  verifiedOnly?: boolean;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}
