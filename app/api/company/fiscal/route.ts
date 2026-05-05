import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getActiveCompanyId, getActiveUser } from '@/lib/access'

function assertCanManage(userRole?: string) {
  const role = userRole ?? 'OPERATOR'
  if (!['ADMIN', 'MANAGER'].includes(role)) {
    throw new Error('Você não tem permissão para alterar dados fiscais da empresa.')
  }
}

export async function GET() {
  const user = await getActiveUser()
  assertCanManage(user.role)
  const companyId = await getActiveCompanyId()

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      name: true,
      legalName: true,
      cnpj: true,
      ie: true,
      fiscalAddress: true,
      updatedAt: true,
    },
  })

  return NextResponse.json({ company })
}

export async function PUT(request: Request) {
  const user = await getActiveUser()
  assertCanManage(user.role)
  const companyId = await getActiveCompanyId()

  const body = (await request.json()) as Partial<{
    legalName: string | null
    cnpj: string | null
    ie: string | null
    fiscalAddress: unknown | null
  }>

  const company = await prisma.company.update({
    where: { id: companyId },
    data: {
      legalName: body.legalName === undefined ? undefined : body.legalName?.trim() || null,
      cnpj: body.cnpj === undefined ? undefined : body.cnpj?.trim() || null,
      ie: body.ie === undefined ? undefined : body.ie?.trim() || null,
      fiscalAddress: body.fiscalAddress === undefined ? undefined : (body.fiscalAddress ?? null),
    },
    select: {
      id: true,
      name: true,
      legalName: true,
      cnpj: true,
      ie: true,
      fiscalAddress: true,
      updatedAt: true,
    },
  })

  return NextResponse.json({ company })
}
