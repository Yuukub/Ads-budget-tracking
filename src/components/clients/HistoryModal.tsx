import { Campaign, Client } from '../../types';
import { Modal } from '../ui/Modal';
import { formatCurrency, formatDate, formatPlatform } from '../../utils/helpers';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  history: Campaign[];
  isLoading: boolean;
}

export function HistoryModal({ isOpen, onClose, client, history, isLoading }: HistoryModalProps) {
  if (!client) return null;

  // Group campaigns by month
  const groupedHistory = history.reduce((groups, campaign) => {
    const date = new Date(campaign.archivedAt || campaign.endDate);
    const monthYear = date.toLocaleDateString('th-TH', { year: 'numeric', month: 'long' });

    if (!groups[monthYear]) {
      groups[monthYear] = [];
    }
    groups[monthYear].push(campaign);
    return groups;
  }, {} as Record<string, Campaign[]>);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`📜 ประวัติแคมเปญ - ${client.name}`}>
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">กำลังโหลด...</div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            ยังไม่มีประวัติแคมเปญ
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedHistory).map(([monthYear, campaigns]) => (
              <div key={monthYear}>
                <h4 className="text-sm font-medium text-gray-700 mb-3 border-b pb-2">
                  {monthYear}
                </h4>
                <div className="space-y-3">
                  {campaigns.map((campaign) => {
                    const remaining = campaign.budget - campaign.spent;
                    const isOverBudget = remaining < 0;

                    return (
                      <div
                        key={campaign.id}
                        className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-base">📢</span>
                            <span className="font-medium text-gray-900">{campaign.name}</span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatPlatform(campaign.platform, campaign.googleAdsType)}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <span className="text-gray-500">งบ:</span>
                            <span className="ml-1 font-medium">{formatCurrency(campaign.budget)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">ใช้ไป:</span>
                            <span className={`ml-1 font-medium ${isOverBudget ? 'text-red-600' : ''}`}>
                              {formatCurrency(campaign.spent)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">{isOverBudget ? 'เกิน:' : 'เหลือ:'}</span>
                            <span className={`ml-1 font-medium ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                              {isOverBudget ? `-${formatCurrency(Math.abs(remaining))}` : formatCurrency(remaining)}
                            </span>
                          </div>
                        </div>

                        <div className="mt-2 text-xs text-gray-500">
                          หมดอายุ: {formatDate(campaign.endDate)}
                          {campaign.archivedAt && (
                            <span className="ml-2">| เก็บเมื่อ: {formatDate(campaign.archivedAt)}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
