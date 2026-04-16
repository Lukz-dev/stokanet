'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { Box, Lock, Mail, Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const res = await signIn('credentials', {
      redirect: false,
      email,
      password,
    })

    if (res?.ok) {
      router.push('/')
      router.refresh()
      return
    }

    setIsLoading(false)
    setError('E-mail ou senha incorretos. Verifique suas credenciais.')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-indigo-500/15 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="bg-card/70 backdrop-blur-xl border border-border/60 shadow-2xl rounded-2xl p-10 flex flex-col items-center">
          <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-6 border border-primary/30 shadow-lg shadow-primary/10">
            <Box className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Bem-vindo ao Estoque Flex</h1>
          <p className="text-muted-foreground text-sm mt-2 mb-8 text-center">Faça login para controlar produtos, variações e reposições da sua loja.</p>

          {error && (
            <div className="w-full flex items-center gap-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 mb-4">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">E-mail da loja</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="login-email"
                  autoFocus
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                  placeholder="gerente@sualoja.com"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-foreground">Senha</label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-background border border-border rounded-lg outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={isLoading}
              className="w-full mt-1 bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg hover:bg-primary/90 active:scale-[0.99] transition-all shadow-lg shadow-primary/30 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Autenticando...
                </span>
              ) : 'Entrar no Sistema'}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            Ainda não tem uma conta?{' '}
            <Link href="/signup" className="text-primary font-medium hover:underline">
              Criar empresa grátis
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
