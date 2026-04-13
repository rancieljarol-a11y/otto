'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      if (!res.ok) {
        throw new Error('Credenciales inválidas')
      }

      const data = await res.json()
      localStorage.setItem('otto_token', data.token)
      localStorage.setItem('otto_negocio', data.negocio_id)
      
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  // Demo login - bypass para demo
  function handleDemo() {
    localStorage.setItem('otto_token', 'demo_token_12345')
    localStorage.setItem('otto_negocio', '4e95adf6-b979-4f82-a711-86c07e872bf2')
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">O</span>
          </div>
          <CardTitle className="text-2xl">OttO</CardTitle>
          <p className="text-sm text-muted-foreground">Inicia sesión en tu cuenta</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 mt-1"
                placeholder="tu@email.com"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 mt-1"
                placeholder="••••••••"
                required
              />
            </div>
            
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Iniciando...' : 'Iniciar sesión'}
            </Button>
          </form>

          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-center text-muted-foreground mb-2">¿No tienes cuenta?</p>
            <Button variant="outline" className="w-full" onClick={handleDemo}>
              Ver Demo
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}