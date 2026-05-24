import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const preferenceId = searchParams.get("preference_id");
    const externalReference = searchParams.get("external_reference");

    if (!preferenceId || !externalReference) {
      return NextResponse.redirect(new URL("/plans/failure", request.url));
    }

    // Atualizar assinatura para ACTIVE
    const subscription = await prisma.subscription.findUnique({
      where: { companyId: externalReference },
    });

    if (subscription) {
      const nextBillingDate = new Date();
      if (subscription.planType === "MONTHLY") {
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
      } else {
        nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
      }

      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: "ACTIVE",
          mercadopagoPaymentId: preferenceId,
          nextBillingDate,
          expiresAt: nextBillingDate,
        },
      });
    }

    return NextResponse.redirect(new URL("/plans/success", request.url));
  } catch (error) {
    console.error("Erro ao processar retorno:", error);
    return NextResponse.redirect(new URL("/plans/failure", request.url));
  }
}
