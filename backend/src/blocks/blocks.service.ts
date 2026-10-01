import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Block } from './entities/block.entity';
import { User } from '../users/entities/user.entity';
import { UserPhoto } from '../users/entities/user-photo.entity';
import { loadPublicProfiles } from '../users/public-profile';

@Injectable()
export class BlocksService {
  constructor(
    @InjectRepository(Block)
    private readonly blockRepository: Repository<Block>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserPhoto)
    private readonly photoRepository: Repository<UserPhoto>,
  ) {}

  async toggleBlock(blockerId: string, blockedId: string): Promise<{ blocked: boolean }> {
    if (blockerId === blockedId) throw new BadRequestException('You cannot block yourself');
    const target = await this.userRepository.findOne({ where: { id: blockedId } });
    if (!target) throw new NotFoundException('User not found');

    const existing = await this.blockRepository.findOne({
      where: { blockerId, blockedId },
    });

    if (existing) {
      await this.blockRepository.remove(existing);
      return { blocked: false };
    }

    await this.blockRepository.manager.transaction(async (em) => {
      await em.save(this.blockRepository.create({ blockerId, blockedId }));
      // A block ends every open connection between the two members.
      await em.query(
        `DELETE FROM favorites
          WHERE ("userId" = $1 AND "favoriteUserId" = $2) OR ("userId" = $2 AND "favoriteUserId" = $1)`,
        [blockerId, blockedId],
      );
      await em.query(
        `UPDATE interests SET status = 'rejected', "respondedAt" = NOW()
          WHERE status = 'pending'
            AND (("senderId" = $1 AND "recipientId" = $2) OR ("senderId" = $2 AND "recipientId" = $1))`,
        [blockerId, blockedId],
      );
    });
    return { blocked: true };
  }

  async isBlocked(userId1: string, userId2: string): Promise<boolean> {
    const block = await this.blockRepository.findOne({
      where: [
        { blockerId: userId1, blockedId: userId2 },
        { blockerId: userId2, blockedId: userId1 },
      ],
    });
    return !!block;
  }

  async getBlockedList(userId: string) {
    const blocks = await this.blockRepository.find({
      where: { blockerId: userId },
      order: { createdAt: 'DESC' },
    });

    const profiles = await loadPublicProfiles(
      this.userRepository,
      this.photoRepository,
      blocks.map((b) => b.blockedId),
    );
    return blocks
      .filter((b) => profiles.has(b.blockedId))
      .map((b) => ({ ...profiles.get(b.blockedId)!, blockedAt: b.createdAt }));
  }

  async getBlockedIds(userId: string): Promise<string[]> {
    const blocks = await this.blockRepository.find({ where: { blockerId: userId } });
    const blockedByBlocks = await this.blockRepository.find({ where: { blockedId: userId } });
    return [
      ...blocks.map((b) => b.blockedId),
      ...blockedByBlocks.map((b) => b.blockerId),
    ];
  }
}
