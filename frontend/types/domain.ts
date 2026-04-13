export type PedidoStats = {
  total_pedidos: string
  pendientes: string
  confirmados: string
  en_preparacion: string
  entregados: string
  cancelados: string
  ventas_totales: string | null
  promedio_pedido: string | null
}

export type ClienteStats = {
  total_clientes: string
  clientes_nuevos_mes: string
  clientes_con_deuda: string
  clientes_bloqueados: string
}

export type Pedido = {
  id: string
  numero_pedido: string
  cliente_id?: string
  cliente_nombre?: string
  cliente_telefono?: string
  productos: unknown[]
  subtotal: string
  total: string
  estado: string
  origen: string
  metodo_pago?: string
  notas_especiales?: string
  fecha_pedido: string
  fecha_confirmacion?: string
  fecha_preparacion?: string
  fecha_entrega?: string
  fecha_cancelacion?: string
}

export type Cliente = {
  id: string
  numero_whatsapp: string
  nombre: string
  email?: string
  deuda_activa: string
  bloqueado: boolean
  ultima_conversacion?: string
  created_at: string
}

export type Producto = {
  id: string
  nombre: string
  descripcion?: string
  precio: string
  categoria?: string
  stock?: number
  stock_actual?: number
  stock_minimo?: number
  activo: boolean
  posicion?: number
  foto?: string
}

export type Negocio = {
  id: string
  nombre: string
  whatsapp_dueno: string
  whatsapp_negocio?: string
  plan: string
  estado: string
  personalidad_bot?: string
  horario_atencion?: string
  idioma?: string
  zona_horaria?: string
  created_at: string
}

export type DashboardResumen = {
  stats: PedidoStats
  recent_orders: Pedido[]
  clients: ClienteStats
  low_stock: Producto[]
}

export type CreateProducto = {
  nombre: string
  descripcion?: string
  precio: number
  categoria?: string
  stock_actual?: number
  stock_minimo?: number
  activo?: boolean
  posicion?: number
  foto?: string
}

export type CreatePedido = {
  cliente_id?: string
  productos: Array<{
    producto_id?: string
    nombre: string
    precio: number
    cantidad: number
    personalizacion?: Record<string, unknown>
  }>
  personalizacion?: Record<string, unknown>
  notas_especiales?: string
  origen?: string
  metodo_pago?: string
}

export type CreateCliente = {
  nombre?: string
  email?: string
}

export type UpdateCliente = {
  nombre?: string
  email?: string
  deuda_activa?: number
  bloqueado?: boolean
}
