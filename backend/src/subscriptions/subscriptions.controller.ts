import { Controller, Get, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

import { SubscriptionsService } from './subscriptions.service';
import { VerifyGooglePlaySubscriptionDto } from './dto/subscription.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  @ApiOperation({ summary: 'The single NRI Friends plan, trial length and Google Play product IDs' })
  getPlans() {
    return this.subscriptionsService.getPlans();
  }

  @Get('play-catalog')
  @ApiOperation({ summary: 'Google Play SKU catalog (package name + product IDs)' })
  getPlayCatalog() {
    return this.subscriptionsService.getPlayCatalog();
  }

  @Get('feature-flags')
  @ApiOperation({ summary: 'Public feature flags (paid bypass, etc.)' })
  getFeatureFlags() {
    return this.subscriptionsService.getFeatureFlags();
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Membership status: active, on trial, days left' })
  getStatus(@CurrentUser() user: User) {
    return this.subscriptionsService.getMembershipStatus(user.id);
  }

  @Get('current')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current active paid subscription' })
  getCurrent(@CurrentUser() user: User) {
    return this.subscriptionsService.getCurrentSubscription(user.id);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get subscription history' })
  getHistory(@CurrentUser() user: User) {
    return this.subscriptionsService.getSubscriptionHistory(user.id);
  }

  @Post('google-play/verify-subscription')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify Google Play subscription and activate membership' })
  verifyPlaySubscription(
    @CurrentUser() user: User,
    @Body() dto: VerifyGooglePlaySubscriptionDto,
  ) {
    return this.subscriptionsService.verifyGooglePlaySubscription(
      user.id,
      dto.productId,
      dto.purchaseToken,
    );
  }
}
