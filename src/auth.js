const ROLE_HOME = {
  CLIENT: '/compte/reservations',
  MANAGER: '/manager/planning',
  TECHNICIAN: '/tech/flotte',
  ADMIN: '/admin/dashboard',
};

const ROLE_ALIASES = {
  USER: 'CLIENT',
  CUSTOMER: 'CLIENT',
  STAFF: 'MANAGER',
  TECH: 'TECHNICIAN',
  TECHNICIEN: 'TECHNICIAN',
  CLIENT: 'CLIENT',
  MANAGER: 'MANAGER',
  TECHNICIAN: 'TECHNICIAN',
  ADMIN: 'ADMIN',
};

const SESSION_KEYS = ['jwt_token', 'user_role', 'user_profile'];
const stores = () => [localStorage, sessionStorage];

const getStoredValue = (key) => stores().map((store) => store.getItem(key)).find(Boolean) || '';

export const normalizeRole = (value) => {
  if (!value) return '';
  const role = String(value).trim().toUpperCase().replace(/^ROLE_/, '');
  return ROLE_ALIASES[role] || role;
};

export const decodeJwt = (token) => {
  if (!token || !token.includes('.')) return {};

  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=');
    return JSON.parse(window.atob(padded));
  } catch {
    return {};
  }
};

export const getStoredToken = () => getStoredValue('jwt_token');

export const isTokenExpired = (token = getStoredToken()) => {
  const payload = decodeJwt(token);
  if (!payload.exp) return true;
  return Date.now() >= payload.exp * 1000;
};

export const hasValidToken = () => {
  const token = getStoredToken();
  return Boolean(token && !isTokenExpired(token));
};

export const extractRole = (source = {}) => {
  const tokenPayload = source.token ? decodeJwt(source.token) : {};
  const merged = { ...tokenPayload, ...source };
  const rawRoles = merged.roles || merged.authorities || merged.role || merged.profile || merged.type;
  const roles = Array.isArray(rawRoles) ? rawRoles : [rawRoles];
  const found = roles.map((role) => {
    if (typeof role === 'object' && role) return normalizeRole(role.authority || role.name || role.role);
    return normalizeRole(role);
  }).find(Boolean);

  return found || '';
};

export const saveSession = ({ token, role, user, remember = true } = {}) => {
  clearSession();
  const store = remember ? localStorage : sessionStorage;
  if (token) store.setItem('jwt_token', token);
  if (role) store.setItem('user_role', normalizeRole(role));
  if (user) store.setItem('user_profile', JSON.stringify(user));
};

export const clearSession = () => {
  stores().forEach((store) => SESSION_KEYS.forEach((key) => store.removeItem(key)));
};


export const getStoredUser = () => {
  const raw = getStoredValue('user_profile');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const getStoredRole = () => {
  const stored = normalizeRole(getStoredValue('user_role'));
  if (stored) return stored;
  return extractRole({ token: getStoredToken() });
};

export const getRoleHome = (role = getStoredRole()) => ROLE_HOME[normalizeRole(role)] || '/connexion';

export const roleCanAccess = (allowedRoles = []) => {
  if (!hasValidToken()) return false;
  if (!allowedRoles.length) return true;
  const role = getStoredRole();
  return allowedRoles.map(normalizeRole).includes(role);
};
