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
  ROLE_CLIENT: 'CLIENT',
  ROLE_MANAGER: 'MANAGER',
  ROLE_TECHNICIAN: 'TECHNICIAN',
  ROLE_ADMIN: 'ADMIN',
};

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

export const extractRole = (source = {}) => {
  const tokenPayload = source.token ? decodeJwt(source.token) : {};
  const merged = { ...tokenPayload, ...source };
  const rawRoles = merged.roles || merged.authorities || merged.role || merged.profile || merged.type;
  const roles = Array.isArray(rawRoles) ? rawRoles : [rawRoles];
  const found = roles.map((role) => {
    if (typeof role === 'object' && role) return normalizeRole(role.authority || role.name || role.role);
    return normalizeRole(role);
  }).find(Boolean);

  return found || 'ADMIN';
};

export const saveSession = ({ token, role, user } = {}) => {
  if (token) localStorage.setItem('jwt_token', token);
  if (role) localStorage.setItem('user_role', normalizeRole(role));
  if (user) localStorage.setItem('user_profile', JSON.stringify(user));
};

export const clearSession = () => {
  localStorage.removeItem('jwt_token');
  localStorage.removeItem('user_role');
  localStorage.removeItem('user_profile');
};

export const getStoredRole = () => normalizeRole(localStorage.getItem('user_role')) || 'ADMIN';

export const getRoleHome = (role = getStoredRole()) => ROLE_HOME[normalizeRole(role)] || '/admin/dashboard';

export const roleCanAccess = (allowedRoles = []) => {
  if (!allowedRoles.length) return true;
  const role = getStoredRole();
  return allowedRoles.map(normalizeRole).includes(role);
};
