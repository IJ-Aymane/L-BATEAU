import axios from 'axios';

const BASE = 'https://l-bateau-back.onrender.com/api';

const api = axios.create({ baseURL: BASE });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('jwt_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('jwt_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login: (username, password) =>
    axios.post(`${BASE}/auth/login`, { username, password }),
};

export const bateauxAPI = {
  getAll:  ()        => api.get(`/bateaux`),
  getById: (id)      => api.get(`/bateaux/${id}`),
  create:  (data)    => api.post(`/bateaux`, data),
  update:  (id,data) => api.put(`/bateaux/${id}`, data),
  delete:  (id)      => api.delete(`/bateaux/${id}`),
};

export const clientsAPI = {
  getAll:  ()        => api.get(`/clients`),
  getById: (id)      => api.get(`/clients/${id}`),
  create:  (data)    => api.post(`/clients`, data),
  update:  (id,data) => api.put(`/clients/${id}`, data),
  delete:  (id)      => api.delete(`/clients/${id}`),
};

export const reservationsAPI = {
  getAll:     ()           => api.get(`/reservations`),
  getById:    (id)         => api.get(`/reservations/${id}`),
  getByClient:(clientId)   => api.get(`/reservations/client/${clientId}`),
  create:     (data)       => api.post(`/reservations`, data),
  update:     (id,data)    => api.put(`/reservations/${id}`, data),
  delete:     (id)         => api.delete(`/reservations/${id}`),
};