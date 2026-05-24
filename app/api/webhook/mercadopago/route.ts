import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, resource } = body;

    console.log("Webhook MercadoPago recebido:", { topic, resource });

    // Processar notificações de pagamento
    if (topic === "payment") {
      const paymentId = resource.id;

      // Buscar a assinatura pelo ID de preferência
      const subscription = await prisma.subscription.findFirst({
        where: {
          mercadopagoPaymentId: paymentId.toString(),
        },
        include: { company: true },
      });

      if (subscription) {
        // Atualizar status da assinatura baseado no status do pagamento
        const status = resource.status;

        let subscriptionStatus = "PENDING";
        if (status === "approved") {
          subscriptionStatus = "ACTIVE";
        } else if (status === "rejected" || status === "cancelled") {
          subscriptionStatus = "CANCELLED";
        } else if (status === "pending") {
          subscriptionStatus = "PENDING";
        }

        const nextBillingDate = new Date();
        if (subscription.planType === "MONTHLY") {
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
        } else {
          nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
        }

        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: subscriptionStatus as any,
            mercadopagoPaymentId: paymentId.toString(),
            nextBillingDate:
              subscriptionStatus === "ACTIVE" ? nextBillingDate : null,
            expiresAt:
              subscriptionStatus === "ACTIVE"
                ? nextBillingDate
                : subscription.expiresAt,
          },
        });

        console.log(`Assinatura ${subscription.id} atualizada para ${subscriptionStatus}`);
      }
    }

    // Responder ao MercadoPago
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao processar webhook:", error);
    return NextResponse.json(
      { error: "Erro ao processar webhook" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // MercadoPago às vezes testa com GET
  return NextResponse.json({ status: "webhook ativo" });
}
