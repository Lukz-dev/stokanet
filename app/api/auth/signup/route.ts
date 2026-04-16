import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { companyName, name, email, password } = await req.json()

    if (!companyName || !name || !email || !password) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios.' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'A senha deve ter pelo menos 8 caracteres.' }, { status: 400 })
    }

    // Verifica se email já existe
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Este e-mail já está cadastrado.' }, { status: 409 })
    }

    // Cria empresa
    const company = await prisma.company.create({
      data: { name: companyName }
    })

    // Cria usuário admin com bcrypt
    const hashedPassword = await bcrypt.hash(password, 12)
    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'ADMIN',
        isApproved: false,
        isSystemAdmin: false,
        companyId: company.id,
      }
    })

    return NextResponse.json({ success: true, message: 'Cadastro criado com sucesso. Ele ficará aguardando liberação no painel admin.' }, { status: 201 })
  } catch (error) {
    console.error('[SIGNUP ERROR]', error)
    return NextResponse.json({ error: 'Erro interno ao criar conta.' }, { status: 500 })
  }
}
