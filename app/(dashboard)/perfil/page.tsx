import prisma from '@/lib/prisma'
import { getActiveUser } from '@/lib/access'
import { PerfilClient } from './PerfilClient'

export default async function PerfilPage() {
  const activeUser = await getActiveUser()

  const user = await prisma.user.findUnique({
    where: { id: activeUser.id },
    include: { company: true },
  })

  if (!user || !user.company) {
    throw new Error('Perfil indisponível')
  }

  return (
    <PerfilClient
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      }}
      company={{
        id: user.company.id,
        name: user.company.name,
        defaultMinStock: user.company.defaultMinStock,
        createdAt: user.company.createdAt.toISOString(),
      }}
    />
  )
}