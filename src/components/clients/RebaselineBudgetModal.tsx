import { useState } from 'react';
import { Client, RebaselineFormData } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface RebaselineBudgetModalProps {
  client: Client;
  onSubmit: (data: RebaselineFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function RebaselineBudgetModal({ client, onSubmit, onCancel, isLoading }: RebaselineBudgetModalProps) {
  const [newBudget, setNewBudget] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const parsedBudget = Number(newBudget);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!Number.isFinite(parsedBudget) || parsedBudget <= 0) {
      setError('กรุณากรอกงบตั้งต้นใหม่ที่มากกว่า 0');
      return;
    }
    if (confirmation !== 'RESET') {
      setError('กรุณาพิมพ์ RESET ให้ตรงกันเพื่อยืนยัน');
      return;
    }
    onSubmit({ newBudget: parsedBudget, confirmation: 'RESET' });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
        <p className="font-semibold">การตั้งยอดใหม่จะไม่ยกตัวเลขเดิมมาใช้</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>แคมเปญปัจจุบัน {client.campaigns.length} รายการจะถูกปิดและเก็บไว้ในประวัติ</li>
          <li>ยอดยกมา ยอดจัดสรร และยอดใช้ปัจจุบันจะเริ่มใหม่</li>
          <li>ข้อมูลประวัติเดิมจะไม่ถูกลบ</li>
        </ul>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted p-3 text-sm">
        <div><span className="text-muted-foreground">งบที่ใช้ได้เดิม</span><p className="font-semibold">{formatCurrency(client.effectiveBudget)}</p></div>
        <div><span className="text-muted-foreground">ใช้ไปแล้ว</span><p className="font-semibold">{formatCurrency(client.totalSpent)}</p></div>
        <div><span className="text-muted-foreground">จัดสรรแล้ว</span><p className="font-semibold">{formatCurrency(client.allocated)}</p></div>
        <div><span className="text-muted-foreground">ยอดยกมาเดิม</span><p className="font-semibold">{formatCurrency(client.carryOver)}</p></div>
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-300">{error}</p>}

      <Input
        label="งบตั้งต้นใหม่ (฿)"
        type="number"
        min="0.01"
        step="0.01"
        value={newBudget}
        onChange={event => setNewBudget(event.target.value)}
        placeholder="เช่น 100000"
        required
      />
      <Input
        label="พิมพ์ RESET เพื่อยืนยัน"
        value={confirmation}
        onChange={event => setConfirmation(event.target.value)}
        autoComplete="off"
        required
      />

      {parsedBudget > 0 && (
        <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-950/30 dark:text-blue-200">
          หลังตั้งยอดใหม่: งบที่ใช้ได้ {formatCurrency(parsedBudget)} · จัดสรร 0 · ใช้ไป 0
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">ยกเลิก</Button>
        <Button type="submit" variant="destructive" disabled={isLoading || confirmation !== 'RESET' || !(parsedBudget > 0)} className="flex-1">
          {isLoading ? 'กำลังตั้งยอดใหม่...' : 'ยืนยันตั้งยอดใหม่'}
        </Button>
      </div>
    </form>
  );
}
