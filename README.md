# Automatio CRM

Plataforma de gestión interna para **Automatio solutions S.L**. Incluye presupuestos, facturas, clientes, servicios, generación de PDF y envío por email.

## Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **ORM**: Prisma 7 con driver adapter `@prisma/adapter-pg`
- **Base de datos**: PostgreSQL 16
- **Auth**: JWT (jose) + cookies HttpOnly + bcrypt
- **PDF**: jsPDF (server-side)
- **Email**: Nodemailer (SMTP)

## Desarrollo local

### Requisitos previos

- Node.js 20+
- Docker + Docker Compose (para PostgreSQL)

### 1. Clonar e instalar

```bash
git clone <repo-url>
cd automatio-crm
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
# Editar .env con tus valores
```

### 3. Arrancar la base de datos

```bash
docker compose up -d
```

### 4. Ejecutar migraciones y generar Prisma client

```bash
npx prisma migrate dev
npx prisma generate
```

### 5. Crear usuario admin

```bash
npm run create-admin
```

Esto lee `ADMIN_EMAIL` y `ADMIN_PASSWORD` de `.env` y crea/actualiza el usuario admin.

### 6. Seed de datos base (empresa + impuestos)

```bash
npm run db:seed
```

### 7. Arrancar el servidor de desarrollo

```bash
npm run dev
```

Acceder a `http://localhost:3000/login`

## Scripts disponibles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Servir build de producción |
| `npm run create-admin` | Crear/actualizar usuario admin |
| `npm run db:generate` | Generar Prisma client |
| `npm run db:migrate` | Ejecutar migraciones (dev) |
| `npm run db:deploy` | Ejecutar migraciones (producción) |
| `npm run db:seed` | Seed de datos base |
| `npm run db:studio` | Abrir Prisma Studio |

---

## Deploy en Vercel + Supabase

### 1. Crear proyecto en Supabase

1. Ir a [supabase.com](https://supabase.com) y crear un nuevo proyecto
2. Copiar la **Connection string** (URI) desde *Settings → Database → Connection string → URI*
3. Usar el modo **Transaction** para la URL principal

### 2. Ejecutar migraciones

Desde tu máquina local con la `DATABASE_URL` de Supabase:

```bash
DATABASE_URL="postgresql://..." npx prisma migrate deploy
DATABASE_URL="postgresql://..." npx prisma generate
DATABASE_URL="postgresql://..." npm run create-admin
DATABASE_URL="postgresql://..." npm run db:seed
```

### 3. Configurar Vercel

1. Importar el repositorio en [vercel.com](https://vercel.com)
2. Configurar las siguientes **Environment Variables**:

| Variable | Valor |
|----------|-------|
| `DATABASE_URL` | URI de conexión de Supabase |
| `JWT_SECRET` | Secreto aleatorio largo (mínimo 32 caracteres) |
| `ADMIN_EMAIL` | Email del admin (solo bootstrap) |
| `ADMIN_PASSWORD` | Password del admin (solo bootstrap) |
| `SMTP_HOST` | Host del servidor SMTP |
| `SMTP_PORT` | Puerto SMTP (587) |
| `SMTP_USER` | Usuario SMTP |
| `SMTP_PASS` | Contraseña SMTP |
| `SMTP_FROM` | `Automatio CRM <info@automatio.es>` |

3. Deploy automático desde `main`

### 4. Verificar

```bash
curl https://tu-app.vercel.app/api/health
# → {"status":"ok","db":true,"timestamp":"..."}
```

### 5. Acceder

Ir a `https://tu-app.vercel.app/login` e iniciar sesión con las credenciales de admin.

---

## Credenciales Admin (Dev)

- **Email:** `admin@automatio.es`
- **Password:** `admin1234`

## Variables de entorno

```env
# Database
DATABASE_URL="postgresql://user:pass@host:5432/dbname?schema=public"

# Auth
JWT_SECRET="tu-secreto-seguro-cambiar-en-produccion"
ADMIN_EMAIL="admin@automatio.es"
ADMIN_PASSWORD="tu-password-segura"

# SMTP (Email)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=user@example.com
SMTP_PASS=password
SMTP_FROM="Automatio CRM <info@automatio.es>"
```

## Healthcheck

`GET /api/health` — Verifica conectividad con la base de datos.

```json
{ "status": "ok", "db": true, "timestamp": "2026-02-14T15:40:00.000Z" }
```
