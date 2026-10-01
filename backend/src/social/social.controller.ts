import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { PaginationDto } from '../likes/dto/likes.dto';
import { FavoritesService } from './favorites.service';
import { VisitsService } from './visits.service';
import { InterestsService } from './interests.service';
import { SendInterestDto, InterestListQueryDto } from './dto/social.dto';

@ApiTags('Favorites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  @ApiOperation({ summary: 'Profiles I added to favorites' })
  getFavorites(@CurrentUser() user: User, @Query() dto: PaginationDto) {
    return this.favoritesService.getFavorites(user.id, dto);
  }

  @Get('favorited-by')
  @ApiOperation({ summary: 'People who added me to their favorites' })
  getFavoritedBy(@CurrentUser() user: User, @Query() dto: PaginationDto) {
    return this.favoritesService.getFavoritedBy(user.id, dto);
  }

  @Post(':userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add or remove a profile from favorites (toggle)' })
  toggle(@CurrentUser() user: User, @Param('userId', ParseUUIDPipe) userId: string) {
    return this.favoritesService.toggleFavorite(user.id, userId);
  }
}

@ApiTags('Profile visits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('visits')
export class VisitsController {
  constructor(private readonly visitsService: VisitsService) {}

  @Get('viewers')
  @ApiOperation({ summary: 'People who viewed my profile' })
  getViewers(@CurrentUser() user: User, @Query() dto: PaginationDto) {
    return this.visitsService.getViewers(user.id, dto);
  }

  @Get('visited')
  @ApiOperation({ summary: 'Profiles I viewed' })
  getVisited(@CurrentUser() user: User, @Query() dto: PaginationDto) {
    return this.visitsService.getVisited(user.id, dto);
  }
}

@ApiTags('Interests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('interests')
export class InterestsController {
  constructor(private readonly interestsService: InterestsService) {}

  @Get('received')
  @ApiOperation({ summary: 'Interests I received (filter by status)' })
  getReceived(@CurrentUser() user: User, @Query() dto: InterestListQueryDto) {
    return this.interestsService.getReceived(user.id, dto);
  }

  @Get('received/pending-count')
  @ApiOperation({ summary: 'Number of interests waiting for my reply' })
  async getPendingCount(@CurrentUser() user: User) {
    return { count: await this.interestsService.getPendingReceivedCount(user.id) };
  }

  @Get('sent')
  @ApiOperation({ summary: 'Interests I sent (filter by status)' })
  getSent(@CurrentUser() user: User, @Query() dto: InterestListQueryDto) {
    return this.interestsService.getSent(user.id, dto);
  }

  @Get('history')
  @ApiOperation({ summary: 'All interests I sent or received' })
  getHistory(@CurrentUser() user: User, @Query() dto: PaginationDto) {
    return this.interestsService.getHistory(user.id, dto);
  }

  @Get('status/:userId')
  @ApiOperation({ summary: 'Latest interest in each direction between me and a member' })
  getStatus(@CurrentUser() user: User, @Param('userId', ParseUUIDPipe) userId: string) {
    return this.interestsService.getStatusWith(user.id, userId);
  }

  @Post(':userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send an interest: smile, rose, coffee or bear (free, daily limit)' })
  send(
    @CurrentUser() user: User,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: SendInterestDto,
  ) {
    return this.interestsService.sendInterest(user.id, userId, dto.type);
  }

  @Post(':interestId/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept an interest I received' })
  accept(@CurrentUser() user: User, @Param('interestId', ParseUUIDPipe) interestId: string) {
    return this.interestsService.acceptInterest(user.id, interestId);
  }

  @Post(':interestId/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Decline an interest I received' })
  reject(@CurrentUser() user: User, @Param('interestId', ParseUUIDPipe) interestId: string) {
    return this.interestsService.rejectInterest(user.id, interestId);
  }
}
