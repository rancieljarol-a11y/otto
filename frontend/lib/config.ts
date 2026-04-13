export const appConfig = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://otto-api.onrender.com'),
  devToken: process.env.NEXT_PUBLIC_DEV_TOKEN || '',
  negocioId: process.env.NEXT_PUBLIC_NEGOCIO_ID || '4e95adf6-b979-4f82-a711-86c07e872bf2',
}
