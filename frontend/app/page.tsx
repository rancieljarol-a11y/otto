'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MessageSquare, ShoppingCart, FileText, Users, BarChart3, Globe } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">O</span>
            </div>
            <span className="text-xl font-bold">OttO</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#features" className="text-sm font-medium hover:text-primary">Características</Link>
            <Link href="#pricing" className="text-sm font-medium hover:text-primary">Precios</Link>
            <Link href="#about" className="text-sm font-medium hover:text-primary">Nosotros</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost">Iniciar sesión</Button>
            </Link>
            <Link href="/onboarding">
              <Button>Comenzar gratis</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 mb-4">
            🚀 Versión 1.0 - SaaS multi-tenant
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
            Tu negocio en <span className="text-primary">WhatsApp</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Convierte WhatsApp en el sistema operativo completo de tu negocio. Catálogo, pedidos, facturas y más, todo en un solo lugar.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/onboarding">
              <Button size="lg" className="text-lg">Crear mi negocio gratis</Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="outline" className="text-lg">Ver demo</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Todo lo que necesitas</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: MessageSquare, title: 'WhatsApp Business', desc: 'Tu WhatsApp funcionando como sistema completo de atención al cliente' },
              { icon: ShoppingCart, title: 'Catálogo Digital', desc: 'Comparte tu menú o productos con fotos, precios y personalizaciones' },
              { icon: FileText, title: 'Facturación', desc: 'Genera facturas electrónicas automáticas con DGII' },
              { icon: Users, title: 'CRM Completo', desc: 'Historial de clientes, preferencias y deuda activa' },
              { icon: BarChart3, title: 'Analytics', desc: 'Estadísticas en tiempo real de ventas, productos y clientes' },
              { icon: Globe, title: 'Multi-idioma', desc: 'Soporte para español, inglés y más idiomas' },
            ].map((feature, i) => (
              <div key={i} className="rounded-lg bg-card text-card-foreground shadow-sm border-2 hover:border-primary/50 transition-colors p-6">
                <div className="text-primary mb-2">
                  <feature.icon className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Precios simples</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { name: 'Founder', price: 'RD$29.90', features: ['Catálogo ilimitado', 'Pedidos por WhatsApp', '5 clientes activos', 'Reportes básicos'], highlight: true },
              { name: 'Pro', price: 'RD$99.90', features: ['Todo de Founder', 'Clientes ilimitados', 'Facturación electrónica', 'Análisis avanzados', 'Múltiples empleados', 'API access'] },
              { name: 'Enterprise', price: 'RD$249.90', features: ['Todo de Pro', 'Múltiendas', 'White-label', 'SLA garantizado', 'Soporte 24/7'] },
            ].map((plan, i) => (
              <div key={i} className={`rounded-lg border bg-card text-card-foreground shadow-sm p-6 ${plan.highlight ? 'border-primary border-2' : ''}`}>
                <h3 className="text-2xl font-semibold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{plan.price}/mes</p>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm">
                      <span className="text-primary">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/onboarding">
                  <Button className="w-full" variant={plan.highlight ? 'default' : 'outline'}>Empezar</Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                <span className="text-white text-xs font-bold">O</span>
              </div>
              <span className="font-bold">OttO</span>
            </div>
            <p className="text-sm text-muted-foreground">© 2024 OttO. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}