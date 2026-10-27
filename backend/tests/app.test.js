const request = require('supertest');
const bcrypt = require('bcryptjs');
const { createApp } = require('../src/app');

function makeRepo() {
  const users = [];
  const expenses = [];
  const categories = [
    { id: 1, nombre: 'Mercancia' },
    { id: 2, nombre: 'Servicios' }
  ];

  const budgets = [];

  return {
    async createUser(input) {
      const user = {
        id: users.length + 1,
        nombre: input.nombre,
        email: input.email,
        password_hash: input.password_hash,
        rol: input.rol,
        created_at: new Date().toISOString()
      };
      users.push(user);
      return { ...user };
    },
    async findUserByEmail(email) {
      return users.find((u) => u.email === email.toLowerCase()) || null;
    },
    async listCategories() {
      return categories;
    },
    async listSuppliers() {
      return [];
    },
    async createSupplier(data) {
      return { id: 1, ...data };
    },
    async createExpense(data) {
      const expense = { id: expenses.length + 1, ...data, created_at: new Date().toISOString() };
      expenses.push(expense);
      return expense;
    },
    async listExpenses({ userId, role }) {
      return role === 'admin' ? expenses : expenses.filter((item) => item.user_id === userId);
    },
    async upsertBudget(data) {
      const item = { id: budgets.length + 1, ...data };
      budgets.push(item);
      return item;
    },
    async listBudgetVsSpent() {
      return budgets;
    }
  };
}

describe('API flows', () => {
  let app;
  let repo;

  beforeEach(async () => {
    repo = makeRepo();

    const hashed = await bcrypt.hash('Password123', 10);
    await repo.createUser({
      nombre: 'Admin',
      email: 'admin@test.com',
      password_hash: hashed,
      rol: 'admin'
    });

    app = createApp({
      repo,
      external: {
        getWeather: async () => ({ temperature_2m: 24 }),
        geocode: async () => [{ display_name: 'CDMX' }]
      },
      ai: {
        summarizeExpenseNote: async () => '• Resumen de prueba\n• Acción sugerida'
      }
    });
  });

  test('registro exitoso', async () => {
    const response = await request(app).post('/api/auth/register').send({
      nombre: 'User',
      email: 'user@test.com',
      password: 'Password123',
      rol: 'empleado'
    });

    expect(response.statusCode).toBe(201);
    expect(response.body.user.email).toBe('user@test.com');
    expect(response.body.token).toBeTypeOf('string');
  });

  test('login exitoso', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'admin@test.com',
      password: 'Password123'
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.user.rol).toBe('admin');
    expect(response.body.token).toBeTruthy();
  });

  test('crear gasto y listar gastos', async () => {
    const login = await request(app).post('/api/auth/login').send({
      email: 'admin@test.com',
      password: 'Password123'
    });

    const token = login.body.token;

    const createResponse = await request(app)
      .post('/api/expenses')
      .set('Authorization', 'Bearer ' + token)
      .send({
        category_id: 1,
        supplier_id: null,
        monto: 120,
        moneda: 'MXN',
        tipo_cambio: 1,
        fecha: '2026-10-01',
        descripcion: 'Compra semanal'
      });

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.body.monto_mxn).toBe(120);

    const listResponse = await request(app).get('/api/expenses').set('Authorization', 'Bearer ' + token);

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.body.length).toBe(1);
  });

  test('integraciones externas + IA', async () => {
    const login = await request(app).post('/api/auth/login').send({
      email: 'admin@test.com',
      password: 'Password123'
    });

    const token = login.body.token;

    const weather = await request(app)
      .get('/api/integrations/weather?lat=19.43&lon=-99.13')
      .set('Authorization', 'Bearer ' + token);

    const geocode = await request(app)
      .get('/api/integrations/geocode?query=CDMX')
      .set('Authorization', 'Bearer ' + token);

    const ai = await request(app)
      .post('/api/ai/summarize')
      .set('Authorization', 'Bearer ' + token)
      .send({
        text: 'Gasto en mercancia, limpieza y transporte de octubre con variaciones por tipo de cambio para revisión administrativa.'
      });

    expect(weather.statusCode).toBe(200);
    expect(geocode.statusCode).toBe(200);
    expect(ai.statusCode).toBe(200);
    expect(ai.body.summary).toContain('Resumen');
  });
});
