'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listPedidos, updateEstadoPedido, getPedidosPendientes } from '@/lib/queries/all'
import type { Pedido } from '@/types/domain'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CheckCircle, Clock, XCircle, ChevronRight, Filter } from 'lucide-react'

const ESTADOS = ['pendiente', 'confirmado', 'en_preparacion', 'entregado', 'cancelado']

const ESTILO_ESTADO: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  confirmado: 'bg-blue-100 text-blue-800',
  en_preparacion: 'bg-orange-100 text-orange-800',
  entregado: 'bg-green-100 text-green-800',
  cancelado: 'bg-red-100 text-red-800',
}

export default function PedidosPage() {
  const [filtroEstado, setFiltroEstado] = useState<string | null>(null)
  const { data: pedidos, isLoading } = useQuery({ queryKey: ['pedidos'], queryFn: () => listPedidos({ limit: 100 }) })
  const { data: pendientes } = useQuery({ queryKey: ['pedidos-pendientes'], queryFn: getPedidosPendientes })
  const qc = useQueryClient()
  const avanzar = useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: string }) => updateEstadoPedido(id, estado),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pedidos'] }); qc.invalidateQueries({ queryKey: ['pedidos-pendientes'] }) },
  })

  const filtrados = filtroEstado
    ? (pedidos || []).filter((o: Pedido) => o.estado === filtroEstado)
    : (pedidos || [])

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Pedidos</h1>
          <p className="text-sm text-muted-foreground">
            {pendientes?.length ?? 0} pendientes · {(pedidos || []).length} totales
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <div className="flex gap-1 flex-wrap">
            <Button size="sm" variant={filtroEstado === null ? 'default' : 'outline'} onClick={() => setFiltroEstado(null)}>Todos</Button>
            {ESTADOS.map(est => (
              <Button key={est} size="sm" variant={filtroEstado === est ? 'default' : 'outline'} onClick={() => setFiltroEstado(est)} className="capitalize">
                {est.replace('_', ' ')}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {isLoading && <p className="text-muted-foreground">Cargando...</p>}
      {!isLoading && filtrados.length === 0 && (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Sin pedidos en esta categoría.</CardContent></Card>
      )}
      {filtrados.map((o: Pedido) => {
        const idx = ESTADOS.indexOf(o.estado)
        const sig = ESTADOS[idx + 1]
        return (
          <Card key={o.id} className="mb-3 hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <span className="text-xs font-mono text-muted-foreground">#{o.numero_pedido}</span>
                  </div>
                  <div>
                    <p className="font-medium">{o.cliente_nombre || 'Cliente'}</p>
                    <p className="text-sm text-muted-foreground">{o.cliente_telefono || ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={ESTILO_ESTADO[o.estado] || 'bg-gray-100'}>{o.estado?.replace('_', ' ')}</Badge>
                  <span className="font-mono font-semibold text-right">RD$ {o.total}</span>
                  {sig && o.estado !== 'cancelado' && o.estado !== 'entregado' && (
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => avanzar.mutate({ id: o.id, estado: sig })} disabled={avanzar.isPending}>
                      <ChevronRight className="h-3 w-3" /> {sig.replace('_', ' ')}
                    </Button>
                  )}
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs text-muted-foreground">{new Date(o.fecha_pedido).toLocaleString('es-DO')}</p>
                {o.metodo_pago && <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">{o.metodo_pago}</span>}
              </div>
              {o.notas_especiales && (
                <p className="mt-2 text-xs bg-yellow-50 border border-yellow-100 rounded px-2 py-1 text-yellow-800">📝 {o.notas_especiales}</p>
              )}
            </CardContent>
          </Card>
        )
      })}
    </main>
  )
}
