import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const preferenceId = searchParams.get("preference_id");
    const preapprovalId = searchParams.get("preapproval_id");
    const paymentId = searchParams.get("payment_id");
    const externalReference = searchParams.get("external_reference");

    if (!externalReference) {
      return NextResponse.redirect(new URL("/plans/failure", request.url));
    }

    const subscription = await prisma.subscription.findUnique({
      where: { companyId: externalReference },
    });

    if (subscription) {
      const nextBillingDate = new Date();
      nextBillingDate.setMonth(
        nextBillingDate.getMonth() + (subscription.planType === "MONTHLY" ? 1 : 12)
      );

      const mpReferenceId = preferenceId || preapprovalId || paymentId;
      // amount identifica a combinação plano × período (ver lib/plans.ts)
      const amount = subscription.amount;
      const isProPlan = [250, 2550, 100, 1020].includes(amount);
      // Guarda o plano no layout de storeLayout? Não — plano fica no amount + activePlan.
      // Atualiza activePlan do primeiro usuário ADMIN da empresa.
      const adminUser = await prisma.user.findFirst({
        where: { companyId: externalReference, role: "ADMIN" },
        orderBy: { createdAt: "asc" },
      });
      if (adminUser) {
        await prisma.user.update({
          where: { id: adminUser.id },
          data: { activePlan: isProPlan ? "PRO" : "BASIC" },
        });
      }

      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: "ACTIVE",
          mercadopagoPreferenceId:
            subscription.billingMode === "RECURRING" ? subscription.mercadopagoPreferenceId : preferenceId,
          mercadopagoSubscriptionId:
            subscription.billingMode === "RECURRING"
              ? preapprovalId || subscription.mercadopagoSubscriptionId
              : subscription.mercadopagoSubscriptionId,
          mercadopagoPaymentId:
            subscription.billingMode === "RECURRING" ? paymentId || subscription.mercadopagoPaymentId : mpReferenceId,
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
