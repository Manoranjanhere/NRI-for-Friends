import { BadRequestException } from '@nestjs/common';
import { DiscoverService } from './discover.service';

function makeService(me: Record<string, unknown>, queryResults: unknown[][] = []) {
  const query = jest.fn();
  for (const result of queryResults) query.mockResolvedValueOnce(result);
  const userRepository = { findOne: jest.fn().mockResolvedValue(me), query } as any;
  const photoRepository = { find: jest.fn().mockResolvedValue([]) } as any;
  const favoriteRepository = { find: jest.fn().mockResolvedValue([]) } as any;
  const service = new DiscoverService(userRepository, photoRepository, {} as any, favoriteRepository);
  return { service, query };
}

describe('DiscoverService', () => {
  it('requires a location for the nearby deck', async () => {
    const { service } = makeService({ id: 'u1', latitude: null, longitude: null });
    await expect(service.getNearby('u1', {} as any)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lists new users without a location', async () => {
    const { service, query } = makeService(
      { id: 'u1', latitude: null, longitude: null, grewUpCity: 'Pune' },
      [[{ id: 'u2', grewUpCity: 'pune ', passions: 'Dancing,Painting', lookingFor: 'friendship', distance: null }], [{ total: 1 }]],
    );

    const result = await service.getNewUsers('u1', { page: 1, limit: 10 } as any);

    expect(result.total).toBe(1);
    expect(result.users[0]).toMatchObject({
      id: 'u2',
      passions: ['Dancing', 'Painting'],
      lookingFor: ['friendship'],
      sameHometown: true,
      isFavorite: false,
    });
  });

  it('passes filter values as SQL parameters, never inline', async () => {
    const { service, query } = makeService(
      { id: 'u1', latitude: 43.6, longitude: -79.3 },
      [[], [{ total: 0 }]],
    );

    await service.getNearby('u1', { religion: "Hindu'; DROP TABLE users;--", page: 1, limit: 10 } as any);

    const [sql, params] = query.mock.calls[0];
    expect(sql).not.toContain('DROP TABLE');
    expect(params).toContain("Hindu'; DROP TABLE users;--");
  });
});
