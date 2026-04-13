'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listClientes, getClientesStats, updateCliente } from '@/lib/queries/all'
import type { Cliente } from '@/types/domain'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { Users, Search, ShieldOff, ShieldCheck } from 'lucide-react'

export default function ClientesPage() {
  const [search, setSearch] = useState('')
  const { data: clientes, isLoading } = useQuery({ queryKey: ['clientes'], queryFn: () => listClientes() })
  const { data: stats } = useQuery({ queryKey: ['clientes-stats'], queryFn: getClientesStats })
  const qc = useQueryClient()

  const toggle = useMutation({
    mutationFn: ({ id, bloqueado }: { id: string; bloqueado: boolean }) =>
      updateCliente(id, { bloqueado }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clientes'] }),
  })

  const filtrados = (clientes || []).filter((c: Cliente) =>
    !search || (c.nombre || '').toLowerCase().includes(search.toLowerCase()) ||
    c.numero_whatsapp.includes(search)
  )

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-sm text-muted-foreground">{clientes?.length ?? 0} clientes registrados</p>
        </div>
        <div className="flex items-center gap-2 border rounded-lg px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border-0 bg-transparent text-sm outline-none w-40"
          />
        </div>
      </div>

      {stats && (
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <KpiCard title="Total clientes" value={stats.total_clientes} />
          <KpiCard title="Nuevos este mes" value={stats.clientes_nuevos_mes} />
          <KpiCard title="Con deuda" value={stats.clientes_con_deuda} />
          <KpiCard title="Bloqueados" value={stats.clientes_bloqueados} />
        </div>
      )}

      {isLoading && <p className="text-muted-foreground">Cargando...</p>}
      {!isLoading && (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted"><tr>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">WhatsApp</th>
              <th className="px-4 py-3 text-right">Deuda (RD$)</th>
              <th className="px-4 py-3 text-center">Estado</th>
              <th className="px-4 py-3 text-right">Última actividad</th>
              <th className="px-4 py-3 text-center">Acciones</th>
            </tr></thead>
            <tbody className="bg-white divide-y">
              {filtrados.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center">
                  <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">Sin clientes que mostrar.</p>
                </td></tr>
              )}
              {filtrados.map((c: Cliente) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{c.nombre || <span className="text-muted-foreground italic">Sin nombre</span>}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{c.numero_whatsapp}</td>
                  <td className={`px-4 py-3 text-right font-mono ${Number(c.deuda_activa) > 0 ? 'text-red-600 font-semibold' : 'text-green-600'}`}>
                    {c.deuda_activa}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded ${c.bloqueado ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {c.bloqueado ? 'Bloqueado' : 'Activo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                    {c.ultima_conversacion ? new Date(c.ultima_conversacion).toLocaleDateString('es-DO') : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1"
                      onClick={() => toggle.mutate({ id: c.id, bloqueado: !c.bloqueado })}
                    >
                      {c.bloqueado ? <><ShieldCheck className="h-3 w-3" /> Desbloquear</> : <><ShieldOff className="h-3 w-3" /> Bloquear</>}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
