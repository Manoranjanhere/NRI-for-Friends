import { In, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserPhoto } from './entities/user-photo.entity';

/** Only fields that are safe to show to other members (no phone, email, location, billing). */
export interface PublicProfile {
  id: string;
  name: string;
  age: number;
  gender: string;
  city: string;
  country: string;
  bio: string | null;
  passions: string[];
  relationshipStatus: string | null;
  lookingFor: string[];
  interestedIn: string | null;
  motherTongue: string | null;
  religion: string | null;
  education: string | null;
  profession: string | null;
  jobProfile: string | null;
  salaryRange: string | null;
  heightCm: number | null;
  grewUpCity: string | null;
  photoVerifiedStatus: string;
  subscriptionPlan: string | null;
  lastActiveAt: Date | null;
  createdAt: Date;
  primaryPhoto?: string | null;
}

export function withCacheBuster(url: string, version: string): string {
  if (!url) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}v=${version}`;
}

export function toPublicProfile(user: User): PublicProfile {
  return {
    id: user.id,
    name: user.name,
    age: user.age,
    gender: user.gender,
    city: user.city,
    country: user.country,
    bio: user.bio ?? null,
    passions: user.passions ?? [],
    relationshipStatus: user.relationshipStatus ?? null,
    lookingFor: user.lookingFor ?? [],
    interestedIn: user.interestedIn ?? null,
    motherTongue: user.motherTongue ?? null,
    religion: user.religion ?? null,
    education: user.education ?? null,
    profession: user.profession ?? null,
    jobProfile: user.jobProfile ?? null,
    salaryRange: user.hideSalary ? null : user.salaryRange ?? null,
    heightCm: user.heightCm ?? null,
    grewUpCity: user.grewUpCity ?? null,
    photoVerifiedStatus: user.photoVerifiedStatus,
    subscriptionPlan: user.subscriptionPlan ?? null,
    lastActiveAt: user.lastActiveAt ?? null,
    createdAt: user.createdAt,
  };
}

export function isSameHometown(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Public profiles for the given ids, in the same order, each with its first photo. */
export async function loadPublicProfiles(
  userRepository: Repository<User>,
  photoRepository: Repository<UserPhoto>,
  userIds: string[],
): Promise<Map<string, PublicProfile>> {
  const result = new Map<string, PublicProfile>();
  if (userIds.length === 0) return result;

  const [users, photos] = await Promise.all([
    userRepository.find({ where: { id: In(userIds) } }),
    photoRepository.find({ where: { userId: In(userIds) }, order: { order: 'ASC' } }),
  ]);

  const firstPhoto = new Map<string, UserPhoto>();
  for (const photo of photos) {
    if (!firstPhoto.has(photo.userId)) firstPhoto.set(photo.userId, photo);
  }

  for (const user of users) {
    if (!user.isActive || user.isBanned) continue;
    const photo = firstPhoto.get(user.id);
    result.set(user.id, {
      ...toPublicProfile(user),
      primaryPhoto: photo ? withCacheBuster(photo.url, photo.id) : null,
    });
  }
  return result;
}
