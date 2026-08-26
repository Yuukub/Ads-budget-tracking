import { useState, useEffect, useMemo } from 'react';
import { Campaign, CampaignFormData, Platform, GoogleAdsType, Client, DayOfWeek, DEFAULT_ACTIVE_DAYS } from '../../types';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { formatCurrency, countActiveDays, dayLabels } from '../../utils/helpers';
import { cn } from '../../lib/utils';

// ลำดับวันสำหรับแสดงผล
const DAYS_ORDER: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

function endOfCurrentMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
}

function todayDateInput(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function defaultStartDate(client: Client): string {
  const today = todayDateInput();
  const periodStart = client.budgetPeriodStartsOn?.slice(0, 10);
  return periodStart && periodStart > today ? periodStart : today;
}

interface CampaignFormProps {
  campaign?: Campaign;
  client: Client;
  onSubmit: (data: CampaignFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function CampaignForm({ campaign, client, onSubmit, onCancel, isLoading }: CampaignFormProps) {
  const [name, setName] = useState(campaign?.name || '');
  const [budget, setBudget] = useState(campaign?.budget?.toString() || '');
  const [startsOn, setStartsOn] = useState(
    campaign?.startsOn?.slice(0, 10) || defaultStartDate(client)
  );
  const [endDate, setEndDate] = useState(
    campaign?.endDate?.slice(0, 10) || client.budgetPeriodEndsOn?.slice(0, 10) || endOfCurrentMonth()
  );
  const [platform, setPlatform] = useState<Platform>(campaign?.platform || 'google_ads');
  const [googleAdsType, setGoogleAdsType] = useState<GoogleAdsType>(
    campaign?.googleAdsType || 'search'
  );
  const [activeDays, setActiveDays] = useState<DayOfWeek[]>(
    campaign?.activeDays || DEFAULT_ACTIVE_DAYS
  );
  const [error, setError] = useState('');

  const isEdit = !!campaign;

  // Calculate available budget
  const otherCampaignsBudget = client.campaigns
    .filter((c) => c.id !== campaign?.id)
    .reduce((sum, c) => sum + c.budget, 0);
  const available = client.effectiveBudget - otherCampaignsBudget;
  const minBudget = campaign?.spent || 0;

  useEffect(() => {
    if (campaign) {
      setName(campaign.name);
      setBudget(campaign.budget.toString());
      setStartsOn(campaign.startsOn.slice(0, 10));
      setEndDate(campaign.endDate.slice(0, 10));
      setPlatform(campaign.platform);
      if (campaign.googleAdsType) {
        setGoogleAdsType(campaign.googleAdsType);
      }
      setActiveDays(campaign.activeDays || DEFAULT_ACTIVE_DAYS);
    }
  }, [campaign]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const budgetNum = parseFloat(budget) || 0;

    if (!name.trim()) {
      setError('กรุณากรอกชื่อแคมเปญ');
      return;
    }

    if (budgetNum <= 0) {
      setError('งบแคมเปญต้องมากกว่า 0');
      return;
    }

    if (budgetNum > available) {
      setError(`งบแคมเปญเกินงบที่เหลือ (${formatCurrency(available)})`);
      return;
    }

    if (isEdit && budgetNum < minBudget) {
      setError(`งบต้องไม่น้อยกว่าที่ใช้ไปแล้ว (${formatCurrency(minBudget)})`);
      return;
    }

    if (!endDate) {
      setError('กรุณาเลือกวันหมดอายุ');
      return;
    }

    if (!startsOn) {
      setError('กรุณาเลือกวันเริ่มยิงแอด');
      return;
    }

    if (client.budgetPeriodEndsOn && startsOn > client.budgetPeriodEndsOn.slice(0, 10)) {
      setError('วันเริ่มยิงแอดต้องอยู่ภายในรอบงบปัจจุบัน');
      return;
    }

    if (startsOn > endDate) {
      setError('วันเริ่มยิงแอดต้องไม่เกินวันสิ้นสุด');
      return;
    }

    onSubmit({
      clientId: client.id,
      name: name.trim(),
      budget: budgetNum,
      startsOn,
      endDate,
      platform,
      googleAdsType: platform === 'google_ads' ? googleAdsType : undefined,
      activeDays,
    });
  };

  // Toggle วันเปิดแอด
  const toggleDay = (day: DayOfWeek) => {
    setActiveDays(prev => {
      if (prev.includes(day)) {
        // ไม่ให้เลือกน้อยกว่า 1 วัน
        if (prev.length <= 1) return prev;
        return prev.filter(d => d !== day);
      } else {
        return [...prev, day];
      }
    });
  };

  // คำนวณงบแนะนำต่อวัน (realtime preview)
  const budgetPreview = useMemo(() => {
    const budgetValue = parseFloat(budget) || 0;
    const spent = campaign?.spent || 0;
    const remaining = budgetValue - spent;

    if (!endDate || activeDays.length === 0 || remaining <= 0) {
      return { activeRunDays: 0, recommendedDaily: 0, remaining };
    }

    const today = todayDateInput();
    const calculationStart = startsOn > today ? new Date(`${startsOn}T00:00:00`) : new Date(`${today}T00:00:00`);
    const activeRunDays = countActiveDays(endDate, activeDays, [], calculationStart);
    const recommendedDaily = activeRunDays > 0 ? Math.round(remaining / activeRunDays) : 0;

    return { activeRunDays, recommendedDaily, remaining };
  }, [budget, startsOn, endDate, activeDays, campaign?.spent]);

  // Calculate what will return to unallocated if budget is reduced
  const budgetNum = parseFloat(budget) || 0;
  const returnToUnallocated = isEdit && campaign ? campaign.budget - budgetNum : 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="bg-blue-50 p-3 rounded-lg text-sm">
        <span className="text-blue-700">💰 งบที่ยังไม่จัดสรร: {formatCurrency(available)}</span>
      </div>

      <Input
        label="ชื่อแคมเปญ"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="ชื่อแคมเปญ"
        required
      />

      <div>
        <Input
          label="งบแคมเปญ (฿)"
          type="number"
          step="0.01"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          placeholder="50000"
          min={0}
          max={available}
        />
        {isEdit && minBudget > 0 && (
          <p className="mt-1 text-sm text-amber-600">
            ⚠️ ต่ำสุด: {formatCurrency(minBudget)} (ใช้ไปแล้ว)
          </p>
        )}
        {returnToUnallocated > 0 && (
          <p className="mt-1 text-sm text-green-600">
            💡 ลดงบ {formatCurrency(returnToUnallocated)} จะกลับไปเป็น "ยังไม่จัดสรร"
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          label="วันเริ่มยิงแอด"
          type="date"
          value={startsOn}
          max={client.budgetPeriodEndsOn?.slice(0, 10) || endDate}
          onChange={(e) => setStartsOn(e.target.value)}
          required
        />
        <Input
          label="วันสิ้นสุด (ค่าเริ่มต้น: สิ้นเดือน)"
          type="date"
          value={endDate}
          min={startsOn}
          onChange={(e) => setEndDate(e.target.value)}
          required
        />
      </div>

      {/* Day Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">วันที่เปิดแอด</label>
        <div className="flex flex-wrap gap-2">
          {DAYS_ORDER.map((day) => {
            const isSelected = activeDays.includes(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  isSelected
                    ? "bg-blue-500 text-white shadow-md hover:bg-blue-600"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {dayLabels[day]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Budget Preview */}
      {endDate && budgetPreview.remaining > 0 && budgetPreview.activeRunDays > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-blue-600">งบแนะนำ/วัน</span>
              <p className="text-2xl font-bold text-blue-700">
                {formatCurrency(budgetPreview.recommendedDaily)}
              </p>
            </div>
            <div className="text-right text-sm text-blue-600">
              <p>งบเหลือ: {formatCurrency(budgetPreview.remaining)}</p>
              <p>วันเปิดแอดที่เหลือ: {budgetPreview.activeRunDays} วัน</p>
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="platform"
              value="google_ads"
              checked={platform === 'google_ads'}
              onChange={() => setPlatform('google_ads')}
              className="text-blue-600"
            />
            <span>Google Ads</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="platform"
              value="facebook_ads"
              checked={platform === 'facebook_ads'}
              onChange={() => setPlatform('facebook_ads')}
              className="text-blue-600"
            />
            <span>Facebook Ads</span>
          </label>
        </div>
      </div>

      {platform === 'google_ads' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">ประเภท Google Ads</label>
          <div className="flex gap-4">
            {(['search', 'display', 'pmax'] as GoogleAdsType[]).map((type) => (
              <label key={type} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="googleAdsType"
                  value={type}
                  checked={googleAdsType === type}
                  onChange={() => setGoogleAdsType(type)}
                  className="text-blue-600"
                />
                <span className="capitalize">{type === 'pmax' ? 'Pmax' : type}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          ยกเลิก
        </Button>
        <Button type="submit" className="flex-1" disabled={isLoading}>
          {isLoading ? 'กำลังบันทึก...' : 'บันทึก'}
        </Button>
      </div>
    </form>
  );
}
