import axios from 'axios';
import { Client, ClientFormData, CampaignFormData, User, Campaign, HistoryResponse, HistoryFilters, Settings, SettingsAdmin, AdminDashboard, AdminUser, UserRole, UserStatus } from '../types';

const API_URL = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const authApi = {
  register: async (email: string, password: string, name: string, turnstileToken?: string) => {
    const { data } = await api.post<{ token: string; user: User }>('/auth/register', {
      email,
      password,
      name,
      turnstileToken,
    });
    return data;
  },

  login: async (email: string, password: string, turnstileToken?: string) => {
    const { data } = await api.post<{ token: string; user: User }>('/auth/login', {
      email,
      password,
      turnstileToken,
    });
    return data;
  },

  getMe: async () => {
    const { data } = await api.get<User>('/auth/me');
    return data;
  },
};

// Clients
export const clientsApi = {
  getAll: async () => {
    const { data } = await api.get<Client[]>('/clients');
    return data;
  },

  getOne: async (id: number) => {
    const { data } = await api.get<Client>(`/clients/${id}`);
    return data;
  },

  create: async (formData: ClientFormData) => {
    const { data } = await api.post<Client>('/clients', formData);
    return data;
  },

  update: async (id: number, formData: Partial<ClientFormData>) => {
    const { data } = await api.put<Client>(`/clients/${id}`, formData);
    return data;
  },

  delete: async (id: number, deleteAllHistory: boolean = false) => {
    await api.delete(`/clients/${id}`, { data: { deleteAllHistory } });
  },
};

// Campaigns
export const campaignsApi = {
  create: async (formData: CampaignFormData) => {
    const { data } = await api.post('/campaigns', formData);
    return data;
  },

  update: async (id: number, formData: Partial<CampaignFormData>) => {
    const { data } = await api.put(`/campaigns/${id}`, formData);
    return data;
  },

  updateSpent: async (id: number, spent: number) => {
    const { data } = await api.patch(`/campaigns/${id}/spent`, { spent });
    return data;
  },

  delete: async (id: number) => {
    await api.delete(`/campaigns/${id}`);
  },

  archive: async (id: number) => {
    const { data } = await api.post<{ campaign: Campaign; carryOverChange: number; message: string }>(`/campaigns/${id}/archive`);
    return data;
  },
};

// Client History & Budget
export const clientHistoryApi = {
  getHistory: async (clientId: number) => {
    const { data } = await api.get<Campaign[]>(`/clients/${clientId}/history`);
    return data;
  },

  resetBudget: async (clientId: number, newBudget: number) => {
    const { data } = await api.post<Client>(`/clients/${clientId}/reset-budget`, { newBudget });
    return data;
  },
};

// Combined History (all clients)
export const historyApi = {
  getAll: async (filters?: HistoryFilters) => {
    const params = new URLSearchParams();
    if (filters?.clientId) params.append('clientId', filters.clientId);
    if (filters?.platform) params.append('platform', filters.platform);
    if (filters?.search) params.append('search', filters.search);

    const { data } = await api.get<HistoryResponse>(`/history?${params.toString()}`);
    return data;
  },

  delete: async (id: number) => {
    const { data } = await api.delete<{ message: string }>(`/history/${id}`);
    return data;
  },
};

// Upload API
export const uploadApi = {
  uploadLogo: async (file: File) => {
    const formData = new FormData();
    formData.append('logo', file);
    const { data } = await api.post<{ url: string }>('/upload/logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },

  deleteLogo: async (url: string) => {
    const { data } = await api.delete<{ message: string }>('/upload/logo', { data: { url } });
    return data;
  },
};

// Settings API
export const settingsApi = {
  get: async () => {
    const { data } = await api.get<Settings>('/settings');
    return data;
  },

  getAdmin: async () => {
    const { data } = await api.get<SettingsAdmin>('/settings/admin');
    return data;
  },

  update: async (settings: Partial<SettingsAdmin>) => {
    const { data } = await api.put<SettingsAdmin>('/settings', settings);
    return data;
  },
};

// Admin API
export const adminApi = {
  getDashboard: async () => {
    const { data } = await api.get<AdminDashboard>('/admin/dashboard');
    return data;
  },

  getUsers: async () => {
    const { data } = await api.get<AdminUser[]>('/admin/users');
    return data;
  },

  updateUserRole: async (userId: number, role: UserRole) => {
    const { data } = await api.put<AdminUser>(`/admin/users/${userId}/role`, { role });
    return data;
  },

  updateUserStatus: async (userId: number, status: UserStatus) => {
    const { data } = await api.put<AdminUser>(`/admin/users/${userId}/status`, { status });
    return data;
  },

  deleteUser: async (userId: number) => {
    const { data } = await api.delete<{ message: string }>(`/admin/users/${userId}`);
    return data;
  },
};

export default api;
