import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from './entities/favorite.entity';
import { User } from '../users/entities/user.entity';
import { UserPhoto } from '../users/entities/user-photo.entity';
import { DevicesService } from '../devices/devices.service';
import { loadPublicProfiles } from '../users/public-profile';
import { PaginationDto } from '../likes/dto/likes.dto';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite)
    private readonly favoriteRepository: Repository<Favorite>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserPhoto)
    private readonly photoRepository: Repository<UserPhoto>,
    private readonly devicesService: DevicesService,
  ) {}

  async toggleFavorite(userId: string, targetId: string): Promise<{ favorited: boolean }> {
    if (userId === targetId) throw new BadRequestException('You cannot favorite yourself');

    const target = await this.userRepository.findOne({ where: { id: targetId } });
    if (!target || !target.isActive || target.isBanned) throw new NotFoundException('User not found');

    const existing = await this.favoriteRepository.findOne({
      where: { userId, favoriteUserId: targetId },
    });
    if (existing) {
      await this.favoriteRepository.remove(existing);
      return { favorited: false };
    }

    await this.favoriteRepository.save(
      this.favoriteRepository.create({ userId, favoriteUserId: targetId }),
    );

    const me = await this.userRepository.findOne({ where: { id: userId }, select: ['id', 'name'] });
    await this.devicesService.sendPushToUser(targetId, {
      title: '⭐ Someone added you to favorites',
      body: `${me?.name || 'A member'} added you to their favorites`,
      data: { type: 'favorite', userId },
    });

    return { favorited: true };
  }

  async isFavorite(userId: string, targetId: string): Promise<boolean> {
    return !!(await this.favoriteRepository.findOne({ where: { userId, favoriteUserId: targetId } }));
  }

  async getFavorites(userId: string, dto: PaginationDto) {
    return this.list('userId', 'favoriteUserId', userId, dto);
  }

  async getFavoritedBy(userId: string, dto: PaginationDto) {
    return this.list('favoriteUserId', 'userId', userId, dto);
  }

  private async list(
    ownerField: 'userId' | 'favoriteUserId',
    otherField: 'userId' | 'favoriteUserId',
    userId: string,
    dto: PaginationDto,
  ) {
    const { page = 1, limit = 20 } = dto;
    const [rows, total] = await this.favoriteRepository.findAndCount({
      where: { [ownerField]: userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const profiles = await loadPublicProfiles(
      this.userRepository,
      this.photoRepository,
      rows.map((r) => r[otherField]),
    );

    const users = rows
      .filter((r) => profiles.has(r[otherField]))
      .map((r) => ({ ...profiles.get(r[otherField])!, favoritedAt: r.createdAt }));

    return { users, total, page, limit, pages: Math.ceil(total / limit) };
  }
}
