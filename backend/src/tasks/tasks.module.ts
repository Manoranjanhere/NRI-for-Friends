import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksService } from './tasks.service';
import { User } from '../users/entities/user.entity';
import { Message } from '../messages/entities/message.entity';
import { DevicesModule } from '../devices/devices.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, Message]), DevicesModule],
  providers: [TasksService],
})
export class TasksModule {}
