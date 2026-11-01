import type { ComponentType } from 'react'

interface EmptyStateAction {
  label: string
  onClick?: () => void
  href?: string
}

/**
 * Empty State (padrão 21st.dev) — estado vazio com ícone em destaque,
 * título, descrição e ação opcional (link ou botão).
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
  title: string
  description: string
  action?: EmptyStateAction
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl scale-150" aria-hidden="true" />
        <div className="relative rounded-2xl border border-border bg-muted/40 p-4">
          <Icon className="w-8 h-8 text-muted-foreground" strokeWidth={1.5} />
        </div>
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action ? (
        action.href ? (
          <a
            href={action.href}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 active:scale-[0.98]"
          >
            {action.label}
          </a>
        ) : (
          <button
            type="button"
            onClick={action.onClick}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 active:scale-[0.98]"
          >
            {action.label}
          </button>
        )
      ) : null}
    </div>
  )
}
