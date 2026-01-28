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

      <div className="grid grid-cols-3 gap-4 text-base mb-3">
        <div>
          <span className="text-gray-500">งบ:</span>
          <span className="ml-1 font-medium">{formatCurrency(campaign.budget)}</span>
        </div>
        <div>
          <span className="text-gray-500">ใช้ไป:</span>
          <span className={`ml-1 font-medium ${campaign.spent > campaign.budget ? 'text-red-600' : ''}`}>
            {formatCurrency(campaign.spent)}
          </span>
        </div>
        <div>
          <span className="text-gray-500">{remaining < 0 ? 'เกิน:' : 'เหลือ:'}</span>
          <span className={`ml-1 font-medium ${remaining < 0 ? 'text-red-600' : ''}`}>
            {remaining < 0 ? `-${formatCurrency(Math.abs(remaining))}` : formatCurrency(remaining)}
          </span>
        </div>
      </div>

      {/* Active Days & Recommended Budget */}
      <div className="flex items-center justify-between text-base py-2 mb-2 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-gray-500">📅 เปิด:</span>
          <div className="flex gap-1">
            {sortedActiveDays.map(day => (
              <span
                key={day}
                className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium"
              >
                {dayLabels[day]}
              </span>
            ))}
          </div>
        </div>
        {activeRunDays > 0 && remaining > 0 && (
          <div className="text-right">
            <span className="text-gray-500">แนะนำ/วัน: </span>
            <span className="font-semibold text-blue-600">{formatCurrency(recommendedDailyBudget)}</span>
            <span className="text-gray-400 text-sm ml-1">({activeRunDays} วัน)</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-base">
        <span className="text-gray-500">
          หมดอายุ: {formatDate(campaign.endDate)} ({statusText})
        </span>
        <div className="flex gap-1.5">
          <Button variant="soft-success" size="sm" onClick={() => onUpdateSpent(campaign)}>
            📊 อัพเดท
          </Button>
          <Button variant="soft-primary" size="sm" onClick={() => onEdit(campaign)}>
            ✏️ แก้ไข
          </Button>
          {onArchive && (
            <Button variant="soft-warning" size="sm" onClick={() => onArchive(campaign)}>
              📁 สิ้นสุด
            </Button>
          )}
          <Button variant="soft-danger" size="sm" onClick={() => onDelete(campaign)}>
            🗑️ ลบ
          </Button>
        </div>
      </div>
    </div>
  );
}
