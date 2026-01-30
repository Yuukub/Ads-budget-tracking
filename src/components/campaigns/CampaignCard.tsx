import { Campaign, DayOfWeek } from '../../types';
import { Button } from '../ui/Button';
import { PlatformIcon } from '../ui/PlatformIcon';
import {
  enrichCampaign,
  formatCurrency,
  formatDate,
  getStatusEmoji,
  dayLabels,
} from '../../utils/helpers';

// ลำดับวันสำหรับแสดงผล
const DAYS_ORDER: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

interface CampaignCardProps {
  campaign: Campaign;
  onUpdateSpent: (campaign: Campaign) => void;
  onEdit: (campaign: Campaign) => void;
  onDelete: (campaign: Campaign) => void;
  onArchive?: (campaign: Campaign) => void;
}

export function CampaignCard({ campaign, onUpdateSpent, onEdit, onDelete, onArchive }: CampaignCardProps) {
  const enriched = enrichCampaign(campaign);
  const { daysRemaining, status, remaining, activeRunDays, recommendedDailyBudget } = enriched;

  // เรียงวันตามลำดับ
  const sortedActiveDays = campaign.activeDays
    ? DAYS_ORDER.filter(d => campaign.activeDays!.includes(d))
    : DAYS_ORDER.filter(d => ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'].includes(d)); // default

  const statusText = daysRemaining > 0
    ? `เหลือ ${daysRemaining} วัน`
    : `หมดแล้ว ${Math.abs(daysRemaining)} วัน`;

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">📢</span>
          <h4 className="font-medium text-gray-900">{campaign.name}</h4>
        </div>
        <div className="flex items-center gap-2">
          <PlatformIcon
            platform={campaign.platform}
            googleAdsType={campaign.googleAdsType}
            size="sm"
          />
          <span title={status === 'active' ? 'กำลังใช้งาน' : status === 'expiring_soon' ? 'ใกล้หมดอายุ' : 'หมดอายุแล้ว'}>
            {getStatusEmoji(status)}
          </span>
        </div>
      </div>

      {/* Budget Info - Stack on mobile, 3 cols on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-sm sm:text-base mb-4 bg-white/50 p-3 rounded-lg border border-gray-100 sm:border-0 sm:bg-transparent sm:p-0">
        <div className="flex justify-between sm:block">
          <span className="text-gray-500">งบประมาณ:</span>
          <span className="ml-1 font-medium">{formatCurrency(campaign.budget)}</span>
        </div>
        <div className="flex justify-between sm:block">
          <span className="text-gray-500">ใช้ไปแล้ว:</span>
          <span className={`ml-1 font-medium ${campaign.spent > campaign.budget ? 'text-red-600' : ''}`}>
            {formatCurrency(campaign.spent)}
          </span>
        </div>
        <div className="flex justify-between sm:block">
          <span className="text-gray-500">{remaining < 0 ? 'ใช้เกิน:' : 'คงเหลือ:'}</span>
          <span className={`ml-1 font-medium ${remaining < 0 ? 'text-red-600' : ''}`}>
            {remaining < 0 ? `-${formatCurrency(Math.abs(remaining))}` : formatCurrency(remaining)}
          </span>
        </div>
      </div>

      {/* Active Days & Recommended Budget */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-base py-3 mb-3 border-t border-gray-100 gap-2">
        <div className="flex items-start sm:items-center gap-2">
          <span className="text-gray-500 whitespace-nowrap pt-1 sm:pt-0">📅 เปิด:</span>
          <div className="flex flex-wrap gap-1">
            {sortedActiveDays.map(day => (
              <span
                key={day}
                className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs sm:text-sm font-medium border border-blue-100"
              >
                {dayLabels[day]}
              </span>
            ))}
          </div>
        </div>
        {activeRunDays > 0 && remaining > 0 && (
          <div className="flex justify-between sm:block text-right text-sm">
            <span className="sm:hidden text-gray-500">แนะนำ:</span>
            <div>
              <span className="font-semibold text-blue-600">{formatCurrency(recommendedDailyBudget)}</span>
              <span className="text-gray-400 text-xs ml-1">/วัน ({activeRunDays} วัน)</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <span className="text-sm text-gray-500">
          หมดอายุ: {formatDate(campaign.endDate)} ({statusText})
        </span>
        <div className="grid grid-cols-2 sm:flex gap-2">
          <Button variant="soft-success" size="sm" onClick={() => onUpdateSpent(campaign)} className="justify-center">
            📊 อัพเดท
          </Button>
          <Button variant="soft-primary" size="sm" onClick={() => onEdit(campaign)} className="justify-center">
            ✏️ แก้ไข
          </Button>
          {onArchive && (
            <Button variant="soft-warning" size="sm" onClick={() => onArchive(campaign)} className="justify-center">
              📁 สิ้นสุด
            </Button>
          )}
          <Button variant="soft-danger" size="sm" onClick={() => onDelete(campaign)} className="justify-center">
            🗑️ ลบ
          </Button>
        </div>
      </div>
    </div>
  );
}
