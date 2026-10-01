import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Interest, InterestStatus, InterestType } from './entities/interest.entity';
import { User } from '../users/entities/user.entity';
import { UserPhoto } from '../users/entities/user-photo.entity';
import { MessagesService } from '../messages/messages.service';
import { CoinsService } from '../coins/coins.service';
import { loadPublicProfiles } from '../users/public-profile';
import { DAILY_FREE_INTERESTS } from '../subscriptions/subscription.constants';
import { isPaidFeaturesDisabled } from '../common/guards/active-membership.guard';
import { InterestListQueryDto } from './dto/social.dto';
import { PaginationDto } from '../likes/dto/likes.dto';

export const INTEREST_LABELS: Record<InterestType, { emoji: string; label: string }> = {
  smile: { emoji: '😊', label: 'a smile' },
  rose: { emoji: '🌹', label: 'a rose' },
  coffee: { emoji: '☕', label: 'a coffee' },
  bear: { emoji: '🧸', label: 'a teddy bear' },
};

@Injectable()
export class InterestsService {
  constructor(
    @InjectRepository(Interest)
    private readonly interestRepository: Repository<Interest>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserPhoto)
    private readonly photoRepository: Repository<UserPhoto>,
    private readonly messagesService: MessagesService,
    private readonly coinsService: CoinsService,
  ) {}

  async sendInterest(senderId: string, recipientId: string, type: InterestType) {
    if (senderId === recipientId) throw new BadRequestException('You cannot send an interest to yourself');

    const recipient = await this.userRepository.findOne({ where: { id: recipientId } });
    if (!recipient || !recipient.isActive || recipient.isBanned) {
      throw new NotFoundException('User not found');
    }

    const alreadyPending = await this.interestRepository.findOne({
      where: { senderId, recipientId, status: InterestStatus.PENDING },
    });
    if (alreadyPending) {
      throw new ConflictException('You already sent an interest. Wait for them to reply.');
    }

    // If they already sent me an interest, sending one back simply accepts theirs.
    const theirs = await this.interestRepository.findOne({
      where: { senderId: recipientId, recipientId: senderId, status: InterestStatus.PENDING },
      order: { createdAt: 'DESC' },
    });
    if (theirs) {
      const accepted = await this.respond(senderId, theirs.id, InterestStatus.ACCEPTED);
      return { interest: accepted, autoAccepted: true, remainingToday: null };
    }

    const enforceQuota = !isPaidFeaturesDisabled();
    let used = 0;
    if (enforceQuota) {
      const sender = await this.coinsService.checkAndResetDailyQuotas(senderId);
      used = sender.dailyInterestCount || 0;
      if (used >= DAILY_FREE_INTERESTS) {
        throw new ForbiddenException(
          `You can send ${DAILY_FREE_INTERESTS} interests a day. Try again tomorrow.`,
        );
      }
    }

    const { emoji, label } = INTEREST_LABELS[type];
    // Deliver before storing or counting, so a block or inactive recipient costs nothing.
    await this.messagesService.deliverSpecialMessage({
      senderId,
      recipientId,
      content: `${emoji} Sent you ${label}`,
      kind: 'interest',
      push: { title: `${emoji} New interest`, type: 'interest' },
    });

    const interest = await this.interestRepository.save(
      this.interestRepository.create({ senderId, recipientId, type }),
    );

    let remainingToday: number | null = null;
    if (enforceQuota) {
      await this.userRepository.update(senderId, { dailyInterestCount: used + 1 });
      remainingToday = DAILY_FREE_INTERESTS - used - 1;
    }

    return { interest, autoAccepted: false, remainingToday };
  }

  async acceptInterest(userId: string, interestId: string) {
    return this.respond(userId, interestId, InterestStatus.ACCEPTED);
  }

  async rejectInterest(userId: string, interestId: string) {
    return this.respond(userId, interestId, InterestStatus.REJECTED);
  }

  private async respond(userId: string, interestId: string, status: InterestStatus) {
    const interest = await this.interestRepository.findOne({ where: { id: interestId } });
    if (!interest || interest.recipientId !== userId) throw new NotFoundException('Interest not found');
    if (interest.status !== InterestStatus.PENDING) {
      throw new ConflictException(`You already ${interest.status} this interest`);
    }

    interest.status = status;
    interest.respondedAt = new Date();
    await this.interestRepository.save(interest);

    if (status === InterestStatus.ACCEPTED) {
      const { emoji, label } = INTEREST_LABELS[interest.type];
      await this.messagesService.deliverSpecialMessage({
        senderId: userId,
        recipientId: interest.senderId,
        content: `🤝 Accepted your ${emoji} ${label.replace(/^an? /, '')}. Say hello!`,
        kind: 'interest_reply',
        push: { title: '🤝 Interest accepted', type: 'interest_accepted' },
      });
    }

    return interest;
  }

  /** Latest interest in each direction between me and another member. */
  async getStatusWith(userId: string, otherId: string) {
    const [sent, received] = await Promise.all([
      this.interestRepository.findOne({
        where: { senderId: userId, recipientId: otherId },
        order: { createdAt: 'DESC' },
      }),
      this.interestRepository.findOne({
        where: { senderId: otherId, recipientId: userId },
        order: { createdAt: 'DESC' },
      }),
    ]);
    return { sent: sent ?? null, received: received ?? null };
  }

  async getPendingReceivedCount(userId: string): Promise<number> {
    return this.interestRepository.count({
      where: { recipientId: userId, status: InterestStatus.PENDING },
    });
  }

  async getReceived(userId: string, dto: InterestListQueryDto) {
    return this.list({ recipientId: userId, ...(dto.status ? { status: dto.status } : {}) }, 'senderId', dto);
  }

  async getSent(userId: string, dto: InterestListQueryDto) {
    return this.list({ senderId: userId, ...(dto.status ? { status: dto.status } : {}) }, 'recipientId', dto);
  }

  /** Every interest I sent or received, newest first. */
  async getHistory(userId: string, dto: PaginationDto) {
    const { page = 1, limit = 20 } = dto;
    const [rows, total] = await this.interestRepository.findAndCount({
      where: [{ senderId: userId }, { recipientId: userId }],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    const otherIds = rows.map((r) => (r.senderId === userId ? r.recipientId : r.senderId));
    const profiles = await loadPublicProfiles(this.userRepository, this.photoRepository, otherIds);

    const items = rows
      .map((r) => {
        const direction = r.senderId === userId ? 'sent' : 'received';
        const otherId = direction === 'sent' ? r.recipientId : r.senderId;
        const user = profiles.get(otherId);
        return user ? { ...this.serialize(r), direction, user } : null;
      })
      .filter(Boolean);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  private async list(
    where: Partial<Pick<Interest, 'senderId' | 'recipientId' | 'status'>>,
    otherField: 'senderId' | 'recipientId',
    dto: PaginationDto,
  ) {
    const { page = 1, limit = 20 } = dto;
    const [rows, total] = await this.interestRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    const profiles = await loadPublicProfiles(
      this.userRepository,
      this.photoRepository,
      rows.map((r) => r[otherField]),
    );
    const items = rows
      .filter((r) => profiles.has(r[otherField]))
      .map((r) => ({ ...this.serialize(r), user: profiles.get(r[otherField])! }));

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  private serialize(interest: Interest) {
    const { emoji } = INTEREST_LABELS[interest.type];
    return {
      id: interest.id,
      type: interest.type,
      emoji,
      status: interest.status,
      createdAt: interest.createdAt,
      respondedAt: interest.respondedAt,
    };
  }
}
