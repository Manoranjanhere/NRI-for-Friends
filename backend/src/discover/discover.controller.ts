import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards, HttpCode, HttpStatus, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DiscoverService } from './discover.service';
import { UpdateLocationDto, DiscoverQueryDto } from './dto/discover.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Discover')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('discover')
export class DiscoverController {
  constructor(private readonly discoverService: DiscoverService) {}

  @Patch('location')
  @ApiOperation({ summary: 'Update current user location' })
  updateLocation(@CurrentUser() user: User, @Body() dto: UpdateLocationDto) {
    return this.discoverService.updateLocation(user.id, dto);
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Nearby members, closest first (hides people already liked or skipped)' })
  getNearby(@CurrentUser() user: User, @Query() dto: DiscoverQueryDto) {
    return this.discoverService.getNearby(user.id, dto);
  }

  @Get('recently-online')
  @ApiOperation({ summary: 'Members active in the last 72 hours, most recent first' })
  getRecentlyOnline(@CurrentUser() user: User, @Query() dto: DiscoverQueryDto) {
    return this.discoverService.getRecentlyOnline(user.id, dto);
  }

  @Get('new-users')
  @ApiOperation({ summary: 'Members who joined in the last 30 days, newest first' })
  getNewUsers(@CurrentUser() user: User, @Query() dto: DiscoverQueryDto) {
    return this.discoverService.getNewUsers(user.id, dto);
  }

  @Post('pass/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pass on a user (skip, do not show again)' })
  passUser(@CurrentUser() user: User, @Param('userId', ParseUUIDPipe) toUserId: string) {
    return this.discoverService.passUser(user.id, toUserId);
  }
}
