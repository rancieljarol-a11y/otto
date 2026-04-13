'use client'

import { useQuery } from '@tanstack/react-query'
import { getDashboardResumen, getLowStock, getPedidosPendientes } from '@/lib/queries/dashboard'

export function useDashboard() {
  const resumen = useQuery({ queryKey: ['dashboard', 'resumen'], queryFn: getDashboardResumen })
  const pendientes = useQuery({ queryKey: ['dashboard', 'pendientes'], queryFn: getPedidosPendientes })
  const lowStock = useQuery({ queryKey: ['dashboard', 'low-stock'], queryFn: getLowStock })

  return {
    resumen,
    pendientes,
    lowStock,
    isLoading: resumen.isLoading || pendientes.isLoading || lowStock.isLoading,
    isError: resumen.isError || pendientes.isError || lowStock.isError,
    error: resumen.error || pendientes.error || lowStock.error,
  }
}
