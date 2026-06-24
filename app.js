// ─── API CONFIG ──────────────────────────────────────────────────
const API = 'https://airport-logistics-india.onrender.com/api';

// ─── TOKEN HELPERS ────────────────────────────────────────────────
function getToken()       { return localStorage.getItem('ali_token'); }
function setToken(t)      { localStorage.setItem('ali_token', t); }
function removeToken()    { localStorage.removeItem('ali_token'); }
function getCurrentUser() { return JSON.parse(localStorage.getItem('ali_user') || 'null'); }
function setCurrentUser(u){ localStorage.setItem('ali_user', JSON.stringify(u)); }
function clearUser()      { localStorage.removeItem('ali_user'); localStorage.removeItem('ali_token'); }

// ─── API CALL HELPER ─────────────────────────────────────────────
async function apiCall(endpoint, method = 'GET', body = null, auth = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && getToken()) headers['Authorization'] = 'Bearer ' + getToken();
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(API + endpoint, options);  
  return await res.json();
}

// ─── TOAST ───────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.className = 'toast ' + type;
  t.innerHTML = `<span class="toast-icon">${type==='success'?'✅':type==='error'?'❌':'ℹ️'}</span><span>${msg}</span>`;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3200);
}

// ─── AUTH ─────────────────────────────────────────────────────────
async function registerUser(name, email, phone, password, accountType) {
  const data = await apiCall('/auth/register', 'POST', { name, email, phone, password, accountType });
  if (data.success) { setToken(data.token); setCurrentUser(data.user); }
  return data;
}
async function loginUser(email, password) {
  const data = await apiCall('/auth/login', 'POST', { email, password });
  if (data.success) { setToken(data.token); setCurrentUser(data.user); }
  return data;
}
function logoutUser() { clearUser(); renderNavUser(); showToast('Logged out successfully'); }

// ─── SHIPMENTS ────────────────────────────────────────────────────
async function trackShipment(pod) { return await apiCall('/shipments/track/' + pod); }
async function bookShipment(payload) { return await apiCall('/shipments/book', 'POST', payload, true); }
async function getMyShipments() { return await apiCall('/shipments/my', 'GET', null, true); }

// ─── CONTACT ──────────────────────────────────────────────────────
async function submitContactForm(payload) { return await apiCall('/contact', 'POST', payload); }

// ─── NAV ──────────────────────────────────────────────────────────
function renderNavUser() {
  const area = document.getElementById('user-nav-area');
  if (!area) return;
  const user = getCurrentUser();
  if (user) {
    area.innerHTML = `<div class="user-chip" onclick="logoutUser()"><div class="user-avatar">${user.name.charAt(0).toUpperCase()}</div><span>${user.name.split(' ')[0]}</span><span style="color:var(--text-muted);font-size:0.75rem">↩</span></div>`;
  } else {
    area.innerHTML = `<a href="login.html" class="btn btn-outline" style="padding:7px 16px;font-size:0.85rem">Login</a><a href="login.html#register" class="btn btn-primary" style="padding:7px 16px;font-size:0.85rem">Register</a>`;
  }
}
function setActiveNav() {
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => { if (a.getAttribute('href')===page) a.classList.add('active'); });
}
function initHamburger() {
  const btn = document.querySelector('.hamburger');
  if (!btn) return;
  btn.addEventListener('click', () => {
    document.querySelector('.nav-links')?.classList.toggle('open');
    document.querySelector('.nav-actions')?.classList.toggle('open');
  });
}
document.addEventListener('DOMContentLoaded', () => { setActiveNav(); renderNavUser(); initHamburger(); });
