import { useState, useEffect } from 'react';
import { Client } from '../../types';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../utils/helpers';

interface ResetBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  onSubmit: (clientId: number, newBudget: number) => void;
  isLoading?: boolean;
}

export function ResetBudgetModal({ isOpen, onClose, client, onSubmit, isLoading }: ResetBudgetModalProps) {
  const [newBudget, setNewBudget] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNewBudget('');
      setError('');
    }
  }, [isOpen]);

  if (!client) return null;

  const hasCarryOver = client.carryOver !== 0;
  const budgetAmount = parseFloat(newBudget) || 0;
  const effectiveAfterReset = budgetAmount + client.carryOver;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (budgetAmount <= 0) {
      setError('กรุณากรอกงบใหม่ที่มากกว่า 0');
      return;
    }

    if (effectiveAfterReset <= 0) {
      setError('งบที่ใช้ได้หลังหักยอดยกมาต้องมากกว่า 0');
      return;
    }

    onSubmit(client.id, budgetAmount);
  };

  // Count non-archived campaigns that are expired
  const activeCampaigns = client.campaigns.filter(c => !c.isArchived).length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`🔄 เติมงบใหม่ - ${client.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Current Status */}
        <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-1">
          <div className="text-gray-600 font-medium">📊 สถานะปัจจุบัน:</div>
          <div className="text-gray-500">├─ งบเดิม: {formatCurrency(client.totalBudget)}</div>
          {hasCarryOver && (
            <div className={client.carryOver < 0 ? 'text-red-500' : 'text-blue-500'}>
              ├─ ยอดยกมา: {client.carryOver < 0 ? `-${formatCurrency(Math.abs(client.carryOver))} (ใช้เกิน)` : formatCurrency(client.carryOver)}
            </div>
          )}
          <div className="text-gray-500">└─ แคมเปญปัจจุบัน: {activeCampaigns} แคมเปญ</div>
        </div>

        {activeCampaigns > 0 && (
          <div className="bg-amber-50 text-amber-700 p-3 rounded-lg text-sm">
            ⚠️ มีแคมเปญที่ยังไม่ได้เก็บประวัติ {activeCampaigns} รายการ
            <br />
            ควรเก็บประวัติแคมเปญที่หมดอายุก่อนเติมงบใหม่
          </div>
        )}

        <Input
          label="งบใหม่ (฿)"
          type="number"
          value={newBudget}
          onChange={(e) => setNewBudget(e.target.value)}
          placeholder="100000"
          min={0}
        />

        {budgetAmount > 0 && (
          <div className="bg-blue-50 p-3 rounded-lg text-sm">
            <div className="text-blue-700">
              💵 งบที่ใช้ได้หลังหักยอดยกมา:
              <span className={`ml-1 font-semibold ${effectiveAfterReset <= 0 ? 'text-red-600' : ''}`}>
                {formatCurrency(effectiveAfterReset)}
              </span>
            </div>
            {hasCarryOver && (
              <div className="text-blue-600 text-xs mt-1">
                ({formatCurrency(budgetAmount)} {client.carryOver < 0 ? '-' : '+'} {formatCurrency(Math.abs(client.carryOver))})
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            ยกเลิก
          </Button>
          <Button type="submit" className="flex-1" disabled={isLoading}>
            {isLoading ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
