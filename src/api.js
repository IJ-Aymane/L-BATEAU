import axios from 'axios';

const BASE = 'https://l-bateau-back.onrender.com/api';

// ── Helpers ───────────────────────────────────────────────────
const getErrorMessage = (err) => {
  const status = err.response?.status;
  const serverMsg = err.response?.data?.message || err.response?.data?.error;

  if (!err.response) return 'Impossible de contacter le serveur. Vérifiez votre connexion.';

  switch (status) {
    case 400: return serverMsg || 'Requête invalide.';
    case 401: return 'Session expirée. Veuillez vous reconnecter.';
    case 403: return 'Accès refusé.';
    case 404: return 'Ressource introuvable.';
    case 409: return serverMsg || 'Conflit de données.';
    case 422: return serverMsg || 'Données invalides.';
    case 429: return 'Trop de requêtes. Réessayez dans quelques instants.';
    case 500: return 'Erreur interne du serveur.';
    case 503: return 'Service temporairement indisponible.';
    default:  return serverMsg || `Erreur inattendue (${status}).`;
  }
};

// ── Authenticated instance ────────────────────────────────────
const api = axios.create({ baseURL: BASE });

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (err) => Promise.reject(err)
);

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Only auto-redirect on 401 for protected routes (not auth endpoints)
    const isAuthEndpoint = err.config?.url?.includes('/auth/');

    if (err.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('jwt_token');
      window.location.href = '/login';
    }

    // Attach a human-readable message to the error for easy use in components
    err.userMessage = getErrorMessage(err);
    return Promise.reject(err);
  }
);

// ── Auth (public endpoints — no token needed) ─────────────────
const authAxios = axios.create({ baseURL: BASE });

// Same error enrichment for auth calls
authAxios.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const serverMsg = err.response?.data?.message || err.response?.data?.error;

    if (!err.response) {
      err.userMessage = 'Impossible de contacter le serveur. Vérifiez votre connexion.';
    } else if (status === 401 || status === 403) {
      err.userMessage = 'Identifiants incorrects.';
    } else if (status === 400) {
      err.userMessage = serverMsg || 'Données invalides.';
    } else if (status === 404) {
      err.userMessage = 'Compte introuvable.';
    } else if (status === 429) {
      err.userMessage = 'Trop de tentatives. Réessayez plus tard.';
    } else if (status === 422) {
      err.userMessage = serverMsg || 'Format de données invalide.';
    } else {
      err.userMessage = serverMsg || 'Erreur serveur. Réessayez.';
    }

    return Promise.reject(err);
  }
);

export const authAPI = {
  login: (username, password) =>
    authAxios.post('/auth/login', { username, password }),

  forgotPassword: (emailOrPhone) =>
    authAxios.post('/auth/forgot-password', { emailOrPhone }),

  resetPassword: (code, newPassword) =>
    authAxios.post('/auth/reset-password', { code, newPassword }),
};

// ── Resources ─────────────────────────────────────────────────
export const bateauxAPI = {
  getAll:  ()           => api.get('/bateaux'),
  getById: (id)         => api.get(`/bateaux/${id}`),
  create:  (data)       => api.post('/bateaux', data),
  update:  (id, data)   => api.put(`/bateaux/${id}`, data),
  delete:  (id)         => api.delete(`/bateaux/${id}`),
};

export const clientsAPI = {
  getAll:  ()           => api.get('/clients'),
  getById: (id)         => api.get(`/clients/${id}`),
  create:  (data)       => api.post('/clients', data),
  update:  (id, data)   => api.put(`/clients/${id}`, data),
  delete:  (id)         => api.delete(`/clients/${id}`),
};

export const reservationsAPI = {
  getAll:      ()             => api.get('/reservations'),
  getById:     (id)           => api.get(`/reservations/${id}`),
  getByClient: (clientId)     => api.get(`/reservations/client/${clientId}`),
  create:      (data)         => api.post('/reservations', data),
  update:      (id, data)     => api.put(`/reservations/${id}`, data),
  delete:      (id)           => api.delete(`/reservations/${id}`),
};

export { getErrorMessage };
export default api;