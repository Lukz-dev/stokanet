'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

export interface AnimatedListItem {
  id: string
  name: string
  description: string
}

interface DisplayedEntry {
  uid: number
  item: AnimatedListItem
}

/**
 * Animated List (Magic UI) — feed que faz novos itens entrarem deslizando
 * de cima e os mais antigos saírem por baixo, em loop suave.
 */
export function AnimatedList({
  items,
  interval = 4000,
  maxVisible = 5,
  className,
}: {
  items: AnimatedListItem[]
  interval?: number
  maxVisible?: number
  className?: string
}) {
  const uidRef = useRef(0)
  const nextIndexRef = useRef(items.length > maxVisible ? maxVisible : 0)
  const [displayed, setDisplayed] = useState<DisplayedEntry[]>(() =>
    items.slice(0, maxVisible).map((item) => ({ uid: ++uidRef.current, item }))
  )

  useEffect(() => {
    if (items.length <= maxVisible) return
    const id = window.setInterval(() => {
      const item = items[nextIndexRef.current % items.length]
      nextIndexRef.current += 1
      setDisplayed((prev) => [
        ...prev.slice(-(maxVisible - 1)),
        { uid: ++uidRef.current, item },
      ])
    }, interval)
    return () => window.clearInterval(id)
  }, [items, interval, maxVisible])

  return (
    <div className={`relative flex flex-col gap-3 overflow-hidden ${className ?? ''}`}>
      <AnimatePresence initial={false} mode="popLayout">
        {displayed.map(({ uid, item }) => (
          <motion.div
            key={uid}
            layout
            initial={{ opacity: 0, y: -28, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 28, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="relative"
          >
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.name}</p>
                <p className="truncate text-xs text-muted-foreground">{item.description}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
