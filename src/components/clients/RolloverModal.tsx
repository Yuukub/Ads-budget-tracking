import { useState } from 'react';
import { Client, RolloverCampaignEntry, RolloverFormData } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

function nextMonth(): string {
  const now = new Date();
  return `${now.getFullYear() + (now.getMonth() === 11 ? 1 : 0)}-${String((now.getMonth() + 1) % 12 + 1).padStart(2, '0')}`;
}

function shiftedEndDate(endDate: string, month: string): string {
  const previous = new Date(endDate);
  const [year, monthNumber] = month.split('-').map(Number);
  const days = new Date(year, monthNumber, 0).getDate();
  const previousMonthDays = new Date(previous.getFullYear(), previous.getMonth() + 1, 0).getDate();
  const day = previous.getDate() === previousMonthDays ? days : Math.min(previous.getDate(), days);
  return `${month}-${String(day).padStart(2, '0')}`;
}

function monthEndDate(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const days = new Date(year, monthNumber, 0).getDate();
  return `${month}-${String(days).padStart(2, '0')}`;
}

interface RolloverModalProps {
  client: Client;
  onSubmit: (data: RolloverFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function RolloverModal({ client, onSubmit, onCancel, isLoading }: RolloverModalProps) {
  const [month, setMonth] = useState(nextMonth());
  const [baseBudget, setBaseBudget] = useState(String(client.totalBudget));
  const [entries, setEntries] = useState<RolloverCampaignEntry[]>(() => client.campaigns.map(campaign => ({
    campaignId: campaign.id, continue: true, budget: campaign.budget, startsOn: campaign.startsOn.slice(0, 10), endDate: shiftedEndDate(campaign.endDate, nextMonth()),
  })));
  const [error, setError] = useState('');
  const carryEstimate = client.effectiveBudget - client.totalSpent;
  const allocation = entries.filter(entry => entry.continue).reduce((sum, entry) => sum + (Number(entry.budget) || 0), 0);
  const usable = (Number(baseBudget) || 0) + carryEstimate;

  const updateEntry = (campaignId: number, update: Partial<RolloverCampaignEntry>) => {
    setEntries(previous => previous.map(entry => entry.campaignId === campaignId ? { ...entry, ...update } : entry));
  };

  const updateMonth = (nextValue: string) => {
    setMonth(nextValue);
    if (!/^\d{4}-\d{2}$/.test(nextValue)) return;
    setEntries(previous => previous.map(entry => {
      const campaign = client.campaigns.find(item => item.id === entry.campaignId)!;
      return { ...entry, endDate: shiftedEndDate(campaign.endDate, nextValue) };
    }));
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^\d{4}-\d{2}$/.test(month) || Number(baseBudget) <= 0 || !entries.some(entry => entry.continue)) {
      setError('กรุณาระบุเดือน งบฐาน และเลือกอย่างน้อยหนึ่งแคมเปญ');
      return;
    }
    if (allocation > usable) {
      setError('งบแคมเปญรวมเกินงบที่ใช้ได้หลังยอดยกมา');
      return;
    }
    const invalidDates = entries.some(entry => entry.continue && (
      !entry.startsOn || !entry.endDate
      || entry.startsOn > monthEndDate(month) || entry.startsOn > entry.endDate
    ));
    if (invalidDates) {
      setError('วันเริ่มต้องไม่เกินวันสิ้นสุดของแคมเปญหรือรอบใหม่');
      return;
    }
    onSubmit({ month, baseBudget: Number(baseBudget), campaigns: entries });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-muted-foreground">ตรวจยอดใช้และแก้ไขงบก่อนยืนยัน ระบบจะปิดรอบเดิมและเปิดรอบใหม่พร้อมกัน</p>
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <Input label="เดือนรอบใหม่" type="month" value={month} onChange={e => updateMonth(e.target.value)} required />
        <Input label="งบฐานใหม่ (฿)" type="number" min="0.01" step="0.01" value={baseBudget} onChange={e => setBaseBudget(e.target.value)} required />
      </div>
      <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
        ยอดยกมาประมาณ {formatCurrency(carryEstimate)} · ใช้ได้ {formatCurrency(usable)} · จัดสรร {formatCurrency(allocation)}
      </div>
      <div className="max-h-72 space-y-3 overflow-y-auto">
        {client.campaigns.map(campaign => {
          const entry = entries.find(item => item.campaignId === campaign.id)!;
          return (
            <div key={campaign.id} className="rounded-lg border border-border p-3">
              <label className="flex items-center gap-2 font-medium"><input type="checkbox" checked={entry.continue} onChange={e => updateEntry(campaign.id, { continue: e.target.checked })} /> ทำต่อ: {campaign.name}</label>
              {entry.continue && <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Input label="งบรอบใหม่" type="number" min="0.01" step="0.01" value={entry.budget} onChange={e => updateEntry(campaign.id, { budget: Number(e.target.value) })} />
                <Input label="วันเริ่มยิงแอดจริง" type="date" max={monthEndDate(month)} value={entry.startsOn || ''} onChange={e => updateEntry(campaign.id, { startsOn: e.target.value })} />
                <Input label="วันสิ้นสุด" type="date" min={entry.startsOn || `${month}-01`} value={entry.endDate || ''} onChange={e => updateEntry(campaign.id, { endDate: e.target.value })} />
              </div>}
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 pt-2"><Button type="button" variant="secondary" onClick={onCancel} className="flex-1">ยกเลิก</Button><Button type="submit" disabled={isLoading} className="flex-1">{isLoading ? 'กำลังเปิดรอบ...' : 'ยืนยันเปิดรอบใหม่'}</Button></div>
    </form>
  );
}
