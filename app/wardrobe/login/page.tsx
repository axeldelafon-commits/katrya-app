'use client'

import { Suspense, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/wardrobe'

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
      }
      router.push(redirect)
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
      <div className="flex mb-6 bg-gray-800 rounded-lg p-1">
        <button
          onClick={() => setMode('login')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === 'login' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'
          }`}
        >
          Connexion
        </button>
        <button
          onClick={() => setMode('signup')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === 'signup' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'
          }`}
        >
          Inscription
        </button>
      </div>
      <form onSubmit={handleAuth} className="space-y-4">
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-white transition-colors"
            placeholder="votre@email.com"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-white transition-colors"
            placeholder="••••••••"
          />
        </div>
        {error && (
          <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-4 py-2">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-white text-black py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          {loading ? 'Chargement...' : mode === 'login' ? 'Se connecter' : "S'inscrire"}
        </button>
      </form>
    </div>
  )
}

export default function WardrobeLoginPage() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-widest mb-2">KATRYA</h1>
          <p className="text-gray-400 text-sm">Accédez à votre dressing virtuel</p>
        </div>
        <Suspense fallback={<div className="text-gray-500 text-center">Chargement...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  )
}
