'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createNegocio } from '@/lib/queries/all'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const pasos = [
  { id: 'datos', titulo: 'Datos del negocio', campos: ['nombre', 'rnc', 'telefono', 'email'] },
  { id: 'ubicacion', titulo: 'Ubicación', campos: ['direccion', 'ciudad', 'whatsapp'] },
  { id: 'estilo', titulo: 'Estilo', campos: ['categoria', 'moneda'] },
]

type DatosNegocio = {
  nombre: string; rnc: string; telefono: string; email: string;
  direccion: string; ciudad: string; whatsapp: string;
  categoria: string; moneda: string;
}

export default function OnboardingPage() {
  const router = useRouter()
  const [paso, setPaso] = useState(0)
  const [cargando, setCargando] = useState(false)
  const [datos, setDatos] = useState<DatosNegocio>({
    nombre: '', rnc: '', telefono: '', email: '',
    direccion: '', ciudad: '', whatsapp: '',
    categoria: 'restaurante', moneda: 'DOP'
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setDatos({ ...datos, [e.target.name]: e.target.value })
  }

  async function handleSiguiente() {
    if (paso < pasos.length - 1) {
      setPaso(paso + 1)
    } else {
      setCargando(true)
      try {
        await createNegocio(datos)
        router.push('/dashboard')
      } catch (e) {
        console.error(e)
        alert('Error creando negocio')
      } finally {
        setCargando(false)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Crear tu negocio</CardTitle>
          <p className="text-sm text-muted-foreground">Paso {paso + 1} de {pasos.length}: {pasos[paso].titulo}</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pasos[paso].campos.map(campo => (
              <div key={campo}>
                <label className="text-sm font-medium capitalize">{campo.replace('_', ' ')} *</label>
                {campo === 'categoria' ? (
                  <select name={campo} value={datos.categoria} onChange={handleChange} className="w-full border rounded-lg px-3 py-2">
                    <option value="restaurante">Restaurante</option>
                    <option value="tienda">Tienda</option>
                    <option value="servicios">Servicios</option>
                    <option value="otro">Otro</option>
                  </select>
                ) : campo === 'moneda' ? (
                  <select name={campo} value={datos.moneda} onChange={handleChange} className="w-full border rounded-lg px-3 py-2">
                    <option value="DOP">RD$ Peso Dominicano</option>
                    <option value="USD">$ Dólar Americano</option>
                  </select>
                ) : (
                  <input
                    type={campo === 'telefono' || campo === 'whatsapp' ? 'tel' : campo === 'email' ? 'email' : 'text'}
                    name={campo}
                    value={datos[campo as keyof DatosNegocio]}
                    onChange={(e) => setDatos({...datos, [campo]: e.target.value})}
                    required
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder={campo.replace('_', ' ')}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-6">
            {paso > 0 && (
              <Button variant="outline" onClick={() => setPaso(paso - 1)}>Atrás</Button>
            )}
            <Button className="flex-1" onClick={handleSiguiente} disabled={cargando}>
              {cargando ? 'Creando...' : paso === pasos.length - 1 ? 'Crear negocio' : 'Siguiente'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
