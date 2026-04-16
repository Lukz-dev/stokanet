import { getAdminUsers, setUserApproval } from '@/lib/admin'

const formatDate = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

export default async function AdminPage() {
  const users = await getAdminUsers()

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Painel restrito</p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Aprovação de contas</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Libere ou revogue o acesso dos cadastros que chegam pelo site. Contas sem aprovação ficam bloqueadas fora do painel de espera.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Total de contas</p>
          <p className="mt-2 text-3xl font-bold">{users.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Aprovadas</p>
          <p className="mt-2 text-3xl font-bold">{users.filter((user) => user.isApproved).length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Pendentes</p>
          <p className="mt-2 text-3xl font-bold">{users.filter((user) => !user.isApproved && !user.isSystemAdmin).length}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">Contas cadastradas</h2>
        </div>

        <div className="divide-y divide-border">
          {users.map((user) => {
            const statusLabel = user.isSystemAdmin ? 'Administrador do sistema' : user.isApproved ? 'Aprovado' : 'Pendente'
            const statusClass = user.isSystemAdmin
              ? 'bg-primary/10 text-primary border-primary/20'
              : user.isApproved
                ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-700 border-amber-500/20'

            return (
              <div key={user.id} className="grid gap-4 px-6 py-5 md:grid-cols-[1.4fr_1.2fr_0.8fr_auto] md:items-center">
                <div>
                  <p className="font-semibold text-foreground">{user.name ?? 'Sem nome'}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>

                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">{user.company?.name ?? 'Sem empresa'}</p>
                  <p>{formatDate.format(user.createdAt)}</p>
                </div>

                <div>
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusClass}`}>
                    {statusLabel}
                  </span>
                </div>

                <div className="flex justify-start md:justify-end">
                  {user.isSystemAdmin ? (
                    <span className="text-xs text-muted-foreground">Protegido</span>
                  ) : (
                    <form action={setUserApproval.bind(null, user.id, !user.isApproved)}>
                      <button
                        type="submit"
                        className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${user.isApproved ? 'bg-rose-500/10 text-rose-700 hover:bg-rose-500/20' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
                      >
                        {user.isApproved ? 'Revogar acesso' : 'Liberar acesso'}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}