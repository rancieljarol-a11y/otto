// OttO - Configuration
// Multi-tenant SaaS via WhatsApp

require('dotenv').config();

module.exports = {
  // Server
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'otto',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'otto-dev-secret'),
    expiresIn: '7d',
  },

  // Security
  security: {
    corsOrigins: (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean),
    onboardingSecret: process.env.ONBOARDING_SECRET || '',
  },

  // WhatsApp - 360dialog
  whatsapp: {
    apiUrl: process.env.WHATSAPP_API_URL || 'https://wapi.360dialog.com',
    apiKey: process.env.WHATSAPP_API_KEY || '',
    webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_TOKEN || 'otto-webhook-verify',
  },

  // Stripe
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
  },

  // Clerk (Auth)
  clerk: {
    secretKey: process.env.CLERK_SECRET_KEY || '',
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY || '',
  },

  // Resend (Email)
  resend: {
    apiKey: process.env.RESEND_API_KEY || '',
    fromEmail: process.env.RESEND_FROM_EMAIL || 'noreply@otto.app',
  },

  // PostHog (Analytics)
  posthog: {
    apiKey: process.env.POSTHOG_API_KEY || '',
    host: process.env.POSTHOG_HOST || 'https://app.posthog.com',
  },

  // IA - Nivel 3 (Local)
  localAI: {
    enabled: process.env.LOCAL_AI_ENABLED === 'true',
    url: process.env.LOCAL_AI_URL || 'http://localhost:11434/api/generate',
    model: process.env.LOCAL_AI_MODEL || 'mistral',
  },

  // IA - Nivel 4 (Cloud fallback)
  cloudAI: {
    provider: process.env.CLOUD_AI_PROVIDER || 'anthropic', // anthropic, openai
    apiKey: process.env.CLOUD_AI_API_KEY || '',
    model: process.env.CLOUD_AI_MODEL || 'claude-3-sonnet',
  },

  // whisper local
  whisper: {
    enabled: process.env.WHISPER_ENABLED === 'true',
    modelPath: process.env.WHISPER_MODEL_PATH || './models/whisper',
  },

  // Tesseract OCR
  tesseract: {
    enabled: process.env.TESSERACT_ENABLED === 'true',
    dataPath: process.env.TESSERACT_DATA_PATH || './data/tesseract',
  },

  // OttO Settings
  otto: {
    maxPausasPorAnio: 3,
    diasGratisTrial: 7,
    precioFounder: 29.90,
    precioBasic: 49.90,
    precioPro: 99.90,
    precioEnterprise: 249.90,
  },

  // Multi-tenant
  multiTenant: {
    schemaStrategy: 'database', // database, schema, or row-level
  },
};