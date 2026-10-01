import { Body, Controller, Get, HttpCode, HttpStatus, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../admin/guards/admin.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { FeedService } from './feed.service';

class SetFeedEnabledDto {
  @IsBoolean()
  enabled: boolean;
}

@ApiTags('Feed')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get()
  @ApiOperation({ summary: 'Feed items (empty when the admin has switched the feed off)' })
  getFeed() {
    return this.feedService.getFeed();
  }

  @Get('status')
  @ApiOperation({ summary: 'Whether the Feed tab should be shown' })
  async getStatus() {
    return { enabled: await this.feedService.isEnabled() };
  }
}

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/feed')
export class AdminFeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get()
  @ApiOperation({ summary: 'Feed switch state' })
  async getSetting() {
    return { enabled: await this.feedService.isEnabled() };
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Turn the Feed section on or off for everyone' })
  setSetting(@Body() dto: SetFeedEnabledDto, @CurrentUser() admin: User) {
    return this.feedService.setEnabled(dto.enabled, admin.id);
  }
}
