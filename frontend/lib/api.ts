import { appConfig } from './config'

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers || {})
  headers.set('Content-Type', 'application/json')

  if (appConfig.devToken) headers.set('x-dev-token', appConfig.devToken)
  if (appConfig.negocioId) headers.set('x-negocio-id', appConfig.negocioId)

  const res = await fetch(`${appConfig.apiUrl}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `API error ${res.status}`)
  }

  return res.json()
}
