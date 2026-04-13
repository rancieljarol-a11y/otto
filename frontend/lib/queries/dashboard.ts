import { apiFetch } from '../api'
import type { DashboardResumen, Pedido, Producto } from '@/types/domain'

export function getDashboardResumen() {
  return apiFetch<DashboardResumen>('/api/dashboard/resumen')
}

export function getPedidosPendientes() {
  return apiFetch<Pedido[]>('/api/pedidos/pendientes')
}

export function getLowStock() {
  return apiFetch<Producto[]>('/api/productos/low-stock')
}
