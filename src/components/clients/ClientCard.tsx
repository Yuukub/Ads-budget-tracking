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
}: ClientCardProps) {
  // คำนวณเปอร์เซ็นต์งบที่ใช้ไปแล้ว (จาก effectiveBudget)
  const effectiveBudget = client.effectiveBudget ?? client.totalBudget;
  const spentPercent = effectiveBudget > 0
    ? Math.round((client.totalSpent / effectiveBudget) * 100)
    : 0;

  const remaining = effectiveBudget - client.totalSpent;
  const hasNoBudgetLeft = client.unallocated <= 0;
  const hasCarryOver = client.carryOver !== 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {client.logo ? (
              <img
                src={getLogoUrl(client.logo)}
                alt={`${client.name} logo`}
                className="w-10 h-10 object-contain rounded-lg border bg-white"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <span className={`text-xl ${client.logo ? 'hidden' : ''}`}>👤</span>
            <h3 className="text-lg font-semibold text-gray-900">{client.name}</h3>
          </div>
          <div className="flex gap-2">
            {onViewHistory && (
              <Button variant="soft-purple" size="sm" onClick={() => onViewHistory(client)}>
                📋 ประวัติ
              </Button>
            )}
            <Button variant="soft-primary" size="sm" onClick={() => onEdit(client)}>
              ✏️ แก้ไข
            </Button>
            <Button variant="primary" size="sm" onClick={() => onAddCampaign(client)}>
              + แคมเปญ
            </Button>
          </div>
        </div>

        {/* Budget Summary */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">💰 งบรวมลูกค้า:</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{formatCurrency(client.totalBudget)}</span>
              {onResetBudget && (
                <Button variant="soft-success" size="sm" onClick={() => onResetBudget(client)}>
                  💰 เติมงบใหม่
                </Button>
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
              <span className="text-gray-600">💵 งบที่ใช้ได้:</span>
              <span className="font-semibold">{formatCurrency(effectiveBudget)}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">├─ ใช้ไปแล้ว:</span>
            <span className="text-gray-700">{formatCurrency(client.totalSpent)}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">└─ คงเหลือ:</span>
            <span className={remaining <= 0 ? 'text-red-600' : 'text-green-600'}>
              {formatCurrency(remaining)}
            </span>
          </div>

          {/* Progress Bar - งบที่ใช้ไปแล้ว */}
          <div className="mt-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    spentPercent >= 90 ? 'bg-red-500' : spentPercent >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(spentPercent, 100)}%` }}
                />
              </div>
              <span className="text-sm text-gray-600 w-12 text-right">{spentPercent}%</span>
            </div>
          </div>

          {hasNoBudgetLeft && (
            <div className="mt-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
              ⚠️ งบจัดสรรหมดแล้ว! กด [แก้ไข] เพื่อเพิ่มงบรวม
            </div>
          )}
        </div>
      </div>

      {/* Campaigns */}
      <div className="p-4 space-y-3">
        {client.campaigns.length === 0 ? (
          <p className="text-center text-gray-500 py-4">
            ยังไม่มีแคมเปญ กด "+ แคมเปญ" เพื่อเพิ่ม
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
            />
          ))
        )}
      </div>

      {/* Footer Summary */}
      {client.campaigns.length > 0 && (
        <div className="px-4 py-3 bg-gray-50 border-t text-base text-gray-600">
          📊 สรุป: {client.campaigns.length} แคมเปญ | งบรวม {formatCurrency(client.allocated)} | ใช้ไป {formatCurrency(client.totalSpent)}
        </div>
      )}
    </div>
  );
}
