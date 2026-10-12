import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to attach JWT token if stored locally
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle common error codes
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If unauthorized, clear local token
    if (error.response?.status === 401) {
      localStorage.removeItem("auth_token");
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  signup: async (userData) => {
    const res = await api.post("/auth/signup", userData);
    if (res.data.token) localStorage.setItem("auth_token", res.data.token);
    return res.data;
  },
  login: async (credentials) => {
    const res = await api.post("/auth/login", credentials);
    if (res.data.token) localStorage.setItem("auth_token", res.data.token);
    return res.data;
  },
  logout: async () => {
    const res = await api.post("/auth/logout");
    localStorage.removeItem("auth_token");
    return res.data;
  },
  getMe: async () => {
    const res = await api.get("/auth/me");
    return res.data;
  },
};

export const researchApi = {
  create: async (topic) => {
    const res = await api.post("/research", { topic });
    return res.data;
  },
  getAll: async (params = {}) => {
    const res = await api.get("/research", { params });
    return res.data;
  },
  getById: async (id) => {
    const res = await api.get(`/research/${id}`);
    return res.data;
  },
  getStatus: async (id) => {
    const res = await api.get(`/research/${id}/status`);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/research/${id}`);
    return res.data;
  },
  retry: async (id) => {
    const res = await api.post(`/research/${id}/retry`);
    return res.data;
  },
  getMetrics: async () => {
    const res = await api.get("/research/stats/metrics");
    return res.data;
  },
};

export default api;
