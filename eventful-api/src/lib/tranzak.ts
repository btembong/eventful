import env from '@/config/env';

// Tranzak API client
// Docs: https://docs.developer.tranzak.me
//
// Auth flow: POST /auth/token → Bearer token valid ~2 hours.
// Cache the token for 75% of its validity to avoid hammering the auth endpoint.

const BASE_URL =
  env.TRANZAK_ENV === 'production'
    ? 'https://dsapi.tranzak.me'
    : 'https://sandbox.dsapi.tranzak.me';

interface TokenCache {
  token: string;
  expiresAt: number; // epoch ms
}

let tokenCache: TokenCache | null = null;

async function getToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now) {
    return tokenCache.token;
  }

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appId: env.TRANZAK_APP_ID,
        appKey: env.TRANZAK_APP_KEY,
      }),
    });
  } catch (networkErr) {
    const err = Object.assign(new Error(`Tranzak unreachable: ${(networkErr as Error).message}`), { statusCode: 503 });
    throw err;
  }

  let body: { success: boolean; data?: { token: string; expiresIn: number }; errorMsg?: string; errorCode?: number };
  try {
    body = await res.json();
  } catch {
    const err = Object.assign(
      new Error(`Tranzak auth returned non-JSON (HTTP ${res.status}) — check TRANZAK_APP_ID / TRANZAK_APP_KEY`),
      { statusCode: 503 },
    );
    throw err;
  }

  if (!body.success || !body.data?.token) {
    const err = Object.assign(
      new Error(`Tranzak auth failed (${body.errorCode ?? res.status}): ${body.errorMsg ?? 'unknown error'} — check TRANZAK_APP_ID and TRANZAK_APP_KEY`),
      { statusCode: 422 },
    );
    throw err;
  }

  // Cache for 75% of validity period
  const ttlMs = body.data.expiresIn * 1000 * 0.75;
  tokenCache = { token: body.data.token, expiresAt: now + ttlMs };

  return body.data.token;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-App-ID': env.TRANZAK_APP_ID,
      ...(options.headers ?? {}),
    },
  });

  let body: { success: boolean; data?: T; errorMsg?: string; errorCode?: number };
  try {
    body = await res.json();
  } catch {
    const err = Object.assign(new Error(`Tranzak API returned non-JSON (HTTP ${res.status})`), { statusCode: 503 });
    throw err;
  }

  if (!body.success) {
    const err = Object.assign(
      new Error(`Tranzak API error (${body.errorCode ?? res.status}): ${body.errorMsg ?? 'unknown'}`),
      { statusCode: 422 },
    );
    throw err;
  }

  return body.data as T;
}

export interface CreatePaymentRequestParams {
  amount: number;
  currencyCode: string;     // e.g. "XAF"
  description: string;
  mchTransactionRef: string; // idempotency key — use our Payment.id
  returnUrl: string;         // where Tranzak redirects after payment
}

interface RawPaymentRequestResponse {
  requestId: string;
  status: string;
  links: {
    paymentAuthUrl: string;
    returnUrl: string;
    cancelUrl: string | null;
  };
}

export interface PaymentRequestResponse {
  requestId: string;
  paymentUrl: string;
  status: string;
}

export interface PaymentDetails {
  requestId: string;
  status: 'PENDING' | 'SUCCESSFUL' | 'FAILED' | 'CANCELLED' | 'PAYMENT_IN_PROGRESS' | 'PAYER_REDIRECT_REQUIRED';
  amount: number;
  currencyCode: string;
  transactionId?: string;
  transactionTime?: string;
}

export interface WebhookPayload {
  name: string;
  version: string;
  eventType: 'REQUEST.COMPLETED' | 'TRANSFER.COMPLETED' | 'BULK_PAYMENT.COMPLETED';
  appId: string;
  resourceId: string;       // requestId
  resource: PaymentDetails; // full transaction details
  webhookId: string;        // use as idempotency key in DB
  creationDateTime: string;
  authKey: string;          // use to verify the payload came from Tranzak
}

export const tranzakClient = {
  async createPaymentRequest(params: CreatePaymentRequestParams): Promise<PaymentRequestResponse> {
    const raw = await request<RawPaymentRequestResponse>('/xp021/v1/request/create', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return {
      requestId:  raw.requestId,
      status:     raw.status,
      paymentUrl: raw.links.paymentAuthUrl,
    };
  },

  async getPaymentDetails(requestId: string): Promise<PaymentDetails> {
    return request<PaymentDetails>(`/xp021/v1/request/details?requestId=${encodeURIComponent(requestId)}`);
  },

  /**
   * Initiate a full refund for a completed payment request.
   * Tranzak endpoint: POST /xp021/v1/request/refund
   */
  async refundPayment(requestId: string, reason?: string): Promise<{ refundId: string; status: string }> {
    return request<{ refundId: string; status: string }>('/xp021/v1/request/refund', {
      method: 'POST',
      body: JSON.stringify({ requestId, reason: reason ?? 'Refund requested by event organizer' }),
    });
  },

  // Verify that a webhook payload genuinely came from Tranzak.
  // The authKey field in the payload is used for this — implementation TBD
  // once Tranzak documents the exact verification algorithm.
  verifyWebhookAuthKey(payload: WebhookPayload, expectedAppId: string): boolean {
    return payload.appId === expectedAppId;
    // TODO: replace with cryptographic check when Tranzak documents authKey derivation
  },
};
