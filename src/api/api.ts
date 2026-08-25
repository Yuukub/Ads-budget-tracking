import axios from 'axios';
import { Client, ClientFormData, CampaignFormData, User, Campaign, HistoryResponse, HistoryFilters, Settings, SettingsAdmin, AdminDashboard, AdminUser, UserRole, UserStatus, BudgetLog, BudgetLogFormData, BudgetMonthRange, ShareLink, ShareLinkFormData, ShareAccessLog, SharedDataResponse, PauseFormData, RolloverFormData, RebaselineFormData, AppNotification, AppNote, NoteFilters, NoteFormData, NoteShare, NoteShareUser, NotesResponse } from '../types';

const API_URL = '/api';

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
  getAll: async (userId?: number) => {
    const params = userId ? `?userId=${userId}` : '';
    const { data } = await api.get<Client[]>(`/clients${params}`);
    return data;
  },

  getOne: async (id: number, userId?: number) => {
    const params = userId ? `?userId=${userId}` : '';
    const { data } = await api.get<Client>(`/clients/${id}${params}`);
    return data;
  },

  create: async (formData: ClientFormData, userId?: number) => {
    const params = userId ? `?userId=${userId}` : '';
    const { data } = await api.post<Client>(`/clients${params}`, formData);
    return data;
  },

  update: async (id: number, formData: Partial<ClientFormData>, userId?: number) => {
    const params = userId ? `?userId=${userId}` : '';
    const { data } = await api.put<Client>(`/clients/${id}${params}`, formData);
    return data;
  },

  delete: async (id: number, deleteAllHistory: boolean = false, userId?: number) => {
    const params = userId ? `?userId=${userId}` : '';
    await api.delete(`/clients/${id}${params}`, { data: { deleteAllHistory } });
  },
};

// Campaigns
export const campaignsApi = {
  create: async (formData: CampaignFormData, userId?: number) => {
    const params = userId ? `?userId=${userId}` : '';
    const { data } = await api.post(`/campaigns${params}`, formData);
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
  getHistory: async (clientId: number, userId?: number) => {
    const params = userId ? `?userId=${userId}` : '';
    const { data } = await api.get<Campaign[]>(`/clients/${clientId}/history${params}`);
    return data;
  },

  resetBudget: async (clientId: number, newBudget: number, userId?: number) => {
    const params = userId ? `?userId=${userId}` : '';
    const { data } = await api.post<Client>(`/clients/${clientId}/reset-budget${params}`, { newBudget });
    return data;
  },

  rollover: async (clientId: number, formData: RolloverFormData) => {
    const { data } = await api.post(`/clients/${clientId}/periods/rollover`, formData);
    return data;
  },

  rebaseline: async (clientId: number, formData: RebaselineFormData, userId?: number) => {
    const params = userId ? `?userId=${userId}` : '';
    const { data } = await api.post(`/clients/${clientId}/rebaseline${params}`, formData);
    return data;
  },
};

export const pauseApi = {
  createForClient: async (clientId: number, formData: PauseFormData) => {
    const { data } = await api.post(`/clients/${clientId}/pauses`, formData);
    return data;
  },
  createForCampaign: async (campaignId: number, formData: PauseFormData) => {
    const { data } = await api.post(`/campaigns/${campaignId}/pauses`, formData);
    return data;
  },
  cancel: async (pauseId: string) => {
    const { data } = await api.patch(`/pause-events/${pauseId}/cancel`);
    return data;
  },
};

export const notificationsApi = {
  getAll: async () => {
    const { data } = await api.get<AppNotification[]>('/notifications');
    return data;
  },
  markRead: async (id: string) => {
    const { data } = await api.patch(`/notifications/${id}/read`);
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

// Budget API
export const budgetApi = {
  getAll: async (range?: BudgetMonthRange) => {
    const params = new URLSearchParams();
    if (range) {
      params.set('startMonth', range.startMonth);
      params.set('endMonth', range.endMonth);
    }
    const { data } = await api.get<BudgetLog[]>(`/budget${params.size ? `?${params.toString()}` : ''}`);
    return data;
  },

  create: async (formData: BudgetLogFormData) => {
    const { data } = await api.post<BudgetLog>('/budget', formData);
    return data;
  },

  delete: async (id: number) => {
    const { data } = await api.delete<{ message: string }>(`/budget/${id}`);
    return data;
  },
};

// Share Link API
export const shareApi = {
  create: async (formData: ShareLinkFormData) => {
    const { data } = await api.post<ShareLink>('/share', formData);
    return data;
  },

  getMyLinks: async () => {
    const { data } = await api.get<ShareLink[]>('/share');
    return data;
  },

  getAccessLogs: async (id: string) => {
    const { data } = await api.get<ShareAccessLog[]>(`/share/${id}/logs`);
    return data;
  },

  update: async (id: string, formData: Partial<ShareLinkFormData & { isActive: boolean }>) => {
    const { data } = await api.put<ShareLink>(`/share/${id}`, formData);
    return data;
  },

  delete: async (id: string) => {
    const { data } = await api.delete<{ success: boolean }>(`/share/${id}`);
    return data;
  },

  // Public API (no auth required)
  validate: async (token: string, password?: string, skipLog?: boolean) => {
    const params = new URLSearchParams();
    if (password) params.append('password', password);
    if (skipLog) params.append('skipLog', 'true');
    const queryString = params.toString();
    const { data } = await api.get<{ valid: boolean; pageType: string; ownerName: string; name?: string }>(`/share/${token}/validate${queryString ? `?${queryString}` : ''}`);
    return data;
  },

  getData: async (token: string, page: 'home' | 'budget', password?: string, range?: BudgetMonthRange) => {
    const params = new URLSearchParams({ page });
    if (password) params.append('password', password);
    if (range) {
      params.set('startMonth', range.startMonth);
      params.set('endMonth', range.endMonth);
    }
    const { data } = await api.get<SharedDataResponse>(`/share/${token}/data?${params.toString()}`);
    return data;
  },
};

export const notesApi = {
  getAll: async (filters: NoteFilters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== false && value !== '') params.set(key, String(value));
    });
    const { data } = await api.get<NotesResponse>(`/notes${params.size ? `?${params.toString()}` : ''}`);
    return data;
  },
  getOne: async (id: string) => {
    const { data } = await api.get<AppNote>(`/notes/${id}`);
    return data;
  },
  create: async (formData: NoteFormData) => {
    const { data } = await api.post<AppNote>('/notes', formData);
    return data;
  },
  update: async (id: string, formData: Partial<NoteFormData>) => {
    const { data } = await api.patch<AppNote>(`/notes/${id}`, formData);
    return data;
  },
  delete: async (id: string) => {
    await api.delete(`/notes/${id}`);
  },
  revealSecret: async (id: string) => {
    const { data } = await api.get<{ secret: string }>(`/notes/${id}/secret`, { headers: { 'Cache-Control': 'no-store' } });
    return data;
  },
  searchUsers: async (q: string) => {
    const { data } = await api.get<NoteShareUser[]>(`/note-share-users?q=${encodeURIComponent(q)}`);
    return data;
  },
  addShare: async (noteId: string, userId: number, canViewSecret: boolean) => {
    const { data } = await api.post<NoteShare>(`/notes/${noteId}/shares`, { userId, canViewSecret });
    return data;
  },
  updateShare: async (noteId: string, userId: number, canViewSecret: boolean) => {
    const { data } = await api.patch<NoteShare>(`/notes/${noteId}/shares/${userId}`, { canViewSecret });
    return data;
  },
  deleteShare: async (noteId: string, userId: number) => {
    await api.delete(`/notes/${noteId}/shares/${userId}`);
  },
};

export default api;
