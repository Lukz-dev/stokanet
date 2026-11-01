'use client'

import { useEffect, useRef, useState } from 'react'
import { useInView, useMotionValue, useSpring } from 'framer-motion'

/**
 * Number Ticker (Magic UI) — anima o número de 0 até `value` quando entra na tela.
 * variant "currency" formata como BRL; "int" usa separador de milhar pt-BR.
 */
export function NumberTicker({
  value,
  variant = 'int',
  className,
  delay = 0,
}: {
  value: number
  variant?: 'int' | 'currency'
  className?: string
  delay?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const motionValue = useMotionValue(0)
  const springValue = useSpring(motionValue, { damping: 40, stiffness: 120 })
  const isInView = useInView(ref, { once: true, margin: '0px' })
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!isInView) return
    if (delay > 0) {
      const timer = window.setTimeout(() => motionValue.set(value), delay * 1000)
      return () => window.clearTimeout(timer)
    }
    motionValue.set(value)
  }, [motionValue, isInView, value, delay])

  useEffect(() => {
    return springValue.on('change', (latest: number) => {
      setDisplay(latest)
    })
  }, [springValue])

  const formatted =
    variant === 'currency'
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(display)
      : Math.round(display).toLocaleString('pt-BR')

  return (
    <span ref={ref} className={className}>
      {formatted}
    </span>
  )
}
