import { useState } from 'react';
import { Client, Campaign } from '../../types';
import { Button } from '../ui/Button';
import { CampaignCard } from '../campaigns/CampaignCard';
import { formatCurrency } from '../../utils/helpers';

// Helper to get full logo URL
const getLogoUrl = (logoPath: string | null) => {
  if (!logoPath) return '';
  if (logoPath.startsWith('http')) return logoPath;
  return `http://localhost:3001${logoPath}`;
};

interface ClientCardProps {
  client: Client;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
  onAddCampaign: (client: Client) => void;
  onUpdateSpent: (campaign: Campaign) => void;
  onEditCampaign: (campaign: Campaign) => void;
  onDeleteCampaign: (campaign: Campaign) => void;
  onArchiveCampaign?: (campaign: Campaign) => void;
  onViewHistory?: (client: Client) => void;
  onResetBudget?: (client: Client) => void;
  onRebaseline?: (client: Client) => void;
  onPause?: (client: Client) => void;
  onRollover?: (client: Client) => void;
  onPauseCampaign?: (campaign: Campaign) => void;
  onCancelPause?: (pauseId: string) => void;
  readOnly?: boolean;
}

export function ClientCard({
  client,
  onEdit,
  onDelete: _onDelete,
  onAddCampaign,
  onUpdateSpent,
  onEditCampaign,
  onDeleteCampaign,
  onArchiveCampaign,
  onViewHistory,
  onResetBudget,
  onRebaseline,
  onPause,
  onRollover,
  onPauseCampaign,
  onCancelPause,
  readOnly = false,
}: ClientCardProps) {
  const [showBudgetDetails, setShowBudgetDetails] = useState(false);

  // คำนวณเปอร์เซ็นต์งบที่ใช้ไปแล้ว (จาก effectiveBudget)
  const effectiveBudget = client.effectiveBudget ?? client.totalBudget;
  const spentPercent = effectiveBudget > 0
    ? Math.round((client.totalSpent / effectiveBudget) * 100)
    : 0;

  const remaining = effectiveBudget - client.totalSpent;
  const hasNoBudgetLeft = client.unallocated <= 0;
  const hasCarryOver = client.carryOver !== 0;

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
          <div className="flex items-center gap-3">
            {client.logo ? (
              <img
                src={getLogoUrl(client.logo)}
                alt={`${client.name} logo`}
                className="w-10 h-10 object-contain rounded-lg border border-border bg-card"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <span className={`text-xl ${client.logo ? 'hidden' : ''}`}>👤</span>
            <h3 className="text-lg font-semibold text-foreground">{client.name}</h3>
          </div>
          {!readOnly && (
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              {onViewHistory && (
                <Button variant="soft-purple" size="sm" onClick={() => onViewHistory(client)} className="flex-1 sm:flex-none justify-center">
                  📋 ประวัติ
                </Button>
              )}
              <Button variant="soft-primary" size="sm" onClick={() => onEdit(client)} className="flex-1 sm:flex-none justify-center">
                ✏️ แก้ไข
              </Button>
              <Button variant="primary" size="sm" onClick={() => onAddCampaign(client)} className="flex-1 sm:flex-none justify-center">
                + แคมเปญ
              </Button>
              {onPause && <Button variant="soft-warning" size="sm" onClick={() => onPause(client)} className="flex-1 sm:flex-none justify-center">⏸️ พักแอด</Button>}
              {onRollover && <Button variant={client.isRolloverDue ? 'soft-warning' : 'soft-purple'} size="sm" onClick={() => onRollover(client)} className="flex-1 sm:flex-none justify-center">🔄 เปิดรอบใหม่</Button>}
            </div>
          )}
        </div>

        {/* Budget Summary */}
        <div className="space-y-3">
          {client.budgetPeriodMonth && (
            <div className={`rounded-lg px-3 py-2 text-sm ${client.isRolloverDue ? 'bg-amber-50 text-amber-700' : 'bg-muted text-muted-foreground'}`}>
              รอบงบ {client.budgetPeriodMonth.slice(0, 7)} สิ้นสุด {client.budgetPeriodEndsOn ? new Date(client.budgetPeriodEndsOn).toLocaleDateString('th-TH') : '-'}
              {client.isRolloverDue ? ' — ถึงเวลาตรวจและเปิดรอบใหม่' : ''}
            </div>
          )}
          {/* งบประมาณ */}
          <div className="space-y-1">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm">
              <div className="flex items-center justify-between sm:justify-start gap-2">
                <span className="text-muted-foreground">💰 งบรวมลูกค้า:</span>
                <span className="font-semibold">{formatCurrency(client.totalBudget)}</span>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  aria-expanded={showBudgetDetails}
                  aria-controls={`budget-details-${client.id}`}
                  onClick={() => setShowBudgetDetails(current => !current)}
                >
                  {showBudgetDetails ? '▴ ซ่อนรายละเอียด' : '▾ ดูรายละเอียดงบ'}
                </Button>
                {!readOnly && (
                  <div className="flex flex-col gap-2 sm:flex-row">
                  {onResetBudget && !client.budgetPeriodId && (
                    <Button variant="soft-success" size="sm" className="w-full sm:w-auto" onClick={() => onResetBudget(client)}>
                      💰 เติมงบใหม่
                    </Button>
                  )}
                  {onRebaseline && (
                    <Button variant="soft-warning" size="sm" className="w-full sm:w-auto" onClick={() => onRebaseline(client)}>
                      🧹 รีเซ็ตยอดปัจจุบัน
                    </Button>
                  )}
                  </div>
                )}
              </div>
            </div>

            {hasCarryOver && (
              <div className="flex items-center justify-between text-sm">
                <span className={client.carryOver < 0 ? 'text-red-500' : 'text-blue-500'}>
                  {client.carryOver < 0 ? '⚠️ ยกมา (ใช้เกิน):' : '💵 ยกมา (เหลือ):'}
                </span>
                <span className={client.carryOver < 0 ? 'text-red-600 font-medium' : 'text-blue-600 font-medium'}>
                  {client.carryOver < 0 ? `-${formatCurrency(Math.abs(client.carryOver))}` : formatCurrency(client.carryOver)}
                </span>
              </div>
            )}

            {hasCarryOver && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">💵 งบที่ใช้ได้:</span>
                <span className="font-semibold">{formatCurrency(effectiveBudget)}</span>
              </div>
            )}
          </div>

          {showBudgetDetails && (
            <div id={`budget-details-${client.id}`} className="space-y-3 pt-2">
          {/* การจัดสรรงบ */}
          <div className="space-y-1 pt-2 border-t border-border/50">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">📋 จัดสรรแล้ว:</span>
              <span className="text-foreground">{formatCurrency(client.allocated)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">📦 ยังไม่จัดสรร:</span>
              <span className={client.unallocated <= 0 ? 'text-amber-600' : 'text-blue-600'}>
                {formatCurrency(client.unallocated)}
              </span>
            </div>
          </div>

          {/* การใช้งาน */}
          <div className="space-y-1 pt-2 border-t border-border/50">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">💸 ใช้ไปแล้ว:</span>
              <span className="text-foreground">{formatCurrency(client.totalSpent)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">💵 คงเหลือ:</span>
              <span className={remaining <= 0 ? 'text-red-600' : 'text-green-600'}>
                {formatCurrency(remaining)}
              </span>
            </div>

            {/* Progress Bar - งบที่ใช้ไปแล้ว */}
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${spentPercent >= 90 ? 'bg-red-500' : spentPercent >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                    style={{ width: `${Math.min(spentPercent, 100)}%` }}
                  />
                </div>
                <span className="text-sm text-muted-foreground w-12 text-right">{spentPercent}%</span>
              </div>
            </div>
          </div>

          {hasNoBudgetLeft && !readOnly && (
            <div className="mt-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg">
              ⚠️ งบจัดสรรหมดแล้ว! กด [แก้ไข] เพื่อเพิ่มงบรวม
            </div>
          )}
              </div>
            )}
        </div>
      </div>

      {/* Campaigns */}
      <div className="p-4 space-y-3">
        {client.campaigns.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            {readOnly ? 'ยังไม่มีแคมเปญ' : 'ยังไม่มีแคมเปญ กด "+ แคมเปญ" เพื่อเพิ่ม'}
          </p>
        ) : (
          client.campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onUpdateSpent={onUpdateSpent}
              onEdit={onEditCampaign}
              onDelete={onDeleteCampaign}
              onArchive={onArchiveCampaign}
              onPause={onPauseCampaign}
              onCancelPause={onCancelPause}
              readOnly={readOnly}
            />
          ))
        )}
      </div>

      {/* Footer Summary */}
      {client.campaigns.length > 0 && (
        <div className="px-4 py-3 bg-muted/50 border-t border-border text-base text-muted-foreground">
          📊 สรุป: {client.campaigns.length} แคมเปญ | งบรวม {formatCurrency(client.allocated)} | ใช้ไป {formatCurrency(client.totalSpent)}
        </div>
      )}
    </div>
  );
}
