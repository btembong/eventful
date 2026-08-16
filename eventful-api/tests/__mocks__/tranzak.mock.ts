// Mock Tranzak client — prevents real API calls during tests.
export const tranzakClient = {
  createPaymentRequest: jest.fn().mockResolvedValue({
    requestId:  'trz_mock_req_001',
    paymentUrl: 'https://sandbox.tranzak.me/pay/mock001',
  }),
  getPaymentDetails: jest.fn().mockResolvedValue({
    status:          'SUCCESSFUL',
    transactionTime: new Date().toISOString(),
  }),
  verifyWebhookAuthKey: jest.fn().mockReturnValue(true),
};

// Re-export the type so imports like `import type { WebhookPayload }` still work
export type WebhookPayload = {
  name?: string;
  version?: string;
  eventType: string;
  appId: string;
  resourceId: string;
  resource?: Record<string, unknown>;
  webhookId: string;
  creationDateTime?: string;
  authKey: string;
};
