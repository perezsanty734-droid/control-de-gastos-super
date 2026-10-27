
-- =====================================================
-- schema.sql - Control de gastos de supermercado
-- Base de datos: PostgreSQL (Neon)
-- Se puede ejecutar varias veces sin romper nada.
-- =====================================================

-- 1. USUARIOS
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    nombre        VARCHAR(100) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,          -- contraseña cifrada con bcrypt, nunca en texto plano
    rol           VARCHAR(20)  NOT NULL DEFAULT 'empleado'
                  CHECK (rol IN ('empleado', 'admin')),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 2. CATEGORIAS (ej. Servicios, Nomina, Mercancia)
CREATE TABLE IF NOT EXISTS categories (
    id     SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE
);

-- 3. PROVEEDORES
CREATE TABLE IF NOT EXISTS suppliers (
    id       SERIAL PRIMARY KEY,
    nombre   VARCHAR(150) NOT NULL,
    contacto VARCHAR(255)
);

-- 4. GASTOS
CREATE TABLE IF NOT EXISTS expenses (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER       NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    category_id INTEGER       NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    supplier_id INTEGER       REFERENCES suppliers(id) ON DELETE SET NULL,
    monto       NUMERIC(12,2) NOT NULL CHECK (monto > 0),   -- monto en la moneda original
    moneda      CHAR(3)       NOT NULL DEFAULT 'MXN',        -- MXN, USD, etc.
    tipo_cambio NUMERIC(12,6) NOT NULL DEFAULT 1,            -- cuantos MXN vale 1 unidad de la moneda
    monto_mxn   NUMERIC(12,2) NOT NULL CHECK (monto_mxn > 0),-- monto convertido a pesos
    fecha       DATE          NOT NULL DEFAULT CURRENT_DATE,
    descripcion TEXT,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- 5. PRESUPUESTOS (un limite por categoria y por mes)
CREATE TABLE IF NOT EXISTS budgets (
    id           SERIAL PRIMARY KEY,
    category_id  INTEGER       NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    mes          DATE          NOT NULL CHECK (EXTRACT(DAY FROM mes) = 1), -- siempre el dia 1, ej. 2026-11-01
    monto_limite NUMERIC(12,2) NOT NULL CHECK (monto_limite > 0),
    UNIQUE (category_id, mes)
);

-- INDICES (hacen mas rapidas las busquedas y filtros)
CREATE INDEX IF NOT EXISTS idx_expenses_user     ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_supplier ON expenses(supplier_id);
CREATE INDEX IF NOT EXISTS idx_expenses_fecha    ON expenses(fecha);

-- DATOS INICIALES: categorias basicas
INSERT INTO categories (nombre) VALUES
    ('Mercancia'),
    ('Servicios (luz, agua, internet)'),
    ('Nomina'),
    ('Mantenimiento'),
    ('Limpieza'),
    ('Transporte'),
    ('Publicidad'),
    ('Otros')
ON CONFLICT (nombre) DO NOTHING;
