'use client'
import { useQuery } from '@tanstack/react-query'
import { getGastosStats, listGastos } from '@/lib/queries/all'

export default function GastosPage() {
  const { data: stats } = useQuery({ queryKey: ['gastos-stats'], queryFn: () => getGastosStats() })
  const { data: gastos } = useQuery({ queryKey: ['gastos'], queryFn: () => listGastos() })

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Gastos</h1>
      <div className="grid gap-4 mb-6 md:grid-cols-3">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-muted-foreground">Total gastos</p>
          <p className="text-2xl font-bold">RD${stats?.total || 0}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-muted-foreground">Este mes</p>
          <p className="text-2xl font-bold">RD${stats?.mes_actual || 0}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-muted-foreground">Mes anterior</p>
          <p className="text-2xl font-bold">RD${stats?.mes_anterior || 0}</p>
        </div>
      </div>
      {gastos && (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left">Descripción</th>
                <th className="px-4 py-3 text-left">Categoría</th>
                <th className="px-4 py-3 text-right">Monto (RD$)</th>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-center">Tipo</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y">
              {gastos.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Sin gastos registrados.</td></tr>}
              {gastos.map((g: any) => (
                <tr key={g.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{g.descripcion}</td>
                  <td className="px-4 py-3 text-muted-foreground">{g.categoria || '-'}</td>
                  <td className="px-4 py-3 text-right text-red-600">RD${g.monto}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(g.fecha).toLocaleDateString('es-DO')}</td>
                  <td className="px-4 py-3 text-center"><span className={`text-xs px-2 py-1 rounded ${g.periodicidad ? 'bg-blue-100 text-blue-700' : 'bg-slate-100'}`}>{g.periodicidad ? `Recurrente (${g.periodicidad})` : (g.tipo || 'Variable')}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
