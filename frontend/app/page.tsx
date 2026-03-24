import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  MessageCircle, 
  ShoppingCart, 
  FileText, 
  Users, 
  BarChart3, 
  Zap,
  Shield,
  Globe
} from 'lucide-react'

export default function Home() {
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
            <Button variant="ghost">Iniciar sesión</Button>
            <Button>Comenzar gratis</Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-4">
            🚀 Versión 1.0 - SaaS multi-tenant
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
            Tu negocio en{' '}
            <span className="text-primary">WhatsApp</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Convierte WhatsApp en el sistema operativo completo de tu negocio. 
            Catálogo, pedidos, facturas y más, todo en un solo lugar.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg">
              Crear mi negocio gratis
            </Button>
            <Button size="lg" variant="outline" className="text-lg">
              Ver demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Todo lo que necesitas</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<MessageCircle className="w-8 h-8" />}
              title="WhatsApp Business"
              description="Tu WhatsApp funcionando como sistema completo de atención al cliente"
            />
            <FeatureCard
              icon={<ShoppingCart className="w-8 h-8" />}
              title="Catálogo Digital"
              description="Comparte tu menú o productos con fotos, precios y personalizaciones"
            />
            <FeatureCard
              icon={<FileText className="w-8 h-8" />}
              title="Facturación"
              description="Genera facturas electrónicas automáticas con Sunat (Perú)"
            />
            <FeatureCard
              icon={<Users className="w-8 h-8" />}
              title="CRM Completo"
              description="Historial de clientes, preferencias y deuda activa"
            />
            <FeatureCard
              icon={<BarChart3 className="w-8 h-8" />}
              title="Analytics"
              description="Estadísticas en tiempo real de ventas, productos y clientes"
            />
            <FeatureCard
              icon={<Globe className="w-8 h-8" />}
              title="Multi-idioma"
              description="Soporte para español, inglés y más idiomas"
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Precios simples</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <PricingCard
              title="Founder"
              price="S/.29.90"
              description="Para negocios que están comenzando"
              features={[
                'Catálogo ilimitado',
                'Pedidos por WhatsApp',
                '5 clientes activos',
                'Reportes básicos',
                'Soporte por email'
              ]}
              highlighted
            />
            <PricingCard
              title="Pro"
              price="S/.99.90"
              description="Para negocios en crecimiento"
              features={[
                'Todo de Founder',
                'Clientes ilimitados',
                'Facturación electrónica',
                'Análisis avanzados',
                'Múltiples empleados',
                'API access'
              ]}
            />
            <PricingCard
              title="Enterprise"
              price="S/.249.90"
              description="Para cadenas y franchises"
              features={[
                'Todo de Pro',
                'Múltiendas',
                'White-label',
                'SLA garantizado',
                'Soporte 24/7',
                'Implementación dedicada'
              ]}
            />
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
            <p className="text-sm text-muted-foreground">
              © 2024 OttO. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="border-2 hover:border-primary/50 transition-colors">
      <CardHeader>
        <div className="text-primary mb-2">{icon}</div>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function PricingCard({ 
  title, 
  price, 
  description, 
  features,
  highlighted = false
}: { 
  title: string; 
  price: string; 
  description: string; 
  features: string[];
  highlighted?: boolean;
}) {
  return (
    <Card className={highlighted ? 'border-primary border-2' : ''}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <span className="text-3xl font-bold">{price}</span>
          <span className="text-muted-foreground">/mes</span>
        </div>
        <ul className="space-y-2">
          {features.map((feature, i) => (
            <li key={i} className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
        <Button className="w-full mt-6" variant={highlighted ? 'default' : 'outline'}>
          Empezar
        </Button>
      </CardContent>
    </Card>
  )
}