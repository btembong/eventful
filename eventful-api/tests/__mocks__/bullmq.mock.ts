// Mock BullMQ — prevents real Redis queue connections during tests.
export const Queue = jest.fn().mockImplementation(() => ({
  add:   jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
  close: jest.fn().mockResolvedValue(undefined),
}));

export const Worker = jest.fn().mockImplementation(() => ({
  on:    jest.fn(),
  close: jest.fn().mockResolvedValue(undefined),
}));
