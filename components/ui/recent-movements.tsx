'use client'

import { AnimatedList, type AnimatedListItem } from './animated-list'

export interface RecentMovementItem extends AnimatedListItem {}

/**
 * Feed de movimentações recentes (Animated List) para a home do dashboard.
 * Recebe os itens prontos do servidor (texto já formatado).
 */
export function RecentMovementsFeed({ items }: { items: AnimatedListItem[] }) {
  if (items.length === 0) return null
  return <AnimatedList items={items} interval={4000} maxVisible={4} />
}
