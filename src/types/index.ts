export type Platform = 'google_ads' | 'facebook_ads';
export type GoogleAdsType = 'search' | 'display' | 'pmax';
export type CampaignStatus = 'active' | 'expiring_soon' | 'expired';
export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

// ค่าเริ่มต้นวันที่เปิดแอด (จันทร์-เสาร์)
export const DEFAULT_ACTIVE_DAYS: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export type UserRole = 'user' | 'admin';
export type UserStatus = 'active' | 'suspended';

export interface User {
  id: number;
  email: string;
  name: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface Campaign {
  id: number;
  clientId: number | null; // nullable เมื่อลูกค้าถูกลบ
  name: string;
  budget: number;
  spent: number;
  endDate: string;
  platform: Platform;
  googleAdsType: GoogleAdsType | null;
  activeDays: DayOfWeek[] | null; // วันที่เปิดแอด
  isArchived: boolean;
  archivedAt: string | null;
  clientName: string | null; // เก็บชื่อลูกค้าเมื่อลบลูกค้าแล้ว
  createdAt: string;
  updatedAt: string;
}

export interface CampaignWithStatus extends Campaign {
  remaining: number;
  daysRemaining: number;
  status: CampaignStatus;
  activeRunDays: number; // จำนวนวันเปิดแอดที่เหลือ
  recommendedDailyBudget: number; // งบแนะนำต่อวัน
}

export interface Client {
  id: number;
  userId: number;
  name: string;
  logo: string | null; // URL หรือ path ของ logo
  totalBudget: number;
  carryOver: number; // ยอดยกมา (ลบ = ใช้เกิน)
  createdAt: string;
  updatedAt: string;
  campaigns: Campaign[];
  allocated: number;
  unallocated: number;
  totalSpent: number;
  effectiveBudget: number; // งบที่ใช้ได้จริง = totalBudget + carryOver
}

export interface ClientFormData {
  name: string;
  totalBudget: number;
  logo?: string | null;
}

export interface CampaignFormData {
  clientId: number;
  name: string;
  budget: number;
  endDate: string;
  platform: Platform;
  googleAdsType?: GoogleAdsType;
  activeDays?: DayOfWeek[];
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Campaign with client info for combined history
export interface CampaignWithClient extends Campaign {
  client: {
    id: number | null;
    name: string;
    logo?: string | null;
  } | null;
}

// Combined history API response
export interface HistoryResponse {
  campaigns: CampaignWithClient[];
  clients: { id: number; name: string }[];
  summary: {
    totalCampaigns: number;
    totalBudget: number;
    totalSpent: number;
    totalRemaining: number;
    totalOverspent: number;
  };
}

// History filters
export interface HistoryFilters {
  clientId?: string;
  platform?: string;
  search?: string;
}

// Settings
export interface Settings {
  appName: string;
  appLogo: string | null;
  primaryColor: string;
  footerText: string;
  turnstileEnabled: boolean;
  turnstileSiteKey: string | null;
}

export interface SettingsAdmin extends Settings {
  id: number;
  turnstileSecretKey: string | null;
  updatedAt: string;
}

// Admin Dashboard
export interface AdminDashboard {
  users: {
    total: number;
    active: number;
    suspended: number;
  };
  clients: {
    total: number;
  };
  campaigns: {
    active: number;
    archived: number;
    expiringSoon: number;
  };
  budget: {
    totalBudget: number;
    totalAllocated: number;
    totalSpent: number;
  };
}

// Admin User (with stats)
export interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  clientCount: number;
  campaignCount: number;
}

export interface BudgetLog {
  id: number;
  userId: number;
  clientName: string;
  date: string; // ISO date string
  type: 'RECEIVED' | 'TOPUP';
  amount: number;
  usableAmount?: number | null;
  platform?: string | null;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetLogFormData {
  clientName: string;
  date: string;
  type: 'RECEIVED' | 'TOPUP';
  amount: number;
  usableAmount?: number;
  platform?: string;
  note?: string;
}

// Share Link Types
export type SharePageType = 'home' | 'budget' | 'all';

export interface ShareLink {
  id: string;
  token: string;
  name: string | null;
  pageType: SharePageType;
  expiresAt: string | null;
  maxViews: number | null;
  viewCount: number;
  isActive: boolean;
  hasPassword: boolean;
  accessCount?: number;
  isExpired?: boolean;
  isMaxedOut?: boolean;
  createdAt: string;
}

export interface ShareLinkFormData {
  name?: string;
  pageType?: SharePageType;
  expiresAt?: string | null;
  password?: string | null;
  maxViews?: number | null;
}

export interface ShareAccessLog {
  id: string;
  shareLinkId: string;
  ipAddress: string | null;
  userAgent: string | null;
  accessedAt: string;
}

export interface SharedDataResponse {
  pageType: 'home' | 'budget';
  ownerName: string;
  data: Client[] | BudgetLog[];
}
