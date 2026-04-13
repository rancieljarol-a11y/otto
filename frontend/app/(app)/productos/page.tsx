'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listProductos, createProducto, updateProducto, deleteProducto, getCategorias } from '@/lib/queries/all'
import type { Producto } from '@/types/domain'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Package } from 'lucide-react'

function ProductoModal({ initial, onClose }: { initial?: Producto; onClose: () => void }) {
  const qc = useQueryClient()
  const [done, setDone] = useState(false)
  const [cats] = useState<string[]>([])

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      initial ? updateProducto(initial.id, data) : createProducto(data as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['productos'] })
      setDone(true)
      setTimeout(() => { setDone(false); onClose() }, 1500)
    },
  })

  function handle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const data: Record<string, unknown> = {}
    for (const [k, v] of fd.entries()) {
      if (k === 'precio') data[k] = parseFloat(v as string)
      else if (k === 'stock_actual' || k === 'stock_minimo') data[k] = parseInt(v as string)
      else if (k === 'activo') data[k] = v === '1'
      else if (v) data[k] = v
    }
    mutation.mutate(data)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">{initial ? 'Editar producto' : 'Nuevo producto'}</h2>
        <form onSubmit={handle} className="space-y-3">
          <input name="nombre" defaultValue={initial?.nombre} placeholder="Nombre del producto *" className="w-full border rounded-lg px-3 py-2 text-sm" required />
          <input name="descripcion" defaultValue={initial?.descripcion} placeholder="Descripción" className="w-full border rounded-lg px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <input name="precio" type="number" step="0.01" defaultValue={initial?.precio} placeholder="Precio (RD$)*" className="border rounded-lg px-3 py-2 text-sm" required />
            <input name="categoria" defaultValue={initial?.categoria} placeholder="Categoría" list="categorias-list" className="border rounded-lg px-3 py-2 text-sm" />
          </div>
          <datalist id="categorias-list">
            {cats.map(c => <option key={c} value={c} />)}
          </datalist>
          <div className="grid grid-cols-2 gap-3">
            <input name="stock_actual" type="number" defaultValue={initial?.stock_actual ?? 0} placeholder="Stock actual" className="border rounded-lg px-3 py-2 text-sm" />
            <input name="stock_minimo" type="number" defaultValue={initial?.stock_minimo ?? 0} placeholder="Stock mínimo" className="border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <input name="activo" type="checkbox" value="1" defaultChecked={initial?.activo ?? true} id="activo-check" />
            <label htmlFor="activo-check" className="text-sm">Producto activo</label>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={mutation.isPending} className="bg-primary text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">
              {mutation.isPending ? 'Guardando...' : 'Guardar'}
            </button>
            <button type="button" onClick={onClose} className="border px-4 py-2 rounded-lg text-sm">Cancelar</button>
            {done && <span className="text-sm text-green-600 self-center">✓</span>}
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ProductosPage() {
  const { data: productos, isLoading } = useQuery({ queryKey: ['productos'], queryFn: listProductos })
  const { data: cats } = useQuery({ queryKey: ['categorias'], queryFn: getCategorias })
  const qc = useQueryClient()
  const [modal, setModal] = useState<Producto | null>(null)
  const del = useMutation({
    mutationFn: deleteProducto,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['productos'] }),
  })

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Productos</h1>
          <p className="text-sm text-muted-foreground">{productos?.length ?? 0} productos</p>
        </div>
        <Button onClick={() => setModal({} as Producto)} className="gap-2">
          <Plus className="h-4 w-4" /> Nuevo producto
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground">Cargando...</p>}
      {productos && (
        <>
          {cats && cats.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {cats.map(c => (
                <Badge key={c} variant="outline">{c}</Badge>
              ))}
            </div>
          )}
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted"><tr>
                <th className="px-4 py-3 text-left">Nombre</th>
                <th className="px-4 py-3 text-left">Categoría</th>
                <th className="px-4 py-3 text-right">Precio (RD$)</th>
                <th className="px-4 py-3 text-right">Stock</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr></thead>
              <tbody className="bg-white divide-y">
                {productos.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center">
                    <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">Sin productos todavía.</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => setModal({} as Producto)}>Agregar el primero</Button>
                  </td></tr>
                )}
                {productos.map((p: Producto) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{p.nombre}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.categoria || '-'}</td>
                    <td className="px-4 py-3 text-right font-mono">{p.precio}</td>
                    <td className="px-4 py-3 text-right">
                      {p.stock_actual !== undefined ? (
                        <span className={p.stock_actual <= (p.stock_minimo ?? 0) ? 'text-red-600 font-medium' : ''}>
                          {p.stock_actual}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-1 rounded ${p.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{p.activo ? 'Activo' : 'Inactivo'}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <button onClick={() => setModal(p)} className="text-muted-foreground hover:text-primary p-1"><Edit className="h-4 w-4" /></button>
                        <button onClick={() => { if (confirm('¿Eliminar este producto?')) del.mutate(p.id) }} className="text-muted-foreground hover:text-red-600 p-1"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {modal !== null && <ProductoModal initial={modal.id ? modal : undefined} onClose={() => setModal(null)} />}
    </main>
  )
}
