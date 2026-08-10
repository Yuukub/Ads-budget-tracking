import { useState } from 'react';
import { PauseFormData } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

function todayDate(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

interface PauseModalProps {
  targetName: string;
  onSubmit: (data: PauseFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function PauseModal({ targetName, onSubmit, onCancel, isLoading }: PauseModalProps) {
  const today = todayDate();
  const [startsOn, setStartsOn] = useState(today);
  const [endsOn, setEndsOn] = useState(today);
  const [reason, setReason] = useState('ร้านปิด');
  const [error, setError] = useState('');

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!startsOn || !endsOn || endsOn < startsOn) {
      setError('วันสิ้นสุดต้องไม่ก่อนวันเริ่ม');
      return;
    }
    onSubmit({ startsOn, endsOn, reason: reason.trim() || 'ร้านปิด' });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        บันทึกการพักแอดของ <span className="font-medium text-foreground">{targetName}</span> ระบบจะไม่สั่งหยุดบน Ads Manager และจะไม่นับวันพักในงบแนะนำ/วัน
      </p>
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <Input label="เริ่มพัก" type="date" value={startsOn} onChange={e => setStartsOn(e.target.value)} required />
        <Input label="เปิดกลับ" type="date" value={endsOn} min={startsOn} onChange={e => setEndsOn(e.target.value)} required />
      </div>
      <Input label="เหตุผล (ไม่บังคับ)" value={reason} onChange={e => setReason(e.target.value)} placeholder="ร้านปิด" />
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">ยกเลิก</Button>
        <Button type="submit" variant="soft-warning" disabled={isLoading} className="flex-1">
          {isLoading ? 'กำลังบันทึก...' : startsOn === today && endsOn === today ? 'พักวันนี้' : 'กำหนดช่วงพัก'}
        </Button>
      </div>
    </form>
  );
}
