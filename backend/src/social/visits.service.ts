import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileVisit } from './entities/profile-visit.entity';
import { User } from '../users/entities/user.entity';
import { UserPhoto } from '../users/entities/user-photo.entity';
import { loadPublicProfiles } from '../users/public-profile';
import { PaginationDto } from '../likes/dto/likes.dto';

@Injectable()
export class VisitsService {
  constructor(
    @InjectRepository(ProfileVisit)
    private readonly visitRepository: Repository<ProfileVisit>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserPhoto)
    private readonly photoRepository: Repository<UserPhoto>,
  ) {}

  async recordVisit(visitorId: string, visitedId: string): Promise<void> {
    if (visitorId === visitedId) return;
    await this.visitRepository.query(
      `
      INSERT INTO profile_visits ("visitorId", "visitedId", "visitCount", "lastVisitedAt")
      VALUES ($1, $2, 1, NOW())
      ON CONFLICT ("visitorId", "visitedId")
      DO UPDATE SET "visitCount" = profile_visits."visitCount" + 1, "lastVisitedAt" = NOW()
      `,
      [visitorId, visitedId],
    );
  }

  /** People who viewed my profile, most recent first. */
  async getViewers(userId: string, dto: PaginationDto) {
    return this.list('visitedId', 'visitorId', userId, dto);
  }

  /** Profiles I viewed, most recent first. */
  async getVisited(userId: string, dto: PaginationDto) {
    return this.list('visitorId', 'visitedId', userId, dto);
  }

  async getViewerCount(userId: string): Promise<number> {
    return this.visitRepository.count({ where: { visitedId: userId } });
  }

  private async list(
    ownerField: 'visitorId' | 'visitedId',
    otherField: 'visitorId' | 'visitedId',
    userId: string,
    dto: PaginationDto,
  ) {
    const { page = 1, limit = 20 } = dto;
    const [rows, total] = await this.visitRepository.findAndCount({
      where: { [ownerField]: userId },
      order: { lastVisitedAt: 'DESC' },
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
      .map((r) => ({
        ...profiles.get(r[otherField])!,
        visitedAt: r.lastVisitedAt,
        visitCount: r.visitCount,
      }));

    return { users, total, page, limit, pages: Math.ceil(total / limit) };
  }
}
