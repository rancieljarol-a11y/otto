'use client'

import { KpiCard } from './kpi-card'
import { OrdersList } from './orders-list'
import { LoadingSkeleton } from './loading-skeleton'
import { ErrorState } from './error-state'
import { EmptyState } from './empty-state'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useDashboard } from '@/hooks/use-dashboard'

export function DashboardShell() {
  const { resumen, pendientes, lowStock, isLoading, isError, error } = useDashboard()

  if (isLoading) return <LoadingSkeleton />
  if (isError) return <main className="p-6"><ErrorState message={`Error cargando dashboard: ${String(error)}`} /></main>

  const stats = resumen.data?.stats
  const clients = resumen.data?.clients
  const recent = resumen.data?.recent_orders || []
  const pending = pendientes.data || []
  const low = lowStock.data || []

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard OttO</h1>
          <p className="text-muted-foreground">Resumen operativo real del negocio en WhatsApp.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard title="Ventas totales" value={stats?.ventas_totales || '0'} />
          <KpiCard title="Pedidos" value={stats?.total_pedidos || '0'} />
          <KpiCard title="Pendientes" value={stats?.pendientes || '0'} />
          <KpiCard title="Clientes" value={clients?.total_clientes || '0'} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <OrdersList title="Pedidos recientes" description="Últimos pedidos del negocio" orders={recent} />
          <OrdersList title="Pedidos pendientes" description="Órdenes que requieren atención" orders={pending} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Productos con stock bajo</CardTitle>
            <CardDescription>Alertas operativas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {low.length ? low.map((item) => (
                <div key={item.id} className="rounded-lg border bg-white px-3 py-2 text-sm">
                  {item.nombre} {item.stock !== undefined ? `· stock ${item.stock}` : ''}
                </div>
              )) : <EmptyState message="Sin alertas de stock." />}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
