import axios from 'axios';
import { clearSession, getStoredToken } from './auth';
import { environment } from './environment';

const BASE = environment.apiUrl;

const getErrorMessage = (err) => {
  const status = err.response?.status;
  const serverMsg = err.response?.data?.message || err.response?.data?.error;

  if (!err.response) return 'Impossible de contacter le serveur. Verifiez votre connexion.';

  switch (status) {
    case 400: return serverMsg || 'Requete invalide.';
    case 401: return 'Session expiree. Veuillez vous reconnecter.';
    case 403: return 'Acces refuse.';
    case 404: return 'Ressource introuvable.';
    case 409: return serverMsg || 'Conflit de donnees.';
    case 422: return serverMsg || 'Donnees invalides.';
    case 429: return 'Trop de requetes. Reessayez dans quelques instants.';
    case 500: return 'Erreur interne du serveur.';
    case 503: return 'Service temporairement indisponible.';
    default:  return serverMsg || `Erreur inattendue (${status}).`;
  }
};

const api = axios.create({ baseURL: BASE });

api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (err) => Promise.reject(err)
);

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isAuthEndpoint = err.config?.url?.includes('/auth/');

    if (err.response?.status === 401 && !isAuthEndpoint) {
      clearSession();
      window.location.href = '/connexion';
    }

    err.userMessage = getErrorMessage(err);
    return Promise.reject(err);
  }
);

const authAxios = axios.create({ baseURL: BASE });

authAxios.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const serverMsg = err.response?.data?.message || err.response?.data?.error;

    if (!err.response) {
      err.userMessage = 'Impossible de contacter le serveur. Verifiez votre connexion.';
    } else if (status === 401 || status === 403) {
      err.userMessage = "Nom d'utilisateur ou mot de passe incorrect";
    } else if (status === 400) {
      err.userMessage = serverMsg || 'Donnees invalides.';
    } else if (status === 404) {
      err.userMessage = 'Compte introuvable.';
    } else if (status === 429) {
      err.userMessage = 'Trop de tentatives. Reessayez plus tard.';
    } else if (status === 422) {
      err.userMessage = serverMsg || 'Format de donnees invalide.';
    } else {
      err.userMessage = serverMsg || 'Erreur serveur. Reessayez.';
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

export const catalogueAPI = {
  getAll:  ()   => api.get('/catalogue'),
  getById: (id) => api.get(`/catalogue/${id}`),
};

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


export const usersAPI = {
  getAll: () => api.get('/admin/users'),
  create: (data) => api.post('/admin/users', data),
  updatePassword: (id, password) => api.put(`/admin/users/${id}/password`, { password }),
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
