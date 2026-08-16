// Mock ioredis singleton — prevents real Redis connections during tests.
// Events service Redis cache calls return cache-miss (null) so the DB is always hit.
// Auth service uses set/exists/del for refresh token storage.
export const redis = {
  get:    jest.fn().mockResolvedValue(null),
  set:    jest.fn().mockResolvedValue('OK'),
  setex:  jest.fn().mockResolvedValue('OK'),
  del:    jest.fn().mockResolvedValue(1),
  exists: jest.fn().mockResolvedValue(1), // 1 = key exists (tokens always valid in test env)
  keys:   jest.fn().mockResolvedValue([]),
  quit:   jest.fn().mockResolvedValue('OK'),
};
