'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getNegocio, updateNegocio } from '@/lib/queries/all'
import { useState } from 'react'

export default function ConfigPage() {
  const { data: negocio, isLoading } = useQuery({ queryKey: ['negocio'], queryFn: getNegocio })
  const qc = useQueryClient()
  const [saved, setSaved] = useState(false)
  const update = useMutation({
    mutationFn: (data: Record<string, string>) => updateNegocio(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['negocio'] }); setSaved(true); setTimeout(() => setSaved(false), 2000) },
  })

  if (isLoading) return <main className="p-6"><p>Cargando...</p></main>

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Configuración del negocio</h1>
      {negocio && (
        <form onSubmit={(e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          const data: Record<string, string> = {}
          fd.forEach((v, k) => { if (typeof v === 'string') data[k] = v })
          update.mutate(data)
        }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nombre del negocio</label>
            <input name="nombre" defaultValue={negocio.nombre} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">WhatsApp del negocio</label>
            <input name="whatsapp_negocio" defaultValue={negocio.whatsapp_negocio || ''} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Horario de atención</label>
            <input name="horario_atencion" defaultValue={negocio.horario_atencion || ''} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Personalidad del bot</label>
            <textarea name="personalidad_bot" defaultValue={negocio.personalidad_bot || ''} rows={4} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg text-sm">{update.isPending ? 'Guardando...' : 'Guardar cambios'}</button>
            {saved && <span className="text-sm text-green-600">✓ Guardado</span>}
          </div>
        </form>
      )}
    </main>
  )
}
