import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User, ProfileStage } from '../users/entities/user.entity';
import { UserPhoto } from '../users/entities/user-photo.entity';
import { Pass } from '../passes/entities/pass.entity';
import { Favorite } from '../social/entities/favorite.entity';
import { UpdateLocationDto, DiscoverQueryDto } from './dto/discover.dto';
import { withCacheBuster, isSameHometown } from '../users/public-profile';

type DiscoverMode = 'nearby' | 'online' | 'new';

const RECENTLY_ONLINE_HOURS = 72;
const NEW_USER_DAYS = 30;
const DEFAULT_NEARBY_KM = 50;

@Injectable()
export class DiscoverService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserPhoto)
    private readonly photoRepository: Repository<UserPhoto>,
    @InjectRepository(Pass)
    private readonly passRepository: Repository<Pass>,
    @InjectRepository(Favorite)
    private readonly favoriteRepository: Repository<Favorite>,
  ) {}

  async updateLocation(userId: string, dto: UpdateLocationDto): Promise<{ updated: boolean }> {
    await this.userRepository.update(userId, {
      latitude: dto.latitude,
      longitude: dto.longitude,
      locationUpdatedAt: new Date(),
    });
    return { updated: true };
  }

  async passUser(fromUserId: string, toUserId: string): Promise<{ passed: boolean }> {
    const existing = await this.passRepository.findOne({ where: { fromUserId, toUserId } });
    if (!existing) {
      await this.passRepository.save(this.passRepository.create({ fromUserId, toUserId }));
    }
    return { passed: true };
  }

  /** Swipe deck: nearest members first, hiding people already liked or skipped. */
  getNearby(userId: string, dto: DiscoverQueryDto) {
    return this.search(userId, dto, 'nearby');
  }

  /** Members active in the last few days, most recent first. */
  getRecentlyOnline(userId: string, dto: DiscoverQueryDto) {
    return this.search(userId, dto, 'online');
  }

  /** Members who joined recently, newest first. */
  getNewUsers(userId: string, dto: DiscoverQueryDto) {
    return this.search(userId, dto, 'new');
  }

  private async search(userId: string, dto: DiscoverQueryDto, mode: DiscoverMode) {
    const me = await this.userRepository.findOne({ where: { id: userId } });
    if (!me) throw new BadRequestException('User not found');

    const hasLocation = me.latitude != null && me.longitude != null;
    if (mode === 'nearby' && !hasLocation) {
      throw new BadRequestException('Enable location to discover friends nearby');
    }

    const page = dto.page ?? 1;
    const limit = dto.limit ?? 10;
    const maxDistance = mode === 'nearby' ? dto.maxDistance ?? DEFAULT_NEARBY_KM : dto.maxDistance;

    const params: unknown[] = [];
    const p = (value: unknown) => {
      params.push(value);
      return `$${params.length}`;
    };

    const meParam = p(userId);
    const distanceSql = hasLocation
      ? (() => {
          const lat = p(me.latitude);
          const lng = p(me.longitude);
          return `ROUND((6371 * acos(LEAST(1,
            cos(radians(${lat})) * cos(radians(u.latitude)) * cos(radians(u.longitude) - radians(${lng})) +
            sin(radians(${lat})) * sin(radians(u.latitude))
          )))::numeric, 1)`;
        })()
      : 'NULL';

    const where: string[] = [
      `u.id <> ${meParam}`,
      `u."profileStage" >= ${ProfileStage.STAGE2_COMPLETE}`,
      `u."isActive" = true`,
      `u."isBanned" = false`,
      `u."deletedAt" IS NULL`,
      `(u."hiddenUntil" IS NULL OR u."hiddenUntil" <= NOW())`,
      `NOT EXISTS (SELECT 1 FROM blocks b WHERE (b."blockerId" = ${meParam} AND b."blockedId" = u.id)
                                        OR (b."blockerId" = u.id AND b."blockedId" = ${meParam}))`,
      `u.age BETWEEN ${p(dto.minAge ?? 18)} AND ${p(dto.maxAge ?? 80)}`,
    ];

    if (mode === 'nearby') {
      where.push(`NOT EXISTS (SELECT 1 FROM likes l WHERE l."fromUserId" = ${meParam} AND l."toUserId" = u.id)`);
      where.push(`NOT EXISTS (SELECT 1 FROM passes ps WHERE ps."fromUserId" = ${meParam} AND ps."toUserId" = u.id)`);
    }
    if (mode === 'online') {
      where.push(`u."lastActiveAt" >= NOW() - (${p(RECENTLY_ONLINE_HOURS)} * INTERVAL '1 hour')`);
    }
    if (mode === 'new') {
      where.push(`u."createdAt" >= NOW() - (${p(NEW_USER_DAYS)} * INTERVAL '1 day')`);
    }
    if (maxDistance != null && hasLocation) {
      where.push(`u.latitude IS NOT NULL AND u.longitude IS NOT NULL`);
      where.push(`${distanceSql} <= ${p(maxDistance)}`);
    }

    if (dto.gender) where.push(`u.gender = ${p(dto.gender)}`);
    if (dto.relationshipStatus) where.push(`u."relationshipStatus" = ${p(dto.relationshipStatus)}`);
    if (dto.motherTongue) where.push(`u."motherTongue" = ${p(dto.motherTongue)}`);
    if (dto.religion) where.push(`u.religion = ${p(dto.religion)}`);
    if (dto.lookingFor) {
      // simple-array columns are stored comma-separated
      where.push(`(',' || COALESCE(u."lookingFor", '') || ',') LIKE ${p(`%,${dto.lookingFor},%`)}`);
    }
    if (dto.country?.trim()) where.push(`u.country ILIKE ${p(dto.country.trim())}`);
    if (dto.grewUpCity?.trim()) where.push(`u."grewUpCity" ILIKE ${p(dto.grewUpCity.trim())}`);
    if (dto.verifiedOnly) where.push(`u."photoVerifiedStatus" = 'verified'`);
    if (dto.photoOnly) {
      where.push(`EXISTS (SELECT 1 FROM user_photos ph WHERE ph."userId" = u.id)`);
    }

    const orderBy =
      mode === 'nearby' ? 'distance ASC NULLS LAST, u."lastActiveAt" DESC NULLS LAST'
      : mode === 'online' ? 'u."lastActiveAt" DESC'
      : 'u."createdAt" DESC';

    const whereSql = where.join('\n        AND ');
    const countParams = [...params];

    const rows: any[] = await this.userRepository.query(
      `
      SELECT
        u.id, u.name, u.age, u.gender, u.city, u.country, u.bio,
        u.passions, u."relationshipStatus", u."lookingFor", u."interestedIn",
        u."motherTongue", u.religion, u.education, u.profession, u."jobProfile",
        CASE WHEN u."hideSalary" THEN NULL ELSE u."salaryRange" END AS "salaryRange",
        u."heightCm", u."grewUpCity", u."photoVerifiedStatus", u."subscriptionPlan",
        u."lastActiveAt", u."createdAt",
        ${distanceSql} AS distance
      FROM users u
      WHERE ${whereSql}
      ORDER BY ${orderBy}
      LIMIT ${p(limit)} OFFSET ${p((page - 1) * limit)}
      `,
      params,
    );

    const countResult = await this.userRepository.query(
      `SELECT COUNT(*)::int AS total FROM users u WHERE ${whereSql}`,
      countParams,
    );

    const ids = rows.map((r) => r.id);
    const [photos, favorites] = ids.length
      ? await Promise.all([
          this.photoRepository.find({ where: { userId: In(ids) }, order: { order: 'ASC' } }),
          this.favoriteRepository.find({ where: { userId, favoriteUserId: In(ids) } }),
        ])
      : [[], []];

    const photosByUser = new Map<string, { id: string; url: string; order: number }[]>();
    for (const photo of photos) {
      const list = photosByUser.get(photo.userId) ?? [];
      list.push({ id: photo.id, url: withCacheBuster(photo.url, photo.id), order: photo.order });
      photosByUser.set(photo.userId, list);
    }
    const favoriteIds = new Set(favorites.map((f) => f.favoriteUserId));

    const users = rows.map((row) => {
      const userPhotos = photosByUser.get(row.id) ?? [];
      return {
        ...row,
        passions: splitSimpleArray(row.passions),
        lookingFor: splitSimpleArray(row.lookingFor),
        distance: row.distance == null ? null : Number(row.distance),
        photos: userPhotos,
        primaryPhoto: userPhotos[0]?.url ?? null,
        isFavorite: favoriteIds.has(row.id),
        sameHometown: isSameHometown(me.grewUpCity, row.grewUpCity),
      };
    });

    const total = countResult[0]?.total ?? 0;
    return { users, total, page, limit, pages: Math.ceil(total / limit) };
  }
}

function splitSimpleArray(value: string | null): string[] {
  return value ? value.split(',').filter(Boolean) : [];
}
