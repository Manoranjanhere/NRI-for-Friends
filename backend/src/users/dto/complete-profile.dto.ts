import {
  IsString,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsEmail,
  IsOptional,
  Length,
  IsArray,
  ArrayMaxSize,
  ArrayMinSize,
  IsBoolean,
  IsIn,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { UserGender } from '../entities/user.entity';
import {
  RELATIONSHIP_STATUSES,
  LOOKING_FOR_OPTIONS,
  INTERESTED_IN_OPTIONS,
  MOTHER_TONGUES,
  RELIGIONS,
  EDUCATION_LEVELS,
  PROFESSIONS,
  PASSIONS,
  MAX_PASSIONS,
  MAX_LOOKING_FOR,
  MIN_HEIGHT_CM,
  MAX_HEIGHT_CM,
} from '../profile-options';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** Used for both first-time signup (stage 1) and later profile edits. */
export class CompleteStage1Dto {
  // ─── Basics ───────────────────────────────────────────────────────────────
  @ApiProperty({ example: 'Priya' })
  @Transform(trim)
  @IsString()
  @Length(2, 60)
  name: string;

  @ApiProperty({ enum: UserGender })
  @IsEnum(UserGender)
  gender: UserGender;

  @ApiProperty({ example: 29, minimum: 18, maximum: 80 })
  @IsInt()
  @Min(18)
  @Max(80)
  age: number;

  @ApiProperty({ example: 'Toronto', description: 'City the member lives in now' })
  @Transform(trim)
  @IsString()
  @Length(2, 100)
  city: string;

  @ApiProperty({ example: 'Canada', description: 'Country the member lives in now' })
  @Transform(trim)
  @IsString()
  @Length(2, 100)
  country: string;

  @ApiProperty({ example: 'Pune', description: 'City the member grew up in' })
  @Transform(trim)
  @IsString()
  @Length(2, 100)
  grewUpCity: string;

  @ApiProperty({ enum: RELATIONSHIP_STATUSES })
  @IsIn([...RELATIONSHIP_STATUSES])
  relationshipStatus: string;

  @ApiProperty({ enum: LOOKING_FOR_OPTIONS, isArray: true, example: ['friendship'] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_LOOKING_FOR)
  @IsIn([...LOOKING_FOR_OPTIONS], { each: true })
  lookingFor: string[];

  @ApiProperty({ enum: INTERESTED_IN_OPTIONS, description: 'Who they want to befriend' })
  @IsIn([...INTERESTED_IN_OPTIONS])
  interestedIn: string;

  @ApiProperty({ enum: MOTHER_TONGUES })
  @IsIn([...MOTHER_TONGUES])
  motherTongue: string;

  @ApiProperty({ example: 'Product Manager at a fintech', description: 'Job title / role' })
  @Transform(trim)
  @IsString()
  @Length(2, 80)
  jobProfile: string;

  // ─── Optional details ─────────────────────────────────────────────────────
  @ApiProperty({ required: false, enum: RELIGIONS })
  @IsOptional()
  @IsIn([...RELIGIONS])
  religion?: string;

  @ApiProperty({ required: false, enum: EDUCATION_LEVELS })
  @IsOptional()
  @IsIn([...EDUCATION_LEVELS])
  education?: string;

  @ApiProperty({ required: false, enum: PROFESSIONS })
  @IsOptional()
  @IsIn([...PROFESSIONS])
  profession?: string;

  @ApiProperty({ required: false, example: '₹10–20 LPA', description: 'Salary range label' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(40)
  salaryRange?: string;

  @ApiProperty({ required: false, description: 'Hide salary from other members' })
  @IsOptional()
  @IsBoolean()
  hideSalary?: boolean;

  @ApiProperty({ required: false, minimum: MIN_HEIGHT_CM, maximum: MAX_HEIGHT_CM })
  @IsOptional()
  @IsInt()
  @Min(MIN_HEIGHT_CM)
  @Max(MAX_HEIGHT_CM)
  heightCm?: number;

  @ApiProperty({ required: false, isArray: true, enum: PASSIONS, example: ['Painting', 'Dancing'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_PASSIONS)
  @IsIn([...PASSIONS], { each: true })
  passions?: string[];

  @ApiProperty({ required: false, description: 'Short bio (max 300 chars)' })
  @IsOptional()
  @IsString()
  @Length(0, 300)
  bio?: string;

  @ApiProperty({ example: 'priya@gmail.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false, description: 'Referral code from a friend' })
  @IsOptional()
  @IsString()
  @Length(6, 6)
  referredByCode?: string;
}
