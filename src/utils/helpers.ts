import { Campaign, CampaignStatus, CampaignWithStatus, Platform, GoogleAdsType, DayOfWeek, DEFAULT_ACTIVE_DAYS, PauseEvent } from '../types';

export function calculateDaysRemaining(endDate: string): number {
  const end = new Date(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const diffTime = end.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getCampaignStatus(daysRemaining: number): CampaignStatus {
  if (daysRemaining <= 0) return 'expired';
  if (daysRemaining <= 7) return 'expiring_soon';
  return 'active';
}

// Map วันในสัปดาห์ไปเป็นตัวเลข (0 = อาทิตย์, 1 = จันทร์, ...)
const dayToNumber: Record<DayOfWeek, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

// Map สำหรับแสดงผลภาษาไทย
const dayLabels: Record<DayOfWeek, string> = {
  mon: 'จ',
  tue: 'อ',
  wed: 'พ',
  thu: 'พฤ',
  fri: 'ศ',
  sat: 'ส',
  sun: 'อา',
};

// นับจำนวนวันที่จะเปิดแอดจากวันนี้ถึงวันหมดอายุ
export function countActiveDays(endDate: string, activeDays: DayOfWeek[] | null, pauseEvents: PauseEvent[] = [], fromDate = new Date()): number {
  const days = activeDays || DEFAULT_ACTIVE_DAYS;
  if (days.length === 0) return 0;

  const end = new Date(`${endDate.slice(0, 10)}T00:00:00`);
  const today = new Date(fromDate);
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  // ถ้าหมดอายุแล้ว ไม่มีวันเหลือ
  if (end < today) return 0;

  const activeDayNumbers = days.map(d => dayToNumber[d]);
  let count = 0;
  const current = new Date(today);

  while (current <= end) {
    const dateKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
    const isPaused = pauseEvents.some(pause =>
      pause.status !== 'CANCELLED' && pause.status !== 'cancelled'
      && dateKey >= pause.startsOn.slice(0, 10) && dateKey < pause.endsOn.slice(0, 10)
    );
    if (activeDayNumbers.includes(current.getDay()) && !isPaused) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

// แปลง activeDays เป็นข้อความภาษาไทย
export function formatActiveDays(activeDays: DayOfWeek[] | null): string {
  const days = activeDays || DEFAULT_ACTIVE_DAYS;
  // เรียงตามลำดับวัน
  const orderedDays: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const sorted = orderedDays.filter(d => days.includes(d));
  return sorted.map(d => dayLabels[d]).join(' ');
}

// ส่งออก dayLabels เพื่อใช้ใน UI
export { dayLabels };

export function enrichCampaign(campaign: Campaign): CampaignWithStatus {
  const daysRemaining = calculateDaysRemaining(campaign.endDate);
  const remaining = campaign.budget - campaign.spent;
  const activeRunDays = countActiveDays(campaign.endDate, campaign.activeDays, campaign.pauseEvents);
  const recommendedDailyBudget = activeRunDays > 0 ? Math.round(remaining / activeRunDays) : 0;

  return {
    ...campaign,
    remaining,
    daysRemaining,
    status: getCampaignStatus(daysRemaining),
    activeRunDays,
    recommendedDailyBudget,
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('th-TH', {
    year: '2-digit',
    month: 'short',
    day: 'numeric',
  });
}

export function formatPlatform(platform: Platform, googleType?: GoogleAdsType | null): string {
  if (platform === 'facebook_ads') return 'Facebook Ads';
  if (platform === 'google_ads') {
    const typeMap: Record<GoogleAdsType, string> = {
      search: 'Search',
      display: 'Display',
      pmax: 'Pmax',
    };
    return `Google/${googleType ? typeMap[googleType] : 'Ads'}`;
  }
  return platform;
}

export function getStatusColor(status: CampaignStatus): string {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'expiring_soon':
      return 'bg-yellow-100 text-yellow-800';
    case 'expired':
      return 'bg-red-100 text-red-800';
  }
}

export function getStatusEmoji(status: CampaignStatus): string {
  switch (status) {
    case 'active':
      return '🟢';
    case 'expiring_soon':
      return '🟡';
    case 'expired':
      return '🔴';
  }
}
