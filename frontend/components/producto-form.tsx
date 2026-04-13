'use client'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createProducto, updateProducto } from '@/lib/queries/all'

export function ProductoForm({ initial }: {
  initial?: { id: string; nombre: string; descripcion: string; precio: string; categoria: string; stock_actual: number; stock_minimo: number; activo: boolean }
}) {
  const qc = useQueryClient()
  const [done, setDone] = useState(false)

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      initial ? updateProducto(initial.id, data) : createProducto(data as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['productos'] })
      setDone(true)
      setTimeout(() => setDone(false), 2000)
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
      else data[k] = v
    }
    mutation.mutate(data)
  }

  return (
    <form onSubmit={handle} className="space-y-3">
      <input name="nombre" defaultValue={initial?.nombre} placeholder="Nombre del producto" className="w-full border rounded-lg px-3 py-2 text-sm" required />
      <input name="descripcion" defaultValue={initial?.descripcion} placeholder="Descripción" className="w-full border rounded-lg px-3 py-2 text-sm" />
      <div className="grid grid-cols-2 gap-3">
        <input name="precio" type="number" step="0.01" defaultValue={initial?.precio} placeholder="Precio (RD$)" className="border rounded-lg px-3 py-2 text-sm" required />
        <input name="categoria" defaultValue={initial?.categoria} placeholder="Categoría" className="border rounded-lg px-3 py-2 text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input name="stock_actual" type="number" defaultValue={initial?.stock_actual ?? 0} placeholder="Stock actual" className="border rounded-lg px-3 py-2 text-sm" />
        <input name="stock_minimo" type="number" defaultValue={initial?.stock_minimo ?? 0} placeholder="Stock mínimo" className="border rounded-lg px-3 py-2 text-sm" />
      </div>
      <div className="flex items-center gap-2">
        <input name="activo" type="checkbox" value="1" defaultChecked={initial?.activo ?? true} />
        <label className="text-sm">Activo</label>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg text-sm">
          {mutation.isPending ? 'Guardando...' : 'Guardar'}
        </button>
        {done && <span className="text-sm text-green-600 self-center">✓ Guardado</span>}
      </div>
    </form>
  )
}
