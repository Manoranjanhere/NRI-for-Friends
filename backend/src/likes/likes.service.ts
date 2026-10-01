import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Like } from './entities/like.entity';
import { User } from '../users/entities/user.entity';
import { UserPhoto } from '../users/entities/user-photo.entity';
import { Block } from '../blocks/entities/block.entity';
import { ComplimentDto, PaginationDto, SuperLikeDto } from './dto/likes.dto';
import { DevicesService } from '../devices/devices.service';
import { CoinsService } from '../coins/coins.service';
import { MessagesService } from '../messages/messages.service';
import { CoinTxType } from '../coins/entities/coin-transaction.entity';
import { getDailyQuotasForTier, COIN_ACTION_COST } from '../subscriptions/subscription.constants';
import { assertActiveMembership, isPaidFeaturesDisabled } from '../common/guards/active-membership.guard';
import {
  loadPublicProfiles,
  toPublicProfile,
  withCacheBuster,
  isSameHometown,
} from '../users/public-profile';
import { FavoritesService } from '../social/favorites.service';
import { VisitsService } from '../social/visits.service';
import { InterestsService } from '../social/interests.service';

@Injectable()
export class LikesService {
  constructor(
    @InjectRepository(Like)
    private readonly likeRepository: Repository<Like>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserPhoto)
    private readonly photoRepository: Repository<UserPhoto>,
    @InjectRepository(Block)
    private readonly blockRepository: Repository<Block>,
    private readonly devicesService: DevicesService,
    private readonly coinsService: CoinsService,
    private readonly messagesService: MessagesService,
    private readonly favoritesService: FavoritesService,
    private readonly visitsService: VisitsService,
    private readonly interestsService: InterestsService,
  ) {}

  private async ensureTarget(fromUserId: string, toUserId: string): Promise<User> {
    if (fromUserId === toUserId) {
      throw new ConflictException('Cannot like yourself');
    }
    const target = await this.userRepository.findOne({ where: { id: toUserId } });
    if (!target || !target.isActive || target.isBanned) throw new NotFoundException('User not found');
    return target;
  }

  private async loadSender(userId: string): Promise<User> {
    const sender = await this.userRepository.findOne({ where: { id: userId } });
    if (!sender) throw new NotFoundException('User not found');
    return sender;
  }

  private async notifyLikeOrMatch(fromUserId: string, toUserId: string, senderName: string, targetName: string) {
    const mutualLike = await this.likeRepository.findOne({
      where: { fromUserId: toUserId, toUserId: fromUserId },
    });

    if (mutualLike) {
      await Promise.all([
        this.devicesService.sendPushToUser(toUserId, {
          title: "🤝 You're friends now!",
          body: `You and ${senderName} want to connect. Say hello!`,
          data: { type: 'match', userId: fromUserId },
        }),
        this.devicesService.sendPushToUser(fromUserId, {
          title: "🤝 You're friends now!",
          body: `You and ${targetName} want to connect. Say hello!`,
          data: { type: 'match', userId: toUserId },
        }),
      ]);
    } else {
      await this.devicesService.sendPushToUser(toUserId, {
        title: '👋 Someone wants to connect',
        body: `${senderName} liked your profile`,
        data: { type: 'like', userId: fromUserId },
      });
    }

    return { isMatch: !!mutualLike };
  }

  async likeUser(fromUserId: string, toUserId: string): Promise<{ liked: boolean; isMatch: boolean }> {
    const sender = await this.loadSender(fromUserId);
    const target = await this.ensureTarget(fromUserId, toUserId);

    const existing = await this.likeRepository.findOne({ where: { fromUserId, toUserId } });
    if (existing) {
      await this.likeRepository.remove(existing);
      return { liked: false, isMatch: false };
    }

    assertActiveMembership(sender, 'like profiles');

    await this.likeRepository.save(
      this.likeRepository.create({ fromUserId, toUserId, isSuperLike: false, complimentMessage: null }),
    );

    const notify = await this.notifyLikeOrMatch(
      fromUserId,
      toUserId,
      sender.name || 'Someone',
      target.name || 'a member',
    );
    return { liked: true, isMatch: notify.isMatch };
  }

  async superLikeUser(fromUserId: string, toUserId: string, dto: SuperLikeDto): Promise<{ liked: boolean; isMatch: boolean }> {
    const target = await this.ensureTarget(fromUserId, toUserId);
    let sender = await this.loadSender(fromUserId);
    assertActiveMembership(sender, 'send super likes');

    if (!isPaidFeaturesDisabled()) {
      sender = await this.coinsService.checkAndResetDailyQuotas(fromUserId);
      const superLikeQuota = getDailyQuotasForTier(sender.subscriptionTier ?? 0).superLikes;

      if ((sender.dailySuperLikeCount || 0) < superLikeQuota) {
        await this.userRepository.update(fromUserId, {
          dailySuperLikeCount: (sender.dailySuperLikeCount || 0) + 1,
        });
      } else {
        await this.coinsService.deductCoins(
          fromUserId,
          COIN_ACTION_COST,
          CoinTxType.SPENT_SUPER_LIKE,
          `Super like sent to ${target.name || 'a member'}`,
        );
      }
    }

    const complimentMessage = dto.message?.trim() || null;
    const existing = await this.likeRepository.findOne({ where: { fromUserId, toUserId } });
    if (existing) {
      existing.isSuperLike = true;
      if (complimentMessage) existing.complimentMessage = complimentMessage;
      await this.likeRepository.save(existing);
    } else {
      await this.likeRepository.save(
        this.likeRepository.create({ fromUserId, toUserId, isSuperLike: true, complimentMessage }),
      );
    }

    const notify = await this.notifyLikeOrMatch(
      fromUserId,
      toUserId,
      sender.name || 'Someone',
      target.name || 'a member',
    );

    await this.devicesService.sendPushToUser(toUserId, {
      title: '⭐ Super Like!',
      body: complimentMessage || `${sender.name || 'Someone'} sent you a super like`,
      data: { type: 'super_like', userId: fromUserId },
    });

    return { liked: true, isMatch: notify.isMatch };
  }

  async sendCompliment(
    fromUserId: string,
    toUserId: string,
    dto: ComplimentDto,
  ): Promise<{ sent: boolean; messageId: string }> {
    const target = await this.ensureTarget(fromUserId, toUserId);
    const message = dto.message?.trim();
    if (!message) throw new BadRequestException('Compliment message is required');

    const sender = await this.loadSender(fromUserId);
    assertActiveMembership(sender, 'send compliments');

    if (!isPaidFeaturesDisabled()) {
      const billedSender = await this.coinsService.checkAndResetDailyQuotas(fromUserId);
      const complimentQuota = getDailyQuotasForTier(billedSender.subscriptionTier ?? 0).compliments;

      if ((billedSender.dailyComplimentCount || 0) < complimentQuota) {
        await this.userRepository.update(fromUserId, {
          dailyComplimentCount: (billedSender.dailyComplimentCount || 0) + 1,
        });
      } else {
        await this.coinsService.deductCoins(
          fromUserId,
          COIN_ACTION_COST,
          CoinTxType.SPENT_COMPLIMENT,
          `Compliment sent to ${target.name || 'a member'}`,
        );
      }
    }

    const saved = await this.messagesService.deliverSpecialMessage({
      senderId: fromUserId,
      recipientId: toUserId,
      content: message,
      kind: 'compliment',
      push: { title: '💝 New compliment', type: 'compliment' },
    });

    return { sent: true, messageId: saved.id };
  }

  async getYouLiked(userId: string, dto: PaginationDto) {
    const { page = 1, limit = 20 } = dto;
    const [likes, total] = await this.likeRepository.findAndCount({
      where: { fromUserId: userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return this.likesToList(likes, 'toUserId', total, page, limit);
  }

  async getLikedBy(userId: string, dto: PaginationDto) {
    const { page = 1, limit = 20 } = dto;
    const [likes, total] = await this.likeRepository.findAndCount({
      where: { toUserId: userId },
      order: { isSuperLike: 'DESC', createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return this.likesToList(likes, 'fromUserId', total, page, limit);
  }

  private async likesToList(
    likes: Like[],
    otherField: 'fromUserId' | 'toUserId',
    total: number,
    page: number,
    limit: number,
  ) {
    const profiles = await loadPublicProfiles(
      this.userRepository,
      this.photoRepository,
      likes.map((l) => l[otherField]),
    );
    const users = likes
      .filter((l) => profiles.has(l[otherField]))
      .map((l) => ({
        ...profiles.get(l[otherField])!,
        likedAt: l.createdAt,
        isSuperLike: l.isSuperLike,
        complimentMessage: l.complimentMessage || null,
      }));
    return { users, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getUnseenLikedByCount(userId: string): Promise<number> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'likedBySeenAt'],
    });
    if (!user) return 0;

    const qb = this.likeRepository
      .createQueryBuilder('like')
      .where('like.toUserId = :userId', { userId });

    if (user.likedBySeenAt) {
      qb.andWhere('like.createdAt > :seenAt', { seenAt: user.likedBySeenAt });
    }

    return qb.getCount();
  }

  async markLikedBySeen(userId: string): Promise<void> {
    await this.userRepository.update(userId, { likedBySeenAt: new Date() });
  }

  async getMatches(userId: string, dto: PaginationDto) {
    const { page = 1, limit = 20 } = dto;
    const skip = (page - 1) * limit;

    const [rows, countResult] = await Promise.all([
      this.likeRepository.query(
        `
        SELECT l1."toUserId" AS "userId", GREATEST(l1."createdAt", l2."createdAt") AS "matchedAt"
        FROM likes l1
        INNER JOIN likes l2 ON l1."fromUserId" = l2."toUserId" AND l1."toUserId" = l2."fromUserId"
        WHERE l1."fromUserId" = $1
        ORDER BY "matchedAt" DESC
        LIMIT $2 OFFSET $3
        `,
        [userId, limit, skip],
      ),
      this.likeRepository.query(
        `
        SELECT COUNT(*)::int AS total
        FROM likes l1
        INNER JOIN likes l2 ON l1."fromUserId" = l2."toUserId" AND l1."toUserId" = l2."fromUserId"
        WHERE l1."fromUserId" = $1
        `,
        [userId],
      ),
    ]);

    const profiles = await loadPublicProfiles(
      this.userRepository,
      this.photoRepository,
      rows.map((r: { userId: string }) => r.userId),
    );
    const users = rows
      .filter((r: { userId: string }) => profiles.has(r.userId))
      .map((r: { userId: string; matchedAt: Date }) => ({ ...profiles.get(r.userId)!, matchedAt: r.matchedAt }));

    const total = parseInt(countResult[0]?.total || '0', 10);
    return { users, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getFullProfile(viewerId: string, targetUserId: string) {
    const [user, viewer] = await Promise.all([
      this.userRepository.findOne({ where: { id: targetUserId } }),
      this.userRepository.findOne({ where: { id: viewerId }, select: ['id', 'grewUpCity'] }),
    ]);
    if (!user || !user.isActive || user.isBanned) throw new NotFoundException('User not found');

    const isOwnProfile = viewerId === targetUserId;
    let blockedByMe = false;
    if (!isOwnProfile) {
      const blocks = await this.blockRepository.find({
        where: [
          { blockerId: targetUserId, blockedId: viewerId },
          { blockerId: viewerId, blockedId: targetUserId },
        ],
      });
      if (blocks.some((b) => b.blockerId === targetUserId)) throw new NotFoundException('User not found');
      blockedByMe = blocks.length > 0;
    }

    const [photos, like, likedMe, isFavorite, interestStatus] = await Promise.all([
      this.photoRepository.find({ where: { userId: targetUserId }, order: { order: 'ASC' } }),
      this.likeRepository.findOne({ where: { fromUserId: viewerId, toUserId: targetUserId } }),
      this.likeRepository.findOne({ where: { fromUserId: targetUserId, toUserId: viewerId } }),
      this.favoritesService.isFavorite(viewerId, targetUserId),
      this.interestsService.getStatusWith(viewerId, targetUserId),
      isOwnProfile || blockedByMe ? Promise.resolve() : this.visitsService.recordVisit(viewerId, targetUserId),
    ]);

    return {
      ...toPublicProfile(user),
      photos: photos.map((photo) => ({ ...photo, url: withCacheBuster(photo.url, photo.id) })),
      hasLiked: !!like,
      likedMe: !!likedMe,
      isFriend: !!like && !!likedMe,
      isSuperLike: !!like?.isSuperLike,
      complimentMessage: like?.complimentMessage || null,
      isFavorite,
      interestSent: interestStatus.sent,
      interestReceived: interestStatus.received,
      sameHometown: !isOwnProfile && isSameHometown(viewer?.grewUpCity, user.grewUpCity),
      isOwnProfile,
      blockedByMe,
    };
  }
}
