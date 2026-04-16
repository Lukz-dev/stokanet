'use server'

import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { getSystemAdminUser } from '@/lib/access'

export async function getAdminUsers() {
  await getSystemAdminUser()

  return prisma.user.findMany({
    orderBy: [
      { isSystemAdmin: 'desc' },
      { isApproved: 'desc' },
      { createdAt: 'desc' },
    ],
    include: {
      company: true,
    },
  })
}

export async function setUserApproval(userId: string, isApproved: boolean) {
  await getSystemAdminUser()

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isSystemAdmin: true },
  })

  if (!targetUser) {
    throw new Error('Conta não encontrada')
  }

  if (targetUser.isSystemAdmin) {
    throw new Error('Não é possível alterar o acesso do administrador do sistema')
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isApproved },
  })

  revalidatePath('/admin')
}