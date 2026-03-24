# OttO - Plataforma SaaS Multi-tenant

## 📋 Resumen del Proyecto

OttO es una plataforma SaaS multi-tenant que convierte WhatsApp en el sistema operativo completo para negocios pequeños (restaurantes, cafeterías, hoteles, tiendas).

### Stack Tecnológico

- **Backend**: Node.js + Express
- **Frontend**: Next.js 14 + ShadCN + Tailwind
- **Base de Datos**: PostgreSQL
- **WhatsApp API**: 360dialog
- **Pagos**: Stripe (Subscriptions + Connect)
- **Auth**: Clerk
- **Email**: Resend
- **Analytics**: PostHog

### Arquitectura Multi-tenant

- **Aislamiento por negocio**: Cada negocio tiene sus propios datos aislados
- **RLS (Row Level Security)**: Políticas de seguridad a nivel de fila en PostgreSQL
- **Módulos por tipo**: Hoteles, restaurantes, tiendas, etc.

---

## 🚀 Cómo Iniciar

### Prerrequisitos

1. **PostgreSQL** instalado y corriendo
2. **Node.js 18+** instalado
3. **npm** o **yarn**

### Paso 1: Instalar y Configurar PostgreSQL

```bash
# En Linux (requiere sudo)
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql

# Crear usuario y base de datos
sudo -u postgres createuser -s ottouser
sudo -u postgres createdb ottodb
sudo -u postgres psql -c "ALTER USER ottouser WITH PASSWORD 'tu_password';"
```

### Paso 2: Configurar Backend

```bash
cd otto/backend

# Copiar archivo de entorno
cp .env.example .env

# Editar .env con tus credenciales
# Especialmente: DB_PASSWORD, JWT_SECRET

# Instalar dependencias
npm install

# Iniciar servidor (desarrollo)
npm run dev

# O iniciar producción
npm start
```

### Paso 3: Configurar Frontend

```bash
cd otto/frontend

# Instalar dependencias
npm install

# Iniciar desarrollo
npm run dev
```

---

## 📁 Estructura del Proyecto

```
otto/
├── backend/
│   ├── src/
│   │   ├── config/         # Configuración y DB
│   │   ├── controllers/   # Controladores (pendiente)
│   │   ├── middleware/     # Auth, rate limiting
│   │   ├── models/         # Modelos (Negocio, Cliente, Producto, etc.)
│   │   ├── routes/        # API routes
│   │   └── services/      # AI, WhatsApp, Stripe
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── app/               # Next.js App Router
│   ├── components/        # Componentes React
│   ├── lib/              # Utilidades
│   ├── package.json
│   └── tailwind.config.js
│
└── database/
    └── schema.sql        # Schema completo de PostgreSQL
```

---

## 🗄️ Base de Datos

### Tablas Creadas

**CORE** (Multi-tenant):
- `tipos_negocio` - Tipos de negocio (restaurante, hotel, etc.)
- `negocios` - Negocios principales (tenants)
- `numeros_autorizados` - Teléfonos autorizados por negocio
- `clientes` - Clientes por negocio
- `conversaciones` - Historial de chats
- `conocimiento_negocio` - Personalidad e instrucciones del bot
- `suscripciones_otto` - Suscripciones Stripe
- `onboarding_negocio` - Pasos de configuración

**MÓDULO CATÁLOGO**:
- `productos` - Catálogo de productos
- `opciones_personalizacion` - Personalizaciones ( toppings, tamaños)
- `pedidos` - Pedidos realizados
- `costos_productos` - Costos para márgenes
- `gastos_negocio` - Gastos del negocio

**MÓDULO DOCUMENTOS**:
- `facturas` - Facturas electrónicas

**MÓDULO AFILIADOS**:
- `afiliados` - Afiliados/referidores
- `referidos` - Negocios referidos
- `pagos_afiliados` - Comisiones pagadas

---

## 🤖 Pirámide de Decisión IA

```
Nivel 1 (60%) - Reglas puras: $0
├── Menús y catálogos
├── Confirmaciones
├── Consultas de estado
└── Respuestas automáticas

Nivel 2 (25%) - NLP ligero: $0
├── Detección de intención por keywords
├── Patrones simples
└── Extracción de datos

Nivel 3 (12%) - IA local (Llama/Mistral): $ Bajo
└── Mensajes ambiguos que requieren contexto

Nivel 4 (3%) - IA cloud (Claude): $ Real
└── Último recurso para casos complejos
```

---

## 📝 Próximos Pasos

### Pendientes de Implementar:

1. **Stripe Connect** - Pagos para afiliados
2. **Facturación electrónica** - Integración Sunat
3. **Whisper local** - Voz a texto
4. **Tesseract OCR** - Lectura de imágenes
5. **Dashboard completo** - Frontend de gestión
6. **Webhooks** - Stripe, 360dialog

---

## 🔐 Variables de Entorno Requeridas

```
# Database
DB_PASSWORD=***

# JWT
JWT_SECRET=***

# WhatsApp
WHATSAPP_API_KEY=***

# Stripe
STRIPE_SECRET_KEY=***
STRIPE_WEBHOOK_SECRET=***

# Clerk
CLERK_SECRET_KEY=***

# Resend
RESEND_API_KEY=***

# IA (opcional)
CLOUD_AI_API_KEY=***
```

---

## 📊 Estado del Proyecto

- ✅ Schema de base de datos completo
- ✅ Backend Express con modelos y rutas
- ✅ Frontend Next.js básico con landing page
- ✅ Servicio de IA con pirámide de decisión
- ✅ Integración WhatsApp (360dialog) preliminar
- ⏳ PostgreSQL requiere instalación en host
- ⏳ Stripe Connect completo
- ⏳ Dashboard de gestión
- ⏳ Facturación electrónica

---

*Generado por Paco - OttO Architect*