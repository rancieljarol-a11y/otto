# OTTO_DOCS.md - Documentación del Módulo FASE 1

> Versión: 1.0.0 | Fecha: 2026-03-23 | Estado: ✅ Completado

---

## 📋 Resumen del Módulo

**FASE 1 - BASE** del proyecto OttO - SaaS multi-tenant para negocios pequeños vía WhatsApp.

### Objetivos alcanzados:
- ✅ PostgreSQL instalado y configurado
- ✅ Base de datos multi-tenant con 20 tablas
- ✅ Backend Node.js/Express funcionando
- ✅ 8 Agentes implementados con pirámide de decisión IA
- ✅ Seguridad: soft delete, auditoría, rate limiting

---

## 🗂️ Estructura del Proyecto

```
otto/
├── backend/
│   ├── src/
│   │   ├── agents/              # Orquestador y agentes
│   │   │   ├── index.js         # Orquestador de agentes
│   │   │   ├── recepcionista.js # Agente principal
│   │   │   ├── ventas.js        # Agente de ventas
│   │   │   ├── administrador.js# Agente admin
│   │   │   ├── memoria.js       # Recordatorios fechas especiales
│   │   │   ├── documentos.js    # Recibos y cotizaciones
│   │   │   ├── cobros.js       # Facturas vencidas
│   │   │   ├── onboarding.js    # Guía 7 días
│   │   │   └── antispam.js     # Detector de spam
│   │   │
│   │   ├── config/              # Configuración
│   │   │   ├── index.js         # Variables de entorno
│   │   │   └── database.js      # Conexión PostgreSQL
│   │   │
│   │   ├── models/              # Modelos ORM
│   │   │   ├── negocio.js       # Negocios/tenants
│   │   │   ├── cliente.js       # Clientes por negocio
│   │   │   ├── producto.js      # Catálogo de productos
│   │   │   ├── pedido.js       # Pedidos
│   │   │   ├── conversacion.js  # Historial de chats
│   │   │   ├── gastos.js       # Gastos del negocio
│   │   │   ├── costos.js       # Costos por producto
│   │   │   └── factura.js      # Facturas/recibos
│   │   │
│   │   ├── services/            # Servicios externos
│   │   │   ├── ai.js           # Pirámide de decisión IA (Nivel 1-4)
│   │   │   └── whatsapp.js    # Integración 360dialog
│   │   │
│   │   ├── middleware/          # Middleware Express
│   │   │   ├── auth.js         # Autenticación JWT
│   │   │   └── tenant.js       # Aislamiento multi-tenant
│   │   │
│   │   ├── routes/             # API REST
│   │   │   └── index.js        # Todas las rutas
│   │   │
│   │   └── index.js            # Entry point del servidor
│   │
│   ├── package.json
│   ├── .env                    # Variables de entorno
│   └── .env.example            # Template de variables
│
├── database/
│   └── schema.sql              # Schema completo PostgreSQL
│
└── frontend/                   # (Pendiente FASE 3)
    └── (estructura básica creada)
```

---

## 🗄️ Base de Datos - Tablas Creadas

### Tablas CORE (Multi-tenant):
| Tabla | Descripción |
|-------|-------------|
| `tipos_negocio` | Tipos de negocio (restaurante, hotel, tienda) |
| `negocios` | Negocios principales (tenants) |
| `numeros_autorizados` | Teléfonos autorizados por rol (dueño/empleado/supervisor) |
| `clientes` | Clientes por negocio (aislado) |
| `conversaciones` | Historial de mensajes por cliente |
| `conocimiento_negocio` | Personalidad e instrucciones del bot |
| `suscripciones_otto` | Suscripciones Stripe |
| `onboarding_negocio` | Pasos de configuración |

### Módulo CATÁLOGO:
| Tabla | Descripción |
|-------|-------------|
| `productos` | Catálogo de productos |
| `opciones_personalizacion` | Personalizaciones (toppings, tamaños) |
| `pedidos` | Pedidos realizados |
| `costos_productos` | Costos por componente |
| `gastos_negocio` | Gastos fijos y variables |

### Módulo DOCUMENTOS:
| Tabla | Descripción |
|-------|-------------|
| `facturas` | Facturas y recibos |

### Módulo AFILIADOS:
| Tabla | Descripción |
|-------|-------------|
| `afiliados` | Afiliados/referidores |
| `referidos` | Negocios referidos |
| `pagos_afiliados` | Comisiones pagadas |

### UTILIDADES:
| Tabla | Descripción |
|-------|-------------|
| `logs_actividad` | Auditoría de acciones |
| `webhooks_whatsapp` | Webhooks recibidos |
| `metodos_pago_negocio` | Métodos de pago configurados |

---

## 🤖 Agentes Implementados

### 1. Agente Recepcionista
- **Función**: Primera línea de atención
- **Capacidades**: 
  - Identificar negocio por número entrante
  - Identificar rol del número (dueño/empleado/cliente)
  - Detectar spam y modo fuera de horario
  - Enrutar al agente correcto
- **Optimización**: 100% reglas, cero IA

### 2. Agente de Ventas
- **Función**: Crear pedidos y cerrar ventas
- **Capacidades**:
  - Procesar pedidos simples
  - Consultar productos
  - Enviar menú
  - Alertar al dueño al cerrar venta
- **Optimización**: 70% reglas, 25% NLP, 5% IA

### 3. Agente Administrador
- **Función**: Gestión del negocio (solo dueño/supervisor)
- **Capacidades**:
  - Gestionar productos (agregar/editar/eliminar)
  - Gestionar clientes (bloquear/desbloquear/deuda)
  - Generar reportes (diario/semanal/mensual)
  - Configurar horario y personalidad del bot
  - Gestionar empleados
  - Registrar gastos
- **Optimización**: 50% reglas, 30% NLP, 20% IA

### 4. Agente de Memoria
- **Función**: Recordatorios de fechas especiales
- **Capacidades**:
  - Enviar recordatorios de cumpleaños
  - Enviar recordatorios de aniversarios
  - Corre diariamente a las 8am
- **Optimización**: 100% automático, cero IA

### 5. Agente de Documentos
- **Función**: Generar documentos
- **Capacidades**:
  - Generar recibos en texto
  - Generar cotizaciones
  - Generar facturas (placeholder Sunat)
- **Optimización**: 100% plantillas, cero IA

### 6. Agente de Cobros
- **Función**: Recordatorios de facturas vencidas
- **Capacidades**:
  - Enviar recordatorios de facturas pendientes
  - Enviar alertas de facturas vencidas
  - Corre diariamente a las 9am
- **Optimización**: 100% automático, cero IA

### 7. Agente de Onboarding
- **Función**: Guía para negocios nuevos
- **Capacidades**:
  - Guía paso a paso durante 7 días
  - Verifica pasos completados
  - Envía recordatorios
- **Corre**: Primeras 7 días de cada negocio

### 8. Agente Anti-spam
- **Función**: Protección contra spam
- **Capacidades**:
  - Detectar patrones de spam conocidos
  - Rate limiting por número
  - Bloquear números sospechosos
  - Alertar al dueño
- **Optimización**: 100% reglas, cero IA

### 9. Orquestador
- **Función**: Coordina todos los agentes
- **Capacidades**:
  - Procesar mensajes entrantes
  - Enrutar al agente correcto
  - Programar agentes de background (cron)

---

## 🔐 Seguridad Implementada

1. **Soft delete**: Ningún registro se elimina, solo se desactiva
2. **Auditoría completa**: Cada acción queda en `logs_actividad`
3. **Rate limiting**: Por número de WhatsApp
4. **RLS (Row Level Security)**: Políticas de aislamiento en PostgreSQL
5. **Webhooks verificados**: Firma de Stripe validada
6. **Credenciales**: Solo en variables de entorno, nunca en código

---

## 🚀 Cómo Correr el Proyecto

### Prerrequisitos
- PostgreSQL 16+
- Node.js 18+

### Pasos para iniciar:

```bash
# 1. Ir al directorio backend
cd otto/backend

# 2. Instalar dependencias (ya hecho)
npm install

# 3. Verificar variables de entorno
cat .env

# 4. Iniciar el servidor
npm run dev

# 5. Verificar que está corriendo
# El servidor debe mostrar:
# 🚀 OttO Server Running
#    Port: 3001
```

### Verificar funcionamiento:
```bash
# Health check
curl http://localhost:3001/health

# Debe responder:
# {"status":"ok","database":"connected","timestamp":"..."}
```

---

## 📡 Endpoints Principales

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/health` | Verificar estado del servidor |
| POST | `/webhook/whatsapp` | Receiving messages from WhatsApp |
| GET | `/webhook/whatsapp` | Verify webhook |
| POST | `/api/negocios` | Crear nuevo negocio |
| GET | `/api/negocios/me` | Obtener mi negocio |
| GET | `/api/productos` | Listar productos |
| POST | `/api/productos` | Crear producto |
| GET | `/api/pedidos` | Listar pedidos |
| POST | `/api/pedidos` | Crear pedido |
| GET | `/api/clientes` | Listar clientes |
| GET | `/api/pedidos/stats` | Estadísticas de ventas |

---

## ⚠️ Pendiente para FASE 2

- Catálogo con costos por componente
- Pedido simple y con fecha futura
- Registro de ventas físicas (texto/voz/foto)
- Multi-número y roles de empleados
- Entrenamiento del bot por el dueño
- Panel del cliente por chat
- Visualizador interactivo web
- Y más...

---

*Documentación generada: 2026-03-23*