'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Package, LayoutDashboard, ArrowRightLeft, Box, Building2, UserRound, Settings, ScanLine, Truck, ClipboardList, BarChart3, ShieldCheck, LogOut, CalendarCheck2, Receipt, BadgeDollarSign, Store, ShoppingCart, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { loadAvatarCached } from '@/lib/client-avatar'

const navItems = [
  { name: 'Visão geral', href: '/', icon: LayoutDashboard },
  { name: 'Produtos', href: '/estoque', icon: Package },
  { name: 'Caixa', href: '/caixa', icon: ScanLine },
  { name: 'Vendas', href: '/vendas', icon: Receipt },
  { name: 'Loja online', href: '/loja', icon: Store },
  { name: 'Pedidos online', href: '/loja/pedidos', icon: ShoppingCart },
  { name: 'Fornecedores', href: '/fornecedores', icon: Truck },
  { name: 'Compras', href: '/compras', icon: ClipboardList },
  { name: 'Fechamento', href: '/fechamento', icon: CalendarCheck2 },
  { name: 'Relatórios', href: '/relatorios', icon: BarChart3 },
  { name: 'Auditoria', href: '/auditoria', icon: ShieldCheck },
  { name: 'Reposições', href: '/movimentacoes', icon: ArrowRightLeft },
  { name: 'Perfil', href: '/perfil', icon: UserRound },
  { name: 'Assinatura', href: '/subscription', icon: BadgeDollarSign },
  { name: 'Configurações', href: '/configuracoes', icon: Settings, adminOnly: true },
  { name: 'Painel Admin', href: '/admin', icon: ShieldCheck, systemAdminOnly: true },
]

export function Sidebar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const companyName = (session?.user as any)?.companyName ?? 'Minha Empresa'
  const role = (session?.user as any)?.role ?? 'OPERATOR'
  const isSystemAdmin = (session?.user as any)?.isSystemAdmin === true
  const userName = session?.user?.name ?? 'Usuário'
  const userEmail = session?.user?.email ?? ''
  const userId = (session?.user as any)?.id as string | undefined
  const avatarVersion = (session?.user as any)?.avatarVersion as number | null | undefined
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const initials = userName.split(' ').map((name) => name[0]).slice(0, 2).join('').toUpperCase()

  useEffect(() => {
    if (!userId) return

    const loadAvatar = async () => {
      try {
        const key = `${userId}:${avatarVersion ?? 0}`
        const nextAvatarUrl = await loadAvatarCached(key)
        setAvatarUrl(nextAvatarUrl)
      } catch {
        setAvatarUrl(null)
      }
    }

    void loadAvatar()
  }, [userId, avatarVersion])

  const visibleItems = navItems
    .filter((item) => !item.adminOnly || role === 'ADMIN' || role === 'MANAGER')
    .filter((item) => !item.systemAdminOnly || isSystemAdmin)

  const navLinks = (
    <nav className="flex flex-col gap-1">
      {visibleItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
        const Icon = item.icon
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all group/sidebar',
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <motion.span
              animate={{ display: open ? 'inline-block' : 'none', opacity: open ? 1 : 0 }}
              className="whitespace-pre inline-block !p-0 !m-0"
            >
              {item.name}
            </motion.span>
          </Link>
        )
      })}
    </nav>
  )

  const userBlock = (
    <div className="space-y-2 border-t border-border p-3">
      <div className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2">
        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-primary/30 bg-primary/20 text-xs font-bold text-primary flex items-center justify-center">
          {avatarUrl ? (
            <Image src={avatarUrl} alt="Foto de perfil" width={32} height={32} unoptimized className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <motion.div animate={{ display: open ? 'block' : 'none', opacity: open ? 1 : 0 }} className="min-w-0">
          <p className="truncate text-sm font-medium">{userName}</p>
          <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
        </motion.div>
      </div>
      <button
        id="btn-logout"
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        <LogOut className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
        <motion.span animate={{ display: open ? 'inline-block' : 'none', opacity: open ? 1 : 0 }} className="whitespace-pre inline-block !p-0 !m-0">
          Sair da conta
        </motion.span>
      </button>
    </div>
  )

  return (
    <>
      {/* Mobile: topo fixo com hambúrguer + drawer */}
      <div className="sticky top-0 z-30 flex h-12 w-full items-center justify-between border-b border-border bg-card/90 px-4 backdrop-blur-md md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
            <Box className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-bold tracking-tight">StokaNet</span>
        </div>
        <Menu className="h-5 w-5 cursor-pointer text-foreground" onClick={() => setMobileOpen(true)} />
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ x: '-100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '-100%', opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="fixed inset-0 z-[100] flex flex-col bg-background p-6"
            >
              <div className="absolute right-6 top-6 cursor-pointer text-foreground" onClick={() => setMobileOpen(false)}>
                <X />
              </div>
              <div className="mt-8 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
                  <Box className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <span className="block text-sm font-bold tracking-tight">StokaNet</span>
                  <span className="block text-xs text-muted-foreground">{companyName}</span>
                </div>
              </div>
              <div className="mt-6 flex-1 overflow-y-auto">
                <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Operação</p>
                {navLinks}
              </div>
              {userBlock}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Desktop: sidebar que expande no hover (modelo Aceternity) */}
      <motion.aside
        className="hidden h-screen flex-shrink-0 flex-col overflow-hidden border-r border-border bg-card/80 backdrop-blur-md md:flex"
        animate={{ width: open ? '300px' : '72px' }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
      >
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
            <Box className="h-4 w-4 text-primary" />
          </div>
          <motion.div animate={{ display: open ? 'block' : 'none', opacity: open ? 1 : 0 }} className="min-w-0">
            <span className="block text-sm font-bold tracking-tight">StokaNet</span>
            <span className="block truncate text-xs text-muted-foreground">Controle de estoque</span>
          </motion.div>
        </div>

        <div className="shrink-0 px-4 pt-4">
          <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/50 px-3 py-2">
            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <motion.span animate={{ display: open ? 'inline-block' : 'none', opacity: open ? 1 : 0 }} className="truncate text-xs text-muted-foreground whitespace-pre inline-block !p-0 !m-0">
              {companyName}
            </motion.span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
          <motion.p animate={{ display: open ? 'block' : 'none', opacity: open ? 1 : 0 }} className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Operação
          </motion.p>
          {navLinks}
        </div>

        {userBlock}
      </motion.aside>
    </>
  )
}