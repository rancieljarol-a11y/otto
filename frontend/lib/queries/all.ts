import { apiFetch } from '../api'
import type {
  DashboardResumen, Pedido, Producto, Cliente, Negocio,
  CreateProducto, CreatePedido, CreateCliente, UpdateCliente,
} from '@/types/domain'

// Dashboard
export function getDashboardResumen() {
  return apiFetch<DashboardResumen>('/api/dashboard/resumen')
}

// Productos
export function listProductos() {
  return apiFetch<Producto[]>('/api/productos')
}
export function getProducto(id: string) {
  return apiFetch<Producto>(`/api/productos/${id}`)
}
export function createProducto(data: CreateProducto) {
  return apiFetch<Producto>('/api/productos', { method: 'POST', body: JSON.stringify(data) })
}
export function updateProducto(id: string, data: Partial<CreateProducto>) {
  return apiFetch<Producto>(`/api/productos/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}
export function deleteProducto(id: string) {
  return apiFetch<Producto>(`/api/productos/${id}`, { method: 'DELETE' })
}

export function getLowStock() {
  return apiFetch<Producto[]>('/api/productos/low-stock')
}
export function getCategorias() {
  return apiFetch<string[]>('/api/productos/categorias')
}

// Pedidos
export function listPedidos(params?: { estado?: string; limit?: number }) {
  const qs = new URLSearchParams(
    Object.entries(params || {}).reduce<Record<string, string>>((acc, [k, v]) => {
      if (v !== undefined && v !== null) acc[k] = String(v)
      return acc
    }, {})
  ).toString()
  return apiFetch<Pedido[]>(`/api/pedidos${qs ? '?' + qs : ''}`)
}
export function getPedido(id: string) {
  return apiFetch<Pedido>(`/api/pedidos/${id}`)
}
export function createPedido(data: CreatePedido) {
  return apiFetch<Pedido>('/api/pedidos', { method: 'POST', body: JSON.stringify(data) })
}
export function updateEstadoPedido(id: string, estado: string) {
  return apiFetch<Pedido>(`/api/pedidos/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ estado }) })
}
export function getPedidosPendientes() {
  return apiFetch<Pedido[]>('/api/pedidos/pendientes')
}
export function getPedidosRecientes(limit = 10) {
  return apiFetch<Pedido[]>(`/api/pedidos/recientes?limit=${limit}`)
}

// Clientes
export function listClientes(params?: { search?: string; bloqueado?: boolean }) {
  const qs = new URLSearchParams(
    Object.entries(params || {}).reduce<Record<string, string>>((acc, [k, v]) => {
      if (v !== undefined && v !== null) acc[k] = String(v)
      return acc
    }, {})
  ).toString()
  return apiFetch<Cliente[]>(`/api/clientes${qs ? '?' + qs : ''}`)
}
export function getCliente(id: string) {
  return apiFetch<Cliente>(`/api/clientes/${id}`)
}
export function updateCliente(id: string, data: UpdateCliente) {
  return apiFetch<Cliente>(`/api/clientes/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}
export function blockCliente(id: string) {
  return apiFetch<Cliente>(`/api/clientes/${id}/block`, { method: 'POST' })
}
export function getClientesStats() {
  return apiFetch<{ total_clientes: string; clientes_nuevos_mes: string; clientes_con_deuda: string; clientes_bloqueados: string }>('/api/clientes/stats')
}

// Negocio
export function getNegocio() {
  return apiFetch<Negocio>('/api/negocios/me')
}
export function updateNegocio(data: Partial<Negocio>) {
  return apiFetch<Negocio>('/api/negocios/me', { method: 'PUT', body: JSON.stringify(data) })
}

// Clientes
export function createCliente(data: { numero_whatsapp: string; nombre?: string; email?: string }) {
  return apiFetch<Cliente>('/api/clientes', { method: 'POST', body: JSON.stringify(data) })
}

// Gastos
export function listGastos(params?: { limit?: number; categoria?: string; tipo?: string }) {
  const qs = new URLSearchParams(
    Object.entries(params || {}).reduce<Record<string, string>>((acc, [k, v]) => {
      if (v !== undefined && v !== null) acc[k] = String(v)
      return acc
    }, {})
  ).toString()
  return apiFetch<any[]>(`/api/gastos${qs ? '?' + qs : ''}`)
}
export function createGasto(data: { descripcion: string; monto: number; categoria?: string; periodicidad?: string; tipo?: string }) {
  return apiFetch<any>('/api/gastos', { method: 'POST', body: JSON.stringify(data) })
}
export function getGastosStats(params?: { desde?: string; hasta?: string }) {
  const qs = new URLSearchParams(
    Object.entries(params || {}).reduce<Record<string, string>>((acc, [k, v]) => {
      if (v !== undefined && v !== null) acc[k] = String(v)
      return acc
    }, {})
  ).toString()
  return apiFetch<any>(`/api/gastos/stats${qs ? '?' + qs : ''}`)
}

// Facturas
export function listFacturas() {
  return apiFetch<any[]>('/api/facturas')
}
export function createFactura(pedido_id: string) {
  return apiFetch<any>('/api/facturas', { method: 'POST', body: JSON.stringify({ pedido_id }) })
}

export async function createNegocio(data: Record<string, unknown>) {
  return apiFetch<Negocio>('/api/negocios', { method: 'POST', body: JSON.stringify(data) })
}
