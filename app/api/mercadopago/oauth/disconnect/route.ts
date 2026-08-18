import { NextResponse } from 'next/server'
import { getActiveCompanyId } from '@/lib/access'
import prisma from '@/lib/prisma'

export async function POST() {
  const companyId = await getActiveCompanyId()
  await prisma.company.update({
    where: { id: companyId },
    data: {
      mercadopagoAccessToken: null,
      mercadopagoRefreshToken: null,
      mercadopagoUserId: null,
      mercadopagoTokenExpiresAt: null,
      mercadopagoConnectedAt: null,
    },
  })

  return NextResponse.json({ ok: true })
}