import { Client } from '../../types';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../utils/helpers';

interface NoBudgetWarningProps {
  client: Client;
  onAddBudget: () => void;
  onCancel: () => void;
}

export function NoBudgetWarning({ client, onAddBudget, onCancel }: NoBudgetWarningProps) {
  return (
    <div className="space-y-4">
      <div className="text-center py-4">
        <span className="text-4xl">⚠️</span>
      </div>

      <p className="text-gray-700 text-center">
        งบของลูกค้า <strong>{client.name}</strong> จัดสรรหมดแล้ว
      </p>

      <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-600">งบรวม:</span>
          <span className="font-medium">{formatCurrency(client.totalBudget)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">จัดสรรแล้ว:</span>
          <span className="font-medium">{formatCurrency(client.allocated)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">คงเหลือ:</span>
          <span className="font-medium text-red-600">{formatCurrency(client.unallocated)}</span>
        </div>
      </div>

      <p className="text-sm text-gray-600 text-center">
        ต้องการเพิ่มงบรวมของลูกค้าก่อน<br />
        จึงจะสามารถเพิ่มแคมเปญใหม่ได้
      </p>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          ปิด
        </Button>
        <Button type="button" onClick={onAddBudget} className="flex-1">
          เพิ่มงบลูกค้า
        </Button>
      </div>
    </div>
  );
}
