const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');

const repo = require('./db/repository');
const { jwtSecret } = require('./config/env');
const { authenticate, authorize } = require('./middleware/auth');
const { validate } = require('./middleware/validate');
const external = require('./services/external');
const ai = require('./services/ai');

const registerSchema = z.object({
  nombre: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  rol: z.enum(['empleado', 'admin']).optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128)
});

const supplierSchema = z.object({
  nombre: z.string().min(2).max(150),
  contacto: z.string().max(255).optional().nullable()
});

const expenseSchema = z.object({
  category_id: z.coerce.number().int().positive(),
  supplier_id: z.coerce.number().int().positive().optional().nullable(),
  monto: z.coerce.number().positive(),
  moneda: z.string().length(3).transform((value) => value.toUpperCase()),
  tipo_cambio: z.coerce.number().positive(),
  fecha: z.string().date(),
  descripcion: z.string().max(2000).optional().nullable()
});

const budgetSchema = z.object({
  category_id: z.coerce.number().int().positive(),
  mes: z.string().regex(/^\d{4}-\d{2}-01$/),
  monto_limite: z.coerce.number().positive()
});

const weatherSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180)
});

const geocodeSchema = z.object({
  query: z.string().min(2).max(120)
});

const aiSchema = z.object({
  text: z.string().min(30).max(6000)
});

function tokenFor(user) {
  return jwt.sign(
    { id: user.id, email: user.email, rol: user.rol, nombre: user.nombre },
    jwtSecret,
    { expiresIn: '12h' }
  );
}

function createApp(options = {}) {
  const data = options.repo || repo;
  const ext = options.external || external;
  const aiService = options.ai || ai;

  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan('dev'));
  app.use(express.static('public'));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/api/auth/register', validate(registerSchema), async (req, res) => {
    try {
      const body = req.validatedBody;
      const existing = await data.findUserByEmail(body.email);

      if (existing) {
        return res.status(409).json({ error: 'El correo ya está registrado' });
      }

      const password_hash = await bcrypt.hash(body.password, 12);
      const newUser = await data.createUser({
        nombre: body.nombre,
        email: body.email,
        password_hash,
        rol: body.rol || 'empleado'
      });

      const token = tokenFor(newUser);
      return res.status(201).json({ token, user: newUser });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/auth/login', validate(loginSchema), async (req, res) => {
    try {
      const body = req.validatedBody;
      const user = await data.findUserByEmail(body.email);

      if (!user) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      const ok = await bcrypt.compare(body.password, user.password_hash);
      if (!ok) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      const token = tokenFor(user);
      return res.json({
        token,
        user: {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          rol: user.rol
        }
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/categories', authenticate, async (_req, res) => {
    try {
      const categories = await data.listCategories();
      return res.json(categories);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/suppliers', authenticate, async (_req, res) => {
    try {
      const suppliers = await data.listSuppliers();
      return res.json(suppliers);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/suppliers', authenticate, authorize('admin'), validate(supplierSchema), async (req, res) => {
    try {
      const supplier = await data.createSupplier(req.validatedBody);
      return res.status(201).json(supplier);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/expenses', authenticate, async (req, res) => {
    try {
      const expenses = await data.listExpenses({ userId: req.user.id, role: req.user.rol });
      return res.json(expenses);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/expenses', authenticate, validate(expenseSchema), async (req, res) => {
    try {
      const body = req.validatedBody;
      const payload = {
        ...body,
        user_id: req.user.id,
        monto_mxn: Number((body.monto * body.tipo_cambio).toFixed(2))
      };

      const expense = await data.createExpense(payload);
      return res.status(201).json(expense);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/budgets', authenticate, async (_req, res) => {
    try {
      const budgets = await data.listBudgetVsSpent();
      return res.json(budgets);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/budgets', authenticate, authorize('admin'), validate(budgetSchema), async (req, res) => {
    try {
      const budget = await data.upsertBudget(req.validatedBody);
      return res.status(201).json(budget);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/integrations/weather', authenticate, async (req, res) => {
    try {
      const parsed = weatherSchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Parámetros inválidos' });
      }
      const weather = await ext.getWeather(parsed.data);
      return res.json(weather);
    } catch (error) {
      return res.status(502).json({ error: error.message });
    }
  });

  app.get('/api/integrations/geocode', authenticate, async (req, res) => {
    try {
      const parsed = geocodeSchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Parámetros inválidos' });
      }
      const result = await ext.geocode(parsed.data.query);
      return res.json(result);
    } catch (error) {
      return res.status(502).json({ error: error.message });
    }
  });

  app.post('/api/ai/summarize', authenticate, validate(aiSchema), async (req, res) => {
    try {
      const summary = await aiService.summarizeExpenseNote(req.validatedBody.text);
      return res.json({ summary });
    } catch (error) {
      return res.status(502).json({ error: error.message });
    }
  });

  return app;
}

module.exports = { createApp };
