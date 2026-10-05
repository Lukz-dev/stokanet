import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { timingSafeEqual } from "node:crypto";

function matchesSecret(provided: string, expected: string) {
  const received = Buffer.from(provided);
  const configured = Buffer.from(expected);
  return received.length === configured.length && timingSafeEqual(received, configured);
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");

  if (!secret || !process.env.CRON_SECRET || !matchesSecret(secret, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const now = new Date();

  const result = await prisma.subscription.updateMany({
    where: {
      status: "ACTIVE",
      expiresAt: {
        lte: now,
      },
    },
    data: {
      status: "EXPIRED",
      autoRenew: false,
    },
  });

  return NextResponse.json({
    success: true,
    expiredCount: result.count,
    timestamp: now.toISOString(),
  });
}