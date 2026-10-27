const state = {
  token: localStorage.getItem('token') || '',
  user: JSON.parse(localStorage.getItem('user') || 'null')
};

const statusEl = document.getElementById('status');
const appSection = document.getElementById('appSection');

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? '#b91c1c' : '#475569';
}

async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (state.token) {
    headers.Authorization = 'Bearer ' + state.token;
  }

  const response = await fetch(path, { ...options, headers });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Error en la solicitud');
  }

  return payload;
}

function updateSession(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  appSection.classList.remove('hidden');
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  state.token = '';
  state.user = null;
  appSection.classList.add('hidden');
}

document.getElementById('registerForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);

  try {
    const body = Object.fromEntries(form.entries());
    const result = await api('/api/auth/register', { method: 'POST', body: JSON.stringify(body) });
    updateSession(result.token, result.user);
    setStatus('Registro exitoso');
    await loadCategories();
    await loadExpenses();
  } catch (error) {
    setStatus(error.message, true);
  }
});

document.getElementById('loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);

  try {
    const body = Object.fromEntries(form.entries());
    const result = await api('/api/auth/login', { method: 'POST', body: JSON.stringify(body) });
    updateSession(result.token, result.user);
    setStatus('Login exitoso');
    await loadCategories();
    await loadExpenses();
  } catch (error) {
    setStatus(error.message, true);
  }
});

document.getElementById('expenseForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);

  try {
    const raw = Object.fromEntries(form.entries());
    const body = {
      ...raw,
      supplier_id: raw.supplier_id ? Number(raw.supplier_id) : null
    };

    await api('/api/expenses', { method: 'POST', body: JSON.stringify(body) });
    setStatus('Gasto guardado');
    event.target.reset();
    await loadExpenses();
  } catch (error) {
    setStatus(error.message, true);
  }
});

document.getElementById('weatherForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  const params = new URLSearchParams(Object.fromEntries(form.entries()));

  try {
    const weather = await api(`/api/integrations/weather?${params.toString()}`);
    document.getElementById('weatherResult').textContent = JSON.stringify(weather, null, 2);
  } catch (error) {
    setStatus(error.message, true);
  }
});

document.getElementById('geoForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  const params = new URLSearchParams(Object.fromEntries(form.entries()));

  try {
    const places = await api(`/api/integrations/geocode?${params.toString()}`);
    document.getElementById('geoResult').textContent = JSON.stringify(places, null, 2);
  } catch (error) {
    setStatus(error.message, true);
  }
});

document.getElementById('aiForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);

  try {
    const body = Object.fromEntries(form.entries());
    const result = await api('/api/ai/summarize', { method: 'POST', body: JSON.stringify(body) });
    document.getElementById('aiResult').textContent = result.summary;
  } catch (error) {
    setStatus(error.message, true);
  }
});

async function loadCategories() {
  const categories = await api('/api/categories');
  const select = document.getElementById('categorySelect');
  select.innerHTML = categories.map((item) => `<option value="${item.id}">${item.nombre}</option>`).join('');
}

async function loadExpenses() {
  const expenses = await api('/api/expenses');
  const list = document.getElementById('expensesList');

  list.innerHTML = expenses
    .slice(0, 12)
    .map(
      (expense) =>
        `<li><strong>${expense.categoria}</strong> - ${expense.monto_mxn} MXN (${expense.moneda})<br/><small>${expense.fecha} · ${expense.descripcion || 'Sin descripción'}</small></li>`
    )
    .join('');
}

if (state.token) {
  appSection.classList.remove('hidden');
  loadCategories().then(loadExpenses).catch(() => {
    logout();
    setStatus('Tu sesión expiró, vuelve a iniciar sesión', true);
  });
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      setStatus('No se pudo activar modo offline', true);
    });
  });
}
