# Control de Gastos Super

Aplicación full stack para control de gastos de supermercado con backend propio REST, base de datos relacional PostgreSQL (Neon), interfaz web moderna, PWA, autenticación por roles, integraciones externas y función de IA.

## Arquitectura

- **Backend:** Node.js + Express (`/backend/src`)
- **Base de datos:** PostgreSQL (`/backend/db/schema.sql`)
- **Frontend:** HTML + CSS + JavaScript vanilla (`/backend/public`)
- **PWA:** `manifest.webmanifest` + `sw.js`
- **Pruebas:** Vitest + Supertest (`/backend/tests`)
- **CI:** GitHub Actions (`/.github/workflows/ci.yml`)

## Funcionalidades implementadas

1. Registro e inicio de sesión con contraseña cifrada (bcrypt) y JWT.
2. Roles de usuario: `empleado` y `admin`.
3. API REST para categorías, proveedores, gastos y presupuestos.
4. Integración de dos APIs externas:
   - Open-Meteo (clima)
   - Nominatim/OpenStreetMap (geocodificación/mapas)
5. Función con IA usando API de modelo de lenguaje:
   - Resumen inteligente de notas de gastos (`/api/ai/summarize`)
6. Interfaz minimalista y responsive para móvil.
7. Soporte PWA instalable y caché básica offline.
8. Seguridad básica:
   - Sin claves hardcodeadas
   - Variables de entorno
   - Validación de entradas con Zod
   - Contraseñas cifradas

## Instalación

```bash
cd backend
npm install
cp .env.example .env
```

Configura `.env` con tus credenciales reales.

## Ejecutar local

```bash
cd backend
npm run start
```

Abre: `http://localhost:3000`

## Endpoints principales

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/categories`
- `GET /api/suppliers`
- `POST /api/suppliers` (admin)
- `GET /api/expenses`
- `POST /api/expenses`
- `GET /api/budgets`
- `POST /api/budgets` (admin)
- `GET /api/integrations/weather`
- `GET /api/integrations/geocode`
- `POST /api/ai/summarize`

## Pruebas automatizadas

```bash
cd backend
npm test
```

Incluye pruebas de:
- registro
- login
- creación/listado de gastos
- integraciones externas + función IA

## CI (GitHub Actions)

En cada pull request se ejecuta el workflow `CI` para instalar dependencias y correr pruebas.

## Despliegue en línea

Deploy sugerido en Render, Railway o Fly.io usando `backend/` como servicio web Node.js.

Variables mínimas en producción:
- `DATABASE_URL`
- `JWT_SECRET`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `NODE_ENV=production`

> Enlace público: pendiente de configurar en la plataforma de despliegue elegida.
