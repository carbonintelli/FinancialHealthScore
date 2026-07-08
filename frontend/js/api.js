const API_BASE = window.location.origin;

function getToken() {
  return localStorage.getItem('fhs_token');
}

function getUser() {
  const raw = localStorage.getItem('fhs_user');
  return raw ? JSON.parse(raw) : null;
}

function setAuth(token, user) {
  localStorage.setItem('fhs_token', token);
  localStorage.setItem('fhs_user', JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem('fhs_token');
  localStorage.removeItem('fhs_user');
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) {
    clearAuth();
    window.location.href = '/app/index.html';
    throw new Error('Session expired');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || data.message || `Error ${res.status}`);
  return data;
}

function requireAuth() {
  if (!getToken()) {
    window.location.href = '/app/index.html';
    return false;
  }
  return true;
}

function isBankUser(user) {
  return user && user.organization_type === 'bank';
}

function isMsmeUser(user) {
  return user && user.organization_type === 'msme';
}

function redirectByRole(user) {
  if (isBankUser(user)) window.location.href = '/app/bank/dashboard.html';
  else if (isMsmeUser(user)) window.location.href = '/app/msme/dashboard.html';
  else window.location.href = '/app/index.html';
}

function logout() {
  clearAuth();
  window.location.href = '/app/index.html';
}

function formatInr(n) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function riskBadge(level) {
  if (!level) return '—';
  return `<span class="badge badge-${level}">${level}</span>`;
}
