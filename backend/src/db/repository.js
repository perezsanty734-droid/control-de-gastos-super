const { getPool } = require('./pool');

function assertPool() {
  const pool = getPool();
  if (!pool) {
    throw new Error('DATABASE_URL no configurada.');
  }
  return pool;
}

async function createUser({ nombre, email, password_hash, rol = 'empleado' }) {
  const pool = assertPool();
  const { rows } = await pool.query(
    `INSERT INTO users (nombre, email, password_hash, rol)
     VALUES ($1, $2, $3, $4)
     RETURNING id, nombre, email, rol, created_at`,
    [nombre, email.toLowerCase(), password_hash, rol]
  );
  return rows[0];
}

async function findUserByEmail(email) {
  const pool = assertPool();
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email.toLowerCase()]);
  return rows[0] || null;
}

async function listCategories() {
  const pool = assertPool();
  const { rows } = await pool.query('SELECT id, nombre FROM categories ORDER BY nombre ASC');
  return rows;
}

async function listSuppliers() {
  const pool = assertPool();
  const { rows } = await pool.query('SELECT id, nombre, contacto FROM suppliers ORDER BY nombre ASC');
  return rows;
}

async function createSupplier({ nombre, contacto }) {
  const pool = assertPool();
  const { rows } = await pool.query(
    'INSERT INTO suppliers (nombre, contacto) VALUES ($1, $2) RETURNING id, nombre, contacto',
    [nombre, contacto || null]
  );
  return rows[0];
}

async function createExpense(input) {
  const pool = assertPool();
  const { rows } = await pool.query(
    `INSERT INTO expenses (
      user_id, category_id, supplier_id, monto, moneda, tipo_cambio, monto_mxn, fecha, descripcion
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING id, user_id, category_id, supplier_id, monto, moneda, tipo_cambio, monto_mxn, fecha, descripcion, created_at`,
    [
      input.user_id,
      input.category_id,
      input.supplier_id || null,
      input.monto,
      input.moneda,
      input.tipo_cambio,
      input.monto_mxn,
      input.fecha,
      input.descripcion || null
    ]
  );
  return rows[0];
}

async function listExpenses({ userId, role }) {
  const pool = assertPool();
  const values = [];
  let where = '';

  if (role !== 'admin') {
    values.push(userId);
    where = `WHERE e.user_id = $${values.length}`;
  }

  const { rows } = await pool.query(
    `SELECT e.id, e.user_id, e.category_id, c.nombre AS categoria, e.supplier_id,
            s.nombre AS proveedor, e.monto, e.moneda, e.tipo_cambio, e.monto_mxn,
            e.fecha, e.descripcion, e.created_at
     FROM expenses e
     JOIN categories c ON c.id = e.category_id
     LEFT JOIN suppliers s ON s.id = e.supplier_id
     ${where}
     ORDER BY e.fecha DESC, e.created_at DESC`,
    values
  );
  return rows;
}

async function upsertBudget({ category_id, mes, monto_limite }) {
  const pool = assertPool();
  const { rows } = await pool.query(
    `INSERT INTO budgets (category_id, mes, monto_limite)
     VALUES ($1, $2, $3)
     ON CONFLICT (category_id, mes)
     DO UPDATE SET monto_limite = EXCLUDED.monto_limite
     RETURNING id, category_id, mes, monto_limite`,
    [category_id, mes, monto_limite]
  );
  return rows[0];
}

async function listBudgetVsSpent() {
  const pool = assertPool();
  const { rows } = await pool.query(
    `SELECT
      b.id,
      b.category_id,
      c.nombre AS categoria,
      b.mes,
      b.monto_limite,
      COALESCE(SUM(e.monto_mxn), 0)::NUMERIC(12,2) AS gastado_mxn,
      (b.monto_limite - COALESCE(SUM(e.monto_mxn), 0))::NUMERIC(12,2) AS restante_mxn
    FROM budgets b
    JOIN categories c ON c.id = b.category_id
    LEFT JOIN expenses e
      ON e.category_id = b.category_id
      AND DATE_TRUNC('month', e.fecha)::DATE = b.mes
    GROUP BY b.id, b.category_id, c.nombre, b.mes, b.monto_limite
    ORDER BY b.mes DESC, c.nombre ASC`
  );

  return rows;
}

module.exports = {
  createUser,
  findUserByEmail,
  listCategories,
  listSuppliers,
  createSupplier,
  createExpense,
  listExpenses,
  upsertBudget,
  listBudgetVsSpent
};
