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
  onPause?: (campaign: Campaign) => void;
  onCancelPause?: (pauseId: string) => void;
  readOnly?: boolean;
}

export function CampaignCard({ campaign, onUpdateSpent, onEdit, onDelete, onArchive, onPause, onCancelPause, readOnly = false }: CampaignCardProps) {
  const enriched = enrichCampaign(campaign);
  const { daysRemaining, status, remaining, activeRunDays, recommendedDailyBudget } = enriched;

  // เรียงวันตามลำดับ
  const sortedActiveDays = campaign.activeDays
    ? DAYS_ORDER.filter(d => campaign.activeDays!.includes(d))
    : DAYS_ORDER.filter(d => ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'].includes(d)); // default

  const statusText = daysRemaining > 0
    ? `เหลือ ${daysRemaining} วัน`
    : `หมดแล้ว ${Math.abs(daysRemaining)} วัน`;
  const cancellablePause = campaign.pauseEvents?.find(pause => pause.status === 'paused' || pause.status === 'scheduled');
  const displayedPause = campaign.pauseEvents?.find(pause => pause.status === campaign.pauseStatus);
  const pauseDateDetails = displayedPause
    ? `เริ่มพัก: ${formatDate(displayedPause.startsOn)} • เปิดกลับ: ${formatDate(displayedPause.endsOn)}`
    : null;

  return (
    <div className="bg-card/50 rounded-lg p-4 border border-border">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">📢</span>
          <h4 className="font-medium text-foreground">{campaign.name}</h4>
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-sm sm:text-base mb-4 bg-background/50 p-3 rounded-lg border border-border sm:border-0 sm:bg-transparent sm:p-0">
        <div className="flex justify-between sm:block">
          <span className="text-muted-foreground">งบประมาณ:</span>
          <span className="ml-1 font-medium">{formatCurrency(campaign.budget)}</span>
        </div>
        <div className="flex justify-between sm:block">
          <span className="text-muted-foreground">ใช้ไปแล้ว:</span>
          <span className={`ml-1 font-medium ${campaign.spent > campaign.budget ? 'text-red-600' : ''}`}>
            {formatCurrency(campaign.spent)}
          </span>
        </div>
        <div className="flex justify-between sm:block">
          <span className="text-muted-foreground">{remaining < 0 ? 'ใช้เกิน:' : 'คงเหลือ:'}</span>
          <span className={`ml-1 font-medium ${remaining < 0 ? 'text-red-600' : ''}`}>
            {remaining < 0 ? `-${formatCurrency(Math.abs(remaining))}` : formatCurrency(remaining)}
          </span>
        </div>
      </div>

      {/* Active Days & Recommended Budget */}
      {campaign.pauseStatus && (
        <div className={`mb-3 rounded-lg px-3 py-2 text-sm ${campaign.pauseStatus === 'paused' ? 'bg-amber-50 text-amber-700' : campaign.pauseStatus === 'scheduled' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
          <div className="font-medium">
            {campaign.pauseStatus === 'paused' ? '⏸️ พักอยู่' : campaign.pauseStatus === 'scheduled' ? '🗓️ กำหนดพัก' : '▶️ กลับมาทำงานแล้ว'}{campaign.pauseReason ? `: ${campaign.pauseReason}` : ''}
          </div>
          {pauseDateDetails && (
            <div className="mt-1 text-xs opacity-80">{pauseDateDetails}</div>
          )}
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-base py-3 mb-3 border-t border-border gap-2">
        <div className="flex items-start sm:items-center gap-2">
          <span className="text-muted-foreground whitespace-nowrap pt-1 sm:pt-0">📅 เปิด:</span>
          <div className="flex flex-wrap gap-1">
            {sortedActiveDays.map(day => (
              <span
                key={day}
                className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs sm:text-sm font-medium border border-blue-100 dark:border-blue-800"
              >
                {dayLabels[day]}
              </span>
            ))}
          </div>
        </div>
        {activeRunDays > 0 && remaining > 0 && (
          <div className="flex justify-between sm:block text-right text-sm">
            <span className="sm:hidden text-muted-foreground">แนะนำ:</span>
            <div>
              <span className="font-semibold text-blue-600 dark:text-blue-400">{formatCurrency(recommendedDailyBudget)}</span>
              <span className="text-muted-foreground text-xs ml-1">/วัน ({activeRunDays} วัน)</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <span className="text-sm text-muted-foreground">
          หมดอายุ: {formatDate(campaign.endDate)} ({statusText})
        </span>
        {!readOnly && (
          <div className="grid grid-cols-2 sm:flex gap-2">
            <Button variant="soft-success" size="sm" onClick={() => onUpdateSpent(campaign)} className="justify-center">
              📊 อัพเดท
            </Button>
            <Button variant="soft-primary" size="sm" onClick={() => onEdit(campaign)} className="justify-center">
              ✏️ แก้ไข
            </Button>
            {onPause && (
              <Button variant="soft-warning" size="sm" onClick={() => onPause(campaign)} className="justify-center">
                ⏸️ พัก
              </Button>
            )}
            {cancellablePause && onCancelPause && (
              <Button variant="secondary" size="sm" onClick={() => onCancelPause(cancellablePause.id)} className="justify-center">
                ▶️ ยกเลิกพัก
              </Button>
            )}
            {onArchive && (
              <Button variant="soft-warning" size="sm" onClick={() => onArchive(campaign)} className="justify-center">
                📁 สิ้นสุด
              </Button>
            )}
            <Button variant="soft-danger" size="sm" onClick={() => onDelete(campaign)} className="justify-center">
              🗑️ ลบ
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
