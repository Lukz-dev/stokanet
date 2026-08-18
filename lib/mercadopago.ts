import "dotenv/config";
import { createHmac, timingSafeEqual } from "node:crypto";

export type MercadoPagoPreferenceItem = {
  id: string;
  title: string;
  description?: string;
  picture_url?: string;
  category_id?: string;
  quantity: number;
  unit_price: number;
  currency_id: string;
};

export type MercadoPagoCheckoutPreferenceInput = {
  accessToken: string;
  items: MercadoPagoPreferenceItem[];
  payerName?: string;
  payerEmail: string;
  backUrls: {
    success: string;
    failure: string;
    pending: string;
  };
  notificationUrl: string;
  externalReference: string;
  expiresInHours?: number;
  metadata?: Record<string, unknown>;
};

export type MercadoPagoOAuthTokenResponse = {
  access_token: string;
  refresh_token?: string;
  user_id?: number | string;
  expires_in?: number;
};

export function getMercadoPagoOAuthConfig() {
  const clientId = process.env.MERCADOPAGO_CLIENT_ID?.trim() ?? '';
  const clientSecret = process.env.MERCADOPAGO_CLIENT_SECRET?.trim() ?? '';
  const redirectUri = process.env.MERCADOPAGO_REDIRECT_URI?.trim() ?? '';

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('OAuth do Mercado Pago não configurado no servidor.');
  }

  return { clientId, clientSecret, redirectUri };
}

export function buildMercadoPagoOAuthUrl(state: string) {
  const { clientId, redirectUri } = getMercadoPagoOAuthConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    platform_id: 'mp',
    state,
    redirect_uri: redirectUri,
  });

  return `https://auth.mercadopago.com/authorization?${params.toString()}`;
}

export async function exchangeMercadoPagoOAuthCode(code: string) {
  const { clientId, clientSecret, redirectUri } = getMercadoPagoOAuthConfig();
  const response = await fetch('https://api.mercadopago.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  });

  const responseBody = await response.json().catch(() => ({}));
  if (!response.ok || typeof responseBody.access_token !== 'string') {
    throw new Error(`Falha ao conectar o Mercado Pago (${response.status}).`);
  }

  return responseBody as MercadoPagoOAuthTokenResponse;
}

export async function refreshMercadoPagoOAuthToken(refreshToken: string) {
  const { clientId, clientSecret } = getMercadoPagoOAuthConfig();
  const response = await fetch('https://api.mercadopago.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const responseBody = await response.json().catch(() => ({}));
  if (!response.ok || typeof responseBody.access_token !== 'string') {
    throw new Error(`Falha ao renovar a conexão do Mercado Pago (${response.status}).`);
  }

  return responseBody as MercadoPagoOAuthTokenResponse;
}

export const mercadopagoClient = null;

export type WebhookSignatureResult = {
  ok: boolean;
  skipped: boolean;
  reason?: string;
};

export function verifyMercadoPagoWebhookSignature(
  signatureHeader: string | null | undefined,
  body: string,
  secret: string | null | undefined
): WebhookSignatureResult {
  if (!secret) {
    return { ok: true, skipped: true, reason: "No secret configured" };
  }

  if (!signatureHeader) {
    return { ok: false, skipped: false, reason: "Missing signature header" };
  }

  const parts = signatureHeader.split(",").reduce<Record<string, string>>((acc, chunk) => {
    const [key, value] = chunk.split("=", 2);
    if (key && value) {
      acc[key] = value;
    }
    return acc;
  }, {});

  const timestamp = parts.ts;
  const version = parts.v1;

  if (!timestamp || !version) {
    return { ok: false, skipped: false, reason: "Malformed signature header" };
  }

  const expected = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  const received = version;

  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);

  if (expectedBuffer.length !== receivedBuffer.length) {
    return { ok: false, skipped: false, reason: "Signature mismatch" };
  }

  const isValid = timingSafeEqual(expectedBuffer, receivedBuffer);
  return { ok: isValid, skipped: false, reason: isValid ? undefined : "Signature mismatch" };
}

export const PLANS = {
  MONTHLY: {
    id: "monthly",
    name: "Plano Mensal",
    price: 100,
    currency: "BRL",
    description: "Acesso mensal ao sistema de estoque",
    billingCycle: "month",
  },
  ANNUAL: {
    id: "annual",
    name: "Plano Anual",
    price: 1020, // R$ 100/mês com 15% de desconto = R$ 1.020/ano
    currency: "BRL",
    description: "Acesso anual ao sistema de estoque com 15% de desconto",
    billingCycle: "year",
  },
};

export async function createPreference(
  planId: keyof typeof PLANS,
  companyId: string,
  companyName: string,
  payerEmail: string,
  appUrl?: string,
  billingMode: "ONE_TIME" | "RECURRING" = "ONE_TIME"
) {
  const plan = PLANS[planId];

  const accessToken = getMercadoPagoAccessToken();
  const baseUrl = appUrl || process.env.NEXTAUTH_URL || "http://localhost:3000";

  if (!accessToken) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado");
  }

  if (!payerEmail) {
    throw new Error("E-mail do pagador não informado");
  }

  if (billingMode === "RECURRING") {
    return createRecurringPreference(plan, companyId, companyName, baseUrl, payerEmail, accessToken);
  }

  const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: [
        {
          id: plan.id,
          title: plan.name,
          description: plan.description,
          picture_url:
            "https://via.placeholder.com/180x180?text=" +
            encodeURIComponent(plan.name),
          category_id: "subscription",
          quantity: 1,
          unit_price: plan.price,
          currency_id: plan.currency,
        },
      ],
      payer: {
        name: companyName,
        email: payerEmail,
      },
      back_urls: {
        success: `${baseUrl}/plans/success`,
        failure: `${baseUrl}/plans/failure`,
        pending: `${baseUrl}/plans/pending`,
      },
      notification_url: `${baseUrl}/api/webhook/mercadopago`,
      external_reference: companyId,
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }),
  });

  const responseBody = await response.json().catch(async () => ({
    raw: await response.text(),
  }));

  if (!response.ok) {
    throw new Error(
      `MercadoPago API error (${response.status}): ${JSON.stringify(responseBody)}`
    );
  }

  return responseBody;
}

function getMercadoPagoAccessToken() {
  return (
    process.env.MERCADOPAGO_ACCESS_TOKEN ||
    process.env.MERCADO_PAGO_ACCESS_TOKEN ||
    process.env.MP_ACCESS_TOKEN ||
    ""
  );
}

export function getMercadoPagoPayerEmail(sessionEmail: string) {
  const isSandbox = process.env.NEXT_PUBLIC_MERCADOPAGO_ENV === "sandbox";
  const testBuyerEmail = process.env.MERCADOPAGO_TEST_BUYER_EMAIL?.trim();

  if (isSandbox && testBuyerEmail) {
    return testBuyerEmail;
  }

  return sessionEmail;
}

export async function createCheckoutPreference(input: MercadoPagoCheckoutPreferenceInput) {
  if (!input.accessToken) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado");
  }

  if (!input.payerEmail) {
    throw new Error("E-mail do pagador não informado");
  }

  if (!input.items.length) {
    throw new Error("Nenhum item informado para checkout");
  }

  const expiresInHours = Math.max(1, Math.min(input.expiresInHours ?? 24, 168));
  const now = new Date();

  const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: input.items,
      payer: {
        name: input.payerName,
        email: input.payerEmail,
      },
      back_urls: input.backUrls,
      notification_url: input.notificationUrl,
      external_reference: input.externalReference,
      metadata: input.metadata,
      payment_methods: {
        excluded_payment_types: [{ id: "ticket" }],
      },
      expires: true,
      expiration_date_from: now.toISOString(),
      expiration_date_to: new Date(now.getTime() + expiresInHours * 60 * 60 * 1000).toISOString(),
    }),
  });

  const responseBody = await response.json().catch(async () => ({
    raw: await response.text(),
  }));

  if (!response.ok) {
    throw new Error(
      `MercadoPago API error (${response.status}): ${JSON.stringify(responseBody)}`
    );
  }

  return responseBody;
}

async function createRecurringPreference(
  plan: (typeof PLANS)[keyof typeof PLANS],
  companyId: string,
  companyName: string,
  baseUrl: string,
  payerEmail: string,
  accessToken: string
) {
  const frequency = plan.billingCycle === "month" ? 1 : 12;

  const response = await fetch("https://api.mercadopago.com/preapproval", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      reason: `${companyName} - ${plan.name}`,
      external_reference: companyId,
      payer_email: payerEmail,
      back_url: new URL("/plans/success", baseUrl).toString(),
      notification_url: `${baseUrl}/api/webhook/mercadopago`,
      status: "pending",
      auto_recurring: {
        frequency,
        frequency_type: "months",
        transaction_amount: plan.price,
        currency_id: plan.currency,
      },
    }),
  });

  const responseBody = await response.json().catch(async () => ({
    raw: await response.text(),
  }));

  if (!response.ok) {
    throw new Error(
      `MercadoPago API error (${response.status}): ${JSON.stringify(responseBody)}`
    );
  }

  return responseBody;
}

export function calculateNextBillingDate(planType: "MONTHLY" | "ANNUAL") {
  const now = new Date();
  if (planType === "MONTHLY") {
    return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
  } else {
    return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  }
}

export function getExpirationDate(planType: "MONTHLY" | "ANNUAL") {
  const now = new Date();
  if (planType === "MONTHLY") {
    return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
  } else {
    return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  }
}

export function formatMercadoPagoError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === "object" && error !== null) {
    return {
      ...error,
      json: JSON.stringify(error),
    };
  }

  return { message: String(error) };
}
