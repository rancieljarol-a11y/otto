import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Pedido } from '@/types/domain'

export function OrdersList({ title, description, orders }: { title: string; description: string; orders: Pedido[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {orders.length ? orders.map((order) => (
            <div key={order.id} className="flex items-center justify-between rounded-lg border bg-white p-4">
              <div>
                <p className="font-medium">{order.numero_pedido} · {order.cliente_nombre || 'Cliente'}</p>
                <p className="text-sm text-muted-foreground">{order.total} · {new Date(order.fecha_pedido).toLocaleString()}</p>
              </div>
              <Badge variant={order.estado === 'pendiente' ? 'secondary' : 'default'}>{order.estado}</Badge>
            </div>
          )) : <p className="text-sm text-muted-foreground">Sin datos todavía.</p>}
        </div>
      </CardContent>
    </Card>
  )
}
