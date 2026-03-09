import axios from 'axios';

const BASE = 'http://localhost:8080/api';

export const bateauxAPI = {
  getAll: () => axios.get(`${BASE}/bateaux`),
  getById: (id) => axios.get(`${BASE}/bateaux/${id}`),
  create: (data) => axios.post(`${BASE}/bateaux`, data),
  update: (id, data) => axios.put(`${BASE}/bateaux/${id}`, data),
  delete: (id) => axios.delete(`${BASE}/bateaux/${id}`),
};

export const clientsAPI = {
  getAll: () => axios.get(`${BASE}/clients`),
  getById: (id) => axios.get(`${BASE}/clients/${id}`),
  create: (data) => axios.post(`${BASE}/clients`, data),
  update: (id, data) => axios.put(`${BASE}/clients/${id}`, data),
  delete: (id) => axios.delete(`${BASE}/clients/${id}`),
};

export const reservationsAPI = {
  getAll: () => axios.get(`${BASE}/reservations`),
  getById: (id) => axios.get(`${BASE}/reservations/${id}`),
  getByClient: (clientId) => axios.get(`${BASE}/reservations/client/${clientId}`),
  create: (data) => axios.post(`${BASE}/reservations`, data),
  update: (id, data) => axios.put(`${BASE}/reservations/${id}`, data),
  delete: (id) => axios.delete(`${BASE}/reservations/${id}`),
};