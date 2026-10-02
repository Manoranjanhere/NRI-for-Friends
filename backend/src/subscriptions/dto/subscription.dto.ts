import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Verify a Google Play subscription purchase from the app */
export class VerifyGooglePlaySubscriptionDto {
  @ApiProperty({ example: 'nrifriends_premium_1m' })
  @IsString()
  productId: string;

  @ApiProperty({ description: 'purchaseToken from Google Play' })
  @IsString()
  purchaseToken: string;

  @ApiProperty({ required: false, example: 'com.nriconnectfriends.app' })
  @IsOptional()
  @IsString()
  packageName?: string;
}
