'use client'
import { useQuery } from '@tanstack/react-query'
import { getNegocio } from '@/lib/queries/all'

export function Topbar() {
  const { data: negocio } = useQuery({ queryKey: ['negocio'], queryFn: getNegocio })
  return (
    <header className="h-14 border-b bg-white px-6 flex items-center justify-between shrink-0">
      <span className="font-semibold text-slate-700">{negocio?.nombre || 'OttO'}</span>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">
          {negocio?.plan || ''} {negocio?.plan ? '·' : ''} {negocio?.estado || ''}
        </span>
        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">WhatsApp activo</span>
      </div>
    </header>
  )
}
