import { useState } from 'react';
import { Campaign } from '../../types';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../utils/helpers';

interface UpdateSpentFormProps {
  campaign: Campaign;
  onSubmit: (spent: number) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function UpdateSpentForm({ campaign, onSubmit, onCancel, isLoading }: UpdateSpentFormProps) {
  const [spent, setSpent] = useState(campaign.spent.toString());
  const [error, setError] = useState('');

  const spentNum = parseFloat(spent) || 0;
  const remaining = campaign.budget - spentNum;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (spentNum < 0) {
      setError('งบที่ใช้ไปต้องไม่ติดลบ');
      return;
    }

    // อนุญาตให้ใช้งบเกินได้ (จะแสดงเป็นติดลบ)
    onSubmit(spentNum);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-1">
        <div className="font-medium text-gray-800">แคมเปญ: {campaign.name}</div>
        <div className="text-gray-600">งบทั้งหมด: {formatCurrency(campaign.budget)}</div>
      </div>

      <Input
        label="งบที่ใช้ไปแล้ว (฿)"
        type="number"
        value={spent}
        onChange={(e) => setSpent(e.target.value)}
        placeholder="0"
        min={0}
      />

      <div className={`text-sm ${remaining < 0 ? 'text-red-600' : 'text-gray-600'}`}>
        {remaining < 0 ? 'เกิน:' : 'คงเหลือ:'} {remaining < 0 ? `-${formatCurrency(Math.abs(remaining))}` : formatCurrency(remaining)}
      </div>

      {remaining < 0 && (
        <div className="bg-amber-50 text-amber-700 p-3 rounded-lg text-sm">
          ⚠️ งบที่ใช้เกินจะถูกหักจากงบลูกค้าเมื่อเก็บประวัติ
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
