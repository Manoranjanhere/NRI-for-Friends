import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppSetting } from './entities/app-setting.entity';
import { FeedService } from './feed.service';
import { FeedController, AdminFeedController } from './feed.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AppSetting])],
  controllers: [FeedController, AdminFeedController],
  providers: [FeedService],
  exports: [FeedService],
})
export class FeedModule {}
