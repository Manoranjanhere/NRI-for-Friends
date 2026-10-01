import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Favorite } from './entities/favorite.entity';
import { ProfileVisit } from './entities/profile-visit.entity';
import { Interest } from './entities/interest.entity';
import { User } from '../users/entities/user.entity';
import { UserPhoto } from '../users/entities/user-photo.entity';
import { DevicesModule } from '../devices/devices.module';
import { MessagesModule } from '../messages/messages.module';
import { CoinsModule } from '../coins/coins.module';
import { FavoritesService } from './favorites.service';
import { VisitsService } from './visits.service';
import { InterestsService } from './interests.service';
import { FavoritesController, VisitsController, InterestsController } from './social.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Favorite, ProfileVisit, Interest, User, UserPhoto]),
    DevicesModule,
    MessagesModule,
    CoinsModule,
  ],
  controllers: [FavoritesController, VisitsController, InterestsController],
  providers: [FavoritesService, VisitsService, InterestsService],
  exports: [FavoritesService, VisitsService, InterestsService],
})
export class SocialModule {}
