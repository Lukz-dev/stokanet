import { NextRequest, NextResponse } from "next/server";
import { getActiveCompanyId } from "@/lib/access";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const companyId = await getActiveCompanyId();
    const currentSubscription = await prisma.subscription.findUnique({
      where: { companyId },
    });

    if (!currentSubscription) {
      return NextResponse.redirect(new URL("/subscription", request.url));
    }

    await prisma.subscription.update({
      where: { companyId },
      data: {
        status: "CANCELLED",
        autoRenew: false,
        cancelledAt: new Date(),
        expiresAt: new Date(),
      },
    });

    return NextResponse.redirect(new URL("/subscription", request.url));
  } catch (error) {
    console.error("Erro ao cancelar assinatura:", error);
    return NextResponse.json(
      { error: "Não foi possível cancelar a assinatura" },
      { status: 500 }
    );
  }
}