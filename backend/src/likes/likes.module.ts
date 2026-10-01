import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LikesController } from './likes.controller';
import { LikesService } from './likes.service';
import { Like } from './entities/like.entity';
import { User } from '../users/entities/user.entity';
import { UserPhoto } from '../users/entities/user-photo.entity';
import { Block } from '../blocks/entities/block.entity';
import { DevicesModule } from '../devices/devices.module';
import { CoinsModule } from '../coins/coins.module';
import { MessagesModule } from '../messages/messages.module';
import { SocialModule } from '../social/social.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Like, User, UserPhoto, Block]),
    DevicesModule,
    CoinsModule,
    MessagesModule,
    SocialModule,
  ],
  controllers: [LikesController],
  providers: [LikesService],
  exports: [LikesService],
})
export class LikesModule {}
