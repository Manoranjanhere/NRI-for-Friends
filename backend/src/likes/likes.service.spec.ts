import { ForbiddenException } from '@nestjs/common';
import { LikesService } from './likes.service';

const inTenDays = () => new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

function makeService(users: Record<string, Record<string, unknown>>, mutual: boolean) {
  const likeRepository = {
    findOne: jest
      .fn()
      .mockResolvedValueOnce(null) // existing like check
      .mockResolvedValueOnce(mutual ? { id: 'mutual' } : null), // mutual like check
    create: jest.fn((x) => x),
    save: jest.fn(),
    remove: jest.fn(),
  } as any;
  const userRepository = {
    findOne: jest.fn(({ where }) => Promise.resolve(users[where.id] ?? null)),
    update: jest.fn(),
  } as any;
  const devicesService = { sendPushToUser: jest.fn().mockResolvedValue(undefined) } as any;

  const service = new LikesService(
    likeRepository,
    userRepository,
    {} as any, // photos
    {} as any, // blocks
    devicesService,
    {} as any, // coins
    {} as any, // messages
    {} as any, // favorites
    {} as any, // visits
    {} as any, // interests
  );
  return { service, likeRepository, devicesService };
}

describe('LikesService', () => {
  const originalEnv = { ...process.env };
  beforeEach(() => {
    process.env.NODE_ENV = 'production';
    delete process.env.DISABLE_PAID_FEATURES;
  });
  afterAll(() => {
    process.env = originalEnv;
  });

  it('connects both members when the like is mutual', async () => {
    const { service, devicesService } = makeService(
      {
        from: { id: 'from', name: 'Sender', isActive: true, subscriptionTier: 1, subscriptionExpiresAt: inTenDays() },
        to: { id: 'to', name: 'Target', isActive: true, isBanned: false },
      },
      true,
    );

    const result = await service.likeUser('from', 'to');

    expect(result).toEqual({ liked: true, isMatch: true });
    expect(devicesService.sendPushToUser).toHaveBeenCalledTimes(2);
  });

  it('blocks likes once the free trial has ended', async () => {
    const { service, likeRepository } = makeService(
      {
        from: { id: 'from', name: 'Sender', isActive: true, subscriptionTier: 1, subscriptionExpiresAt: new Date(Date.now() - 1000) },
        to: { id: 'to', name: 'Target', isActive: true, isBanned: false },
      },
      false,
    );

    await expect(service.likeUser('from', 'to')).rejects.toBeInstanceOf(ForbiddenException);
    expect(likeRepository.save).not.toHaveBeenCalled();
  });
});
